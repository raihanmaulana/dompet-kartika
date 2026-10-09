import { after } from 'next/server.js'
// Sinkron SATU ARAH: aplikasi → Google Sheet (lewat Google Apps Script web app).
// Aplikasi tetap sumber data utama. Kegagalan sinkron tidak pernah menggagalkan aksi pengguna.
import type { SupabaseClient } from '@supabase/supabase-js'
import { billRowsFor, rp, summarize, ymLabel } from './calc.ts'
import { queryPockets } from './pockets.ts'
import { ymOfDate } from './calc.ts'
import type { Bill, BillMonth, BudgetItem, Expense, IncomeItem } from './types.ts'

export type Cell = string | number | boolean | null
export type SheetEvent =
  | { op: 'upsert'; tab: string; id: string; cells: Cell[] }
  | { op: 'delete'; tab: string; id: string }
  | { op: 'deleteWhere'; tab: string; col: string; value: string }
  | { op: 'reset'; tab: string }
  | { op: 'log'; cells: Cell[] }

export const sheetsEnabled = () => !!process.env.SHEETS_WEBHOOK_URL && !!process.env.SHEETS_WEBHOOK_SECRET

export type Table = 'income_items' | 'budget_items' | 'expenses' | 'bills' | 'bill_months' | 'goals' | 'goal_deposits' | 'pockets' | 'pocket_transfers'
const TAB: Record<Table, string> = {
  income_items: 'Pemasukan', budget_items: 'Anggaran', expenses: 'Catatan', bills: 'Tagihan',
  bill_months: 'Status Tagihan', goals: 'Target Tabungan', goal_deposits: 'Setoran Tabungan',
  pockets: 'Sumber Dana', pocket_transfers: 'Pindah Dana',
}
const POCKET_KIND: Record<string, string> = { bank: 'Bank', ewallet: 'E-wallet', tunai: 'Tunai', lainnya: 'Lainnya' }
const GRP_LABEL: Record<string, string> = { kebutuhan: 'Kebutuhan pokok', gaya_hidup: 'Gaya hidup', tabungan: 'Tabungan', investasi: 'Investasi' }
const KIND_LABEL: Record<string, string> = { tagihan: 'Tagihan rutin', cicilan: 'Cicilan', hutang: 'Hutang' }
export const SUMMARY_TAB = 'Ringkasan Bulanan'

const wib = (d: Date | string) => new Date(d).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'medium' })

/** Kirim ke Apps Script. Mengembalikan hasil (dipakai tombol "Sinkronkan semua"). */
export async function postEvents(events: SheetEvent[]): Promise<{ ok: boolean; n?: number; error?: string }> {
  if (!sheetsEnabled()) return { ok: false, error: 'Sinkron Google Sheet belum diatur.' }
  try {
    const res = await fetch(process.env.SHEETS_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: process.env.SHEETS_WEBHOOK_SECRET, events }),
      redirect: 'follow',
      signal: AbortSignal.timeout(25_000),
    })
    const txt = await res.text()
    let j: { ok?: boolean; n?: number; error?: string } = {}
    try { j = JSON.parse(txt) } catch { return { ok: false, error: 'Balasan Google Sheet tidak dikenali. Cek pengaturan deploy skrip.' } }
    return j.ok ? { ok: true, n: j.n } : { ok: false, error: j.error ?? 'Ditolak oleh skrip' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menghubungi Google Sheet' }
  }
}

/** Jadwalkan pengiriman setelah respons ke pengguna selesai. */
export function queue(events: SheetEvent[]) {
  if (!sheetsEnabled() || !events.length) return
  after(async () => {
    const r = await postEvents(events)
    if (!r.ok) console.error('[sheets] gagal sinkron:', r.error)
  })
}

export function logEvent(actor: string, aksi: string, tabel: string, ringkasan: string): SheetEvent {
  return { op: 'log', cells: [wib(new Date()), actor, aksi, tabel, ringkasan] }
}

type Row = Record<string, any>

async function pocketName(sb: SupabaseClient, id: string | null | undefined) {
  if (!id) return ''
  return ((await sb.from('pockets').select('name').eq('id', id).maybeSingle()).data?.name as string | undefined) ?? ''
}
const today = () => { const t = ymOfDate(new Date()); return { ym: t.ym, iso: t.iso } }

/** Baris Sheet untuk semua sumber dana (saldo ikut berubah setiap ada catatan baru, jadi dikirim ulang). */
export async function pocketEvents(sb: SupabaseClient, owner: string): Promise<SheetEvent[]> {
  const { pockets } = await queryPockets(sb, owner, today())
  return pockets.map((p) => ({ op: 'upsert', tab: TAB.pockets, id: p.id, cells: [p.id, p.name, POCKET_KIND[p.kind] ?? p.kind, p.opening_balance, p.saldo] }) as SheetEvent)
}

/** Susun satu baris sheet dari baris database (null kalau tidak ada → dianggap terhapus). */
export async function rowEvent(sb: SupabaseClient, table: Table, id: string, key?: string): Promise<SheetEvent> {
  const tab = TAB[table]
  if (table === 'bill_months') {
    const [billId, ym] = (key ?? id).split('|')
    const [{ data: bm }, { data: bill }] = await Promise.all([
      sb.from('bill_months').select('*').eq('bill_id', billId).eq('ym', ym).maybeSingle(),
      sb.from('bills').select('name,amount').eq('id', billId).maybeSingle(),
    ])
    if (!bm || !bill) return { op: 'delete', tab, id: `${billId}|${ym}` }
    return { op: 'upsert', tab, id: `${billId}|${ym}`, cells: [
      `${billId}|${ym}`, ym, bill.name, Number(bm.amount_override ?? bill.amount),
      bm.skipped ? 'Ya' : 'Tidak', bm.paid ? 'Lunas' : 'Belum', bm.paid_at ? wib(bm.paid_at) : '', billId,
    ] }
  }
  const { data: r } = (await sb.from(table).select('*').eq('id', id).maybeSingle()) as { data: Row | null }
  if (!r) return { op: 'delete', tab, id }
  switch (table) {
    case 'income_items': return { op: 'upsert', tab, id, cells: [id, r.ym, r.label, r.kind === 'masuk' ? 'Uang masuk' : 'Potongan', Number(r.amount), await pocketName(sb, r.pocket_id)] }
    case 'budget_items': return { op: 'upsert', tab, id, cells: [id, r.ym, GRP_LABEL[r.grp] ?? r.grp, r.label, Number(r.amount)] }
    case 'expenses': {
      let kat = ''
      if (r.budget_item_id) kat = (await sb.from('budget_items').select('label').eq('id', r.budget_item_id).maybeSingle()).data?.label ?? ''
      return { op: 'upsert', tab, id, cells: [id, r.ym, r.spent_on, kat, r.note, Number(r.amount), await pocketName(sb, r.pocket_id)] }
    }
    case 'bills': return { op: 'upsert', tab, id, cells: [id, r.name, KIND_LABEL[r.kind] ?? r.kind, Number(r.amount), r.due_day, r.start_ym, r.end_ym ?? 'terus', r.note] }
    case 'goals': return { op: 'upsert', tab, id, cells: [id, r.name, Number(r.target), r.is_emergency ? 'Ya' : 'Tidak'] }
    case 'goal_deposits': {
      const g = (await sb.from('goals').select('name').eq('id', r.goal_id).maybeSingle()).data
      return { op: 'upsert', tab, id, cells: [id, r.ym, g?.name ?? '', Number(r.amount), r.note, r.goal_id, await pocketName(sb, r.pocket_id)] }
    }
    case 'pockets': {
      const { pockets } = await queryPockets(sb, r.owner_id, today())
      const p = pockets.find((x) => x.id === id)
      return { op: 'upsert', tab, id, cells: [id, r.name, POCKET_KIND[r.kind] ?? r.kind, Number(r.opening_balance), p?.saldo ?? 0] }
    }
    case 'pocket_transfers': {
      const [a, b] = await Promise.all([pocketName(sb, r.from_pocket), pocketName(sb, r.to_pocket)])
      return { op: 'upsert', tab, id, cells: [id, r.moved_on, a, b, Number(r.amount), r.note] }
    }
  }
}

/** Ringkasan satu bulan (angka sama persis dengan yang tampil di aplikasi). */
export async function summaryEvent(sb: SupabaseClient, owner: string, ym: string): Promise<SheetEvent | null> {
  const [inc, bud, exp, bills, bms] = await Promise.all([
    sb.from('income_items').select('*').eq('owner_id', owner).eq('ym', ym),
    sb.from('budget_items').select('*').eq('owner_id', owner).eq('ym', ym),
    sb.from('expenses').select('*').eq('owner_id', owner).eq('ym', ym),
    sb.from('bills').select('*').eq('owner_id', owner),
    sb.from('bill_months').select('*').eq('owner_id', owner).eq('ym', ym),
  ])
  const n = (x: any) => Number(x ?? 0)
  const income = (inc.data ?? []).map((r) => ({ ...r, amount: n(r.amount) })) as IncomeItem[]
  const budget = (bud.data ?? []).map((r) => ({ ...r, amount: n(r.amount) })) as BudgetItem[]
  if (!income.length && !budget.length && !(exp.data ?? []).length) return { op: 'delete', tab: SUMMARY_TAB, id: ym }
  const rows = billRowsFor(
    (bills.data ?? []).map((r) => ({ ...r, amount: n(r.amount) })) as Bill[],
    (bms.data ?? []).map((r) => ({ ...r, amount_override: r.amount_override == null ? null : n(r.amount_override) })) as BillMonth[],
    ym,
  )
  const s = summarize(income, budget, (exp.data ?? []).map((r) => ({ ...r, amount: n(r.amount) })) as Expense[], rows, null, ym)
  return { op: 'upsert', tab: SUMMARY_TAB, id: ym, cells: [
    ym, ymLabel(ym), s.masuk, s.potong, s.bersih, s.tagihanBiasa, s.cicilanHutang, s.grp.kebutuhan, s.grp.gaya_hidup,
    s.grp.tabungan, s.grp.investasi, s.uangBelanja, s.spent, s.sisaJatah,
  ] }
}

export const fmtRp = rp

/** Isi ulang seluruh sheet dari database (pertama kali tersambung, atau untuk pemulihan). */
export async function fullSyncEvents(sb: SupabaseClient, owner: string): Promise<SheetEvent[]> {
  const tables: Table[] = ['pockets', 'pocket_transfers', 'income_items', 'budget_items', 'expenses', 'bills', 'bill_months', 'goals', 'goal_deposits']
  const ev: SheetEvent[] = [...Object.values(TAB), SUMMARY_TAB].map((tab) => ({ op: 'reset', tab }) as SheetEvent)
  const months = new Set<string>()
  for (const t of tables) {
    if (t === 'bill_months') {
      const { data } = await sb.from('bill_months').select('bill_id,ym').eq('owner_id', owner)
      for (const r of data ?? []) ev.push(await rowEvent(sb, t, '', `${r.bill_id}|${r.ym}`))
      continue
    }
    const { data } = await sb.from(t).select(t === 'bills' || t === 'goals' || t === 'pockets' || t === 'pocket_transfers' ? 'id' : 'id,ym').eq('owner_id', owner)
    for (const r of (data ?? []) as unknown as Row[]) {
      if (r.ym) months.add(r.ym)
      ev.push(await rowEvent(sb, t, r.id))
    }
  }
  for (const ym of [...months].sort()) {
    const s = await summaryEvent(sb, owner, ym)
    if (s) ev.push(s)
  }
  return ev
}
