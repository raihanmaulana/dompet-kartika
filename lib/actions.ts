'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isYm, planItems, ymAdd, ymLabel, ymOfDate } from './calc.ts'
import { DEMO } from './data.ts'
import { queryPockets } from './pockets.ts'
import { supabaseServer } from './supabase/server.ts'
import { fmtRp, fullSyncEvents, logEvent, pocketEvents, postEvents, queue, rowEvent, sheetsEnabled, summaryEvent, type SheetEvent, type Table } from './sheets.ts'

const GRP = ['kebutuhan', 'gaya_hidup', 'tabungan', 'investasi'] as const
const KINDS = ['tagihan', 'cicilan', 'hutang', 'kartu'] as const
const POCKET_KINDS = ['bank', 'ewallet', 'tunai', 'lainnya'] as const

const money = (v: FormDataEntryValue | string | number | null | undefined) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? Math.min(n, 100_000_000_000) : 0
}
const text = (v: FormDataEntryValue | null | undefined, max = 80) => String(v ?? '').trim().slice(0, max)
const done = () => revalidatePath('/', 'layout')

async function me() {
  if (DEMO) return null
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Belum masuk')
  return { sb, uid: user.id, email: user.email ?? '' }
}
type C = NonNullable<Awaited<ReturnType<typeof me>>>

const KIND_NAME: Record<string, string> = { tagihan: 'tagihan rutin', cicilan: 'cicilan', hutang: 'hutang', kartu: 'kartu kredit' }

/** Salin perubahan ke Google Sheet (bila diatur): baris data, ringkasan bulan, dan log perubahan. */
async function mirror(c: C, items: { table: Table; id: string; key?: string }[], aksi: string, tabel: string, ringkasan: string, months: string[] = [], extra: SheetEvent[] = []) {
  if (!sheetsEnabled()) return
  try {
    const ev: SheetEvent[] = []
    for (const it of items) ev.push(await rowEvent(c.sb, it.table, it.id, it.key))
    ev.push(...extra)
    ev.push(...(await pocketEvents(c.sb, c.uid)))
    for (const ym of new Set(months.filter(isYm))) {
      const sm = await summaryEvent(c.sb, c.uid, ym)
      if (sm) ev.push(sm)
    }
    ev.push(logEvent(c.email, aksi, tabel, ringkasan))
    queue(ev)
  } catch (e) {
    console.error('[sheets] gagal menyiapkan sinkron', e)
  }
}
async function prev(c: C, table: Table, id: string): Promise<Record<string, any> | null> {
  const { data } = await c.sb.from(table).select('*').eq('id', id).eq('owner_id', c.uid).maybeSingle()
  return data as Record<string, any> | null
}
/** Sumber dana yang dipilih di formulir; hanya diterima kalau memang milik pengguna ini. */
/** Setelah menyimpan: kalau saldo sumber dana jadi minus, kembalikan peringatan (data tetap tersimpan). */
async function lowBalance(c: C, pocketId: string | null | undefined): Promise<string | void> {
  if (!pocketId) return
  try {
    const { pockets } = await queryPockets(c.sb, c.uid, ymOfDate(new Date()))
    const p = pockets.find((x) => x.id === pocketId)
    if (p && p.saldo < 0) return `⚠ Tersimpan, tapi saldo ${p.name} sekarang minus ${fmtRp(-p.saldo)}. Cek apakah ada pemasukan atau pindah dana yang belum dicatat.`
  } catch { /* peringatan hanya bonus */ }
}
async function pocketOf(c: C, raw: FormDataEntryValue | null): Promise<string | null> {
  const id = text(raw, 40)
  if (!id) return null
  const { data } = await c.sb.from('pockets').select('id').eq('id', id).eq('owner_id', c.uid).maybeSingle()
  return data ? (data.id as string) : null
}
async function curYm() {
  const v = (await cookies()).get('ym')?.value
  return v && isYm(v) ? v : ymOfDate(new Date()).ym
}

const cookieOpts = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const, httpOnly: true }

export async function setMonth(ym: string) {
  if (!isYm(ym)) return
  ;(await cookies()).set('ym', ym, cookieOpts)
  done()
}
export async function setViewAs(id: string) {
  ;(await cookies()).set('view_as', id, cookieOpts)
  done()
}

// ---------- Bulan baru ----------
// Rencana awal sengaja minimal: hanya gaji. Potongan, uang tambahan, dan kategori anggaran diisi sendiri.
const DEFAULT_INCOME = [{ label: 'Gaji', kind: 'masuk', amount: 6_500_000 }]
const DEFAULT_BUDGET: { grp: string; label: string; amount: number }[] = []

export async function seedMonth(formData: FormData) {
  const ym = text(formData.get('ym'), 7)
  const mode = text(formData.get('mode'), 8)
  if (!isYm(ym)) return
  const c = await me()
  if (!c) return done()
  const { sb, uid } = c
  const { count } = await sb.from('income_items').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('ym', ym)
  if (count) return done() // jangan menimpa bulan yang sudah berisi

  if (mode === 'prev') {
    const prev = ymAdd(ym, -1)
    const [inc, bud] = await Promise.all([
      sb.from('income_items').select('label,kind,amount,sort,pocket_id').eq('owner_id', uid).eq('ym', prev),
      sb.from('budget_items').select('grp,label,amount,sort').eq('owner_id', uid).eq('ym', prev),
    ])
    if (inc.data?.length) await sb.from('income_items').insert(inc.data.map((r) => ({ ...r, owner_id: uid, ym })))
    if (bud.data?.length) await sb.from('budget_items').insert(bud.data.map((r) => ({ ...r, owner_id: uid, ym })))
  } else {
    await sb.from('income_items').insert(DEFAULT_INCOME.map((r, i) => ({ ...r, owner_id: uid, ym, sort: i })))
    if (DEFAULT_BUDGET.length) await sb.from('budget_items').insert(DEFAULT_BUDGET.map((r, i) => ({ ...r, owner_id: uid, ym, sort: i })))
  }
  if (sheetsEnabled()) {
    const [i, b] = await Promise.all([
      sb.from('income_items').select('id').eq('owner_id', uid).eq('ym', ym),
      sb.from('budget_items').select('id').eq('owner_id', uid).eq('ym', ym),
    ])
    await mirror(c, [
      ...(i.data ?? []).map((r) => ({ table: 'income_items' as Table, id: r.id as string })),
      ...(b.data ?? []).map((r) => ({ table: 'budget_items' as Table, id: r.id as string })),
    ], 'Mulai bulan baru', 'Anggaran', `${ymLabel(ym)} dimulai dari ${mode === 'prev' ? ymLabel(ymAdd(ym, -1)) : 'rencana awal'}`, [ym])
  }
  done()
}

// ---------- Pemasukan ----------
export async function addIncome(formData: FormData) {
  const ym = text(formData.get('ym'), 7)
  const label = text(formData.get('label'))
  const kind = formData.get('kind') === 'potong' ? 'potong' : 'masuk'
  if (!isYm(ym) || !label) return
  const c = await me()
  if (!c) return done()
  const amount = money(formData.get('amount'))
  const pocket_id = await pocketOf(c, formData.get('pocket_id'))
  const { data: row } = await c.sb.from('income_items').insert({ owner_id: c.uid, ym, label, kind, amount, sort: 99, pocket_id }).select('id').single()
  if (row) await mirror(c, [{ table: 'income_items', id: row.id }], 'Tambah', 'Pemasukan', `${ymLabel(ym)}: ${label} ${fmtRp(amount)} (${kind === 'masuk' ? 'uang masuk' : 'potongan'})`, [ym])
  done()
}
export async function updateIncome(id: string, field: 'label' | 'amount', value: string) {
  const c = await me()
  if (!c) return done()
  const patch = field === 'label' ? { label: text(value) } : { amount: money(value) }
  if (field === 'label' && !patch.label) return
  const old = await prev(c, 'income_items', id)
  await c.sb.from('income_items').update(patch).eq('id', id).eq('owner_id', c.uid)
  if (old) await mirror(c, [{ table: 'income_items', id }], 'Ubah', 'Pemasukan', field === 'amount'
    ? `${ymLabel(old.ym)}: ${old.label} ${fmtRp(Number(old.amount))} → ${fmtRp(money(value))}` : `${ymLabel(old.ym)}: nama "${old.label}" → "${text(value)}"`, [old.ym])
  done()
}
export async function deleteIncome(id: string) {
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'income_items', id)
  await c.sb.from('income_items').delete().eq('id', id).eq('owner_id', c.uid)
  if (old) await mirror(c, [{ table: 'income_items', id }], 'Hapus', 'Pemasukan', `${ymLabel(old.ym)}: ${old.label} ${fmtRp(Number(old.amount))}`, [old.ym])
  done()
}

// ---------- Anggaran ----------
export async function addBudget(formData: FormData) {
  const ym = text(formData.get('ym'), 7)
  const grp = text(formData.get('grp'), 12)
  const label = text(formData.get('label'))
  if (!isYm(ym) || !label || !(GRP as readonly string[]).includes(grp)) return
  const c = await me()
  if (!c) return done()
  const amount = money(formData.get('amount'))
  const { data: row } = await c.sb.from('budget_items').insert({ owner_id: c.uid, ym, grp, label, amount, sort: 99 }).select('id').single()
  if (row) await mirror(c, [{ table: 'budget_items', id: row.id }], 'Tambah', 'Anggaran', `${ymLabel(ym)}: kategori ${label} ${fmtRp(amount)}`, [ym])
  done()
}
export async function updateBudget(id: string, field: 'label' | 'amount', value: string) {
  const c = await me()
  if (!c) return done()
  const patch = field === 'label' ? { label: text(value) } : { amount: money(value) }
  if (field === 'label' && !patch.label) return
  const old = await prev(c, 'budget_items', id)
  await c.sb.from('budget_items').update(patch).eq('id', id).eq('owner_id', c.uid)
  if (old) {
    const linked = field === 'label' ? ((await c.sb.from('expenses').select('id').eq('budget_item_id', id)).data ?? []).map((r) => ({ table: 'expenses' as Table, id: r.id as string })) : []
    await mirror(c, [{ table: 'budget_items', id }, ...linked], 'Ubah', 'Anggaran', field === 'amount'
      ? `${ymLabel(old.ym)}: ${old.label} ${fmtRp(Number(old.amount))} → ${fmtRp(money(value))}` : `${ymLabel(old.ym)}: kategori "${old.label}" → "${text(value)}"`, [old.ym])
  }
  done()
}
export async function deleteBudget(id: string) {
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'budget_items', id)
  const linked = ((await c.sb.from('expenses').select('id').eq('budget_item_id', id)).data ?? []).map((r) => ({ table: 'expenses' as Table, id: r.id as string }))
  await c.sb.from('budget_items').delete().eq('id', id).eq('owner_id', c.uid)
  if (old) await mirror(c, [{ table: 'budget_items', id }, ...linked], 'Hapus', 'Anggaran', `${ymLabel(old.ym)}: kategori ${old.label} ${fmtRp(Number(old.amount))}`, [old.ym])
  done()
}

// ---------- Catatan pengeluaran ----------
export async function addExpense(formData: FormData): Promise<string | void> {
  const spent_on = text(formData.get('spent_on'), 10)
  const amount = money(formData.get('amount'))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spent_on) || !isYm(spent_on.slice(0, 7)) || amount <= 0) return
  const item = text(formData.get('budget_item_id'), 40)
  const c = await me()
  if (!c) return done()
  const note = text(formData.get('note'), 120)
  const pocket_id = await pocketOf(c, formData.get('pocket_id'))
  const { data: row } = await c.sb.from('expenses').insert({
    owner_id: c.uid, ym: spent_on.slice(0, 7), spent_on,
    budget_item_id: item || null, note, amount, pocket_id,
  }).select('id').single()
  if (row) await mirror(c, [{ table: 'expenses', id: row.id }], 'Tambah', 'Catatan', `${spent_on}: ${note || 'pengeluaran'} ${fmtRp(amount)}`, [spent_on.slice(0, 7)])
  done()
  return lowBalance(c, pocket_id)
}
export async function updateExpense(formData: FormData) {
  const id = text(formData.get('id'), 40)
  const spent_on = text(formData.get('spent_on'), 10)
  const amount = money(formData.get('amount'))
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(spent_on) || !isYm(spent_on.slice(0, 7)) || amount <= 0) return
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'expenses', id)
  if (!old || old.transfer_id) return // catatan biaya admin otomatis diubah lewat Pindah dana
  const item = text(formData.get('budget_item_id'), 40)
  let budget_item_id: string | null = null
  if (item) {
    const { data: b } = await c.sb.from('budget_items').select('id').eq('id', item).eq('owner_id', c.uid).maybeSingle()
    budget_item_id = b ? (b.id as string) : null
  }
  const pocket_id = await pocketOf(c, formData.get('pocket_id'))
  const note = text(formData.get('note'), 120)
  await c.sb.from('expenses').update({ amount, spent_on, ym: spent_on.slice(0, 7), budget_item_id, pocket_id, note }).eq('id', id).eq('owner_id', c.uid)
  await mirror(c, [{ table: 'expenses', id }], 'Ubah', 'Catatan', `${old.spent_on}: ${old.note || 'pengeluaran'} ${fmtRp(Number(old.amount))} → ${spent_on}: ${note || 'pengeluaran'} ${fmtRp(amount)}`, [old.ym, spent_on.slice(0, 7)])
  done()
}
/** Ganti sumber dana sebuah pemasukan atau setoran tabungan (untuk membetulkan salah pilih). */
export async function setRowPocket(table: 'income_items' | 'goal_deposits', id: string, _field: string, value: string) {
  if (table !== 'income_items' && table !== 'goal_deposits') return
  const c = await me()
  if (!c) return done()
  const old = await prev(c, table, id)
  if (!old) return
  const fd = new FormData(); fd.set('p', value)
  const pocket_id = await pocketOf(c, fd.get('p'))
  await c.sb.from(table).update({ pocket_id }).eq('id', id).eq('owner_id', c.uid)
  const nm = pocket_id ? ((await c.sb.from('pockets').select('name').eq('id', pocket_id).maybeSingle()).data?.name as string) ?? '' : 'tanpa sumber dana'
  await mirror(c, [{ table, id }], 'Ubah sumber dana', table === 'income_items' ? 'Pemasukan' : 'Setoran Tabungan', `${old.ym}: ${old.label ?? 'setoran'} → ${nm}`, table === 'income_items' ? [old.ym] : [])
  done()
}
export async function deleteExpense(id: string) {
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'expenses', id)
  await c.sb.from('expenses').delete().eq('id', id).eq('owner_id', c.uid)
  if (old?.recurring_id) {
    // jangan dibuat ulang otomatis untuk bulan ini
    const r = (await c.sb.from('recurring_expenses').select('skipped_ym').eq('id', old.recurring_id).maybeSingle()).data
    if (r) await c.sb.from('recurring_expenses').update({ skipped_ym: [...new Set([...(r.skipped_ym ?? []), old.ym])] }).eq('id', old.recurring_id).eq('owner_id', c.uid)
  }
  if (old) await mirror(c, [{ table: 'expenses', id }], 'Hapus', 'Catatan', `${old.spent_on}: ${old.note || 'pengeluaran'} ${fmtRp(Number(old.amount))}`, [old.ym])
  done()
}

// ---------- Tagihan ----------
export async function addBill(formData: FormData): Promise<string | void> {
  const name = text(formData.get('name'))
  const kind = text(formData.get('kind'), 10)
  const start_ym = text(formData.get('start_ym'), 7)
  const endRaw = text(formData.get('months'), 3)
  const months = Number(endRaw.replace(/\D/g, ''))
  if (!name) return 'Nama wajib diisi.'
  if (!(KINDS as readonly string[]).includes(kind)) return 'Jenis tidak dikenal.'
  if (!isYm(start_ym)) return 'Bulan mulai tidak valid, pilih ulang bulannya.'
  const c = await me()
  if (!c) return done()
  const amount = money(formData.get('amount'))
  const { data: row, error } = await c.sb.from('bills').insert({
    owner_id: c.uid, name, kind, amount,
    due_day: Math.min(31, Math.max(1, Number(formData.get('due_day')) || 1)),
    start_ym, end_ym: months > 0 ? ymAdd(start_ym, months - 1) : null,
    note: text(formData.get('note'), 120),
    min_payment: kind === 'kartu' ? Math.min(money(formData.get('min_payment')), amount) : 0,
  }).select('id').single()
  if (error || !row) { console.error('[tagihan] gagal simpan', error); return `Gagal menyimpan: ${error?.message ?? 'tidak ada data kembali'}` }
  await mirror(c, [{ table: 'bills', id: row.id }], 'Tambah', 'Tagihan', `${name} (${KIND_NAME[kind]}) ${fmtRp(amount)}/bulan mulai ${ymLabel(start_ym)}${months > 0 ? `, ${months} bulan` : ', terus'}`, [await curYm(), start_ym])
  done()
}
async function upsertBM(c: NonNullable<Awaited<ReturnType<typeof me>>>, billId: string, ym: string, patch: Record<string, unknown>) {
  const { data: bill } = await c.sb.from('bills').select('id').eq('id', billId).eq('owner_id', c.uid).maybeSingle()
  if (!bill) return
  const { data: cur } = await c.sb.from('bill_months').select('*').eq('bill_id', billId).eq('ym', ym).maybeSingle()
  await c.sb.from('bill_months').upsert({
    bill_id: billId, owner_id: c.uid, ym,
    amount_override: cur?.amount_override ?? null, skipped: cur?.skipped ?? false, paid: cur?.paid ?? false, paid_at: cur?.paid_at ?? null, paid_amount: cur?.paid_amount ?? 0,
    ...patch,
  })
}
/** Catat pembayaran tagihan/cicilan/kartu kredit (boleh dicicil) dan pilih dibayar dari sumber dana mana. */
export async function payBill(formData: FormData): Promise<string | void> {
  const billId = text(formData.get('bill_id'), 40)
  const ym = text(formData.get('ym'), 7)
  const add = money(formData.get('amount'))
  const paid_on = text(formData.get('paid_on'), 10) || ymOfDate(new Date()).iso
  if (!billId || !isYm(ym)) return
  if (add <= 0) return 'Isi nominal pembayarannya dulu.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paid_on)) return 'Tanggal bayar belum valid.'
  const c = await me()
  if (!c) return done()
  const { data: b } = await c.sb.from('bills').select('name,amount').eq('id', billId).eq('owner_id', c.uid).maybeSingle()
  if (!b) return
  const pocket_id = await pocketOf(c, formData.get('pocket_id'))
  const { error } = await c.sb.from('bill_payments').insert({ owner_id: c.uid, bill_id: billId, ym, amount: add, pocket_id, paid_on })
  if (error) { console.error('[bayar tagihan]', error); return `Gagal menyimpan: ${error.message}. Pastikan supabase/tambah-pembayaran-berulang.sql sudah dijalankan.` }
  const cur = (await c.sb.from('bill_months').select('amount_override,paid_amount,paid').eq('bill_id', billId).eq('ym', ym).maybeSingle()).data
  const total = Number(cur?.amount_override ?? b.amount)
  const was = Math.max(Number(cur?.paid_amount ?? 0), cur?.paid ? total : 0)
  const now = Math.min(was + add, 100_000_000_000)
  const paid = total > 0 && now >= total
  await upsertBM(c, billId, ym, { paid_amount: now, paid, paid_at: paid ? new Date().toISOString() : null })
  const pname = pocket_id ? ((await c.sb.from('pockets').select('name').eq('id', pocket_id).maybeSingle()).data?.name ?? '') : ''
  await mirror(c, [{ table: 'bill_months', id: billId, key: `${billId}|${ym}` }], 'Bayar tagihan', 'Status Tagihan', `${ymLabel(ym)}: ${b.name} +${fmtRp(add)}${pname ? ` dari ${pname}` : ''} (total ${fmtRp(now)} dari ${fmtRp(total)})`, [ym])
  done()
  return lowBalance(c, pocket_id)
}
/** Batalkan status bayar bulan itu: semua pembayarannya dihapus, saldo sumber dana kembali. */
export async function undoBillPaid(billId: string, ym: string) {
  if (!isYm(ym)) return
  const c = await me()
  if (!c) return done()
  const b = (await c.sb.from('bills').select('name').eq('id', billId).eq('owner_id', c.uid).maybeSingle()).data
  if (!b) return
  await c.sb.from('bill_payments').delete().eq('owner_id', c.uid).eq('bill_id', billId).eq('ym', ym)
  await upsertBM(c, billId, ym, { paid: false, paid_at: null, paid_amount: 0 })
  await mirror(c, [{ table: 'bill_months', id: billId, key: `${billId}|${ym}` }], 'Batalkan bayar', 'Status Tagihan', `${ymLabel(ym)}: ${b.name}`, [ym])
  done()
}
/** Hapus satu pembayaran (salah input). */
export async function deleteBillPayment(id: string) {
  const c = await me()
  if (!c) return done()
  const { data: p } = await c.sb.from('bill_payments').select('*').eq('id', id).eq('owner_id', c.uid).maybeSingle()
  if (!p) return
  const { data: bill } = await c.sb.from('bills').select('name,amount').eq('id', p.bill_id).maybeSingle()
  await c.sb.from('bill_payments').delete().eq('id', id).eq('owner_id', c.uid)
  const cur = (await c.sb.from('bill_months').select('amount_override,paid_amount,paid').eq('bill_id', p.bill_id).eq('ym', p.ym).maybeSingle()).data
  const total = Number(cur?.amount_override ?? bill?.amount ?? 0)
  const was = Math.max(Number(cur?.paid_amount ?? 0), cur?.paid ? total : 0)
  const now = Math.max(0, was - Number(p.amount))
  const paid = total > 0 && now >= total
  await upsertBM(c, p.bill_id, p.ym, { paid_amount: now, paid, paid_at: paid ? new Date().toISOString() : null })
  await mirror(c, [{ table: 'bill_months', id: p.bill_id, key: `${p.bill_id}|${p.ym}` }], 'Hapus pembayaran', 'Status Tagihan', `${ymLabel(p.ym)}: ${bill?.name ?? ''} −${fmtRp(Number(p.amount))}`, [p.ym])
  done()
}
export async function setBillSkipped(billId: string, ym: string, skipped: boolean) {
  if (!isYm(ym)) return
  const c = await me()
  if (!c) return done()
  await upsertBM(c, billId, ym, { skipped })
  const b = (await c.sb.from('bills').select('name').eq('id', billId).maybeSingle()).data
  await mirror(c, [{ table: 'bill_months', id: billId, key: `${billId}|${ym}` }], skipped ? 'Lewati bulan' : 'Batal lewati', 'Status Tagihan', `${ymLabel(ym)}: ${b?.name ?? ''}`, [ym])
  done()
}
// Ubah nominal hanya untuk bulan ini
export async function setBillAmountThisMonth(key: string, _field: string, value: string) {
  const [billId, ym] = key.split('|')
  if (!billId || !isYm(ym)) return
  const c = await me()
  if (!c) return done()
  const { data: bill } = await c.sb.from('bills').select('amount').eq('id', billId).eq('owner_id', c.uid).maybeSingle()
  if (!bill) return
  const v = money(value)
  const before = (await c.sb.from('bill_months').select('amount_override').eq('bill_id', billId).eq('ym', ym).maybeSingle()).data
  const was = Number(before?.amount_override ?? bill.amount)
  await upsertBM(c, billId, ym, { amount_override: v === Number(bill.amount) ? null : v })
  const b = (await c.sb.from('bills').select('name').eq('id', billId).maybeSingle()).data
  await mirror(c, [{ table: 'bill_months', id: billId, key: `${billId}|${ym}` }], 'Ubah nominal bulan ini', 'Status Tagihan', `${ymLabel(ym)}: ${b?.name ?? ''} ${fmtRp(was)} → ${fmtRp(v)}`, [ym])
  done()
}
// Ubah nominal dari bulan ini seterusnya (bulan-bulan sebelumnya tidak berubah)
export async function changeBillFrom(fd: FormData) {
  const billId = text(fd.get('bill_id'), 40)
  const ym = text(fd.get('ym'), 7)
  const value = String(fd.get('amount') ?? '')
  if (!billId || !isYm(ym)) return
  const c = await me()
  if (!c) return done()
  const { data: b } = await c.sb.from('bills').select('*').eq('id', billId).eq('owner_id', c.uid).maybeSingle()
  if (!b) return
  const v = money(value)
  if (v === Number(b.amount)) return done()
  const ids = [billId]
  const bmKeys: string[] = []
  if (b.start_ym >= ym) {
    await c.sb.from('bills').update({ amount: v }).eq('id', billId)
    await c.sb.from('bill_months').update({ amount_override: null }).eq('bill_id', billId).gte('ym', ym)
    for (const r of (await c.sb.from('bill_months').select('ym').eq('bill_id', billId).gte('ym', ym)).data ?? []) bmKeys.push(`${billId}|${r.ym}`)
  } else {
    await c.sb.from('bills').update({ end_ym: ymAdd(ym, -1) }).eq('id', billId)
    const { data: nb } = await c.sb.from('bills').insert({
      owner_id: c.uid, name: b.name, kind: b.kind, amount: v, due_day: b.due_day,
      start_ym: ym, end_ym: b.end_ym, note: b.note, min_payment: b.min_payment ?? 0,
    }).select('id').single()
    if (nb) ids.push(nb.id)
  }
  await mirror(c, [...ids.map((id) => ({ table: 'bills' as Table, id })), ...bmKeys.map((k) => ({ table: 'bill_months' as Table, id: billId, key: k }))], 'Ubah nominal seterusnya', 'Tagihan', `${b.name}: ${fmtRp(Number(b.amount))} → ${fmtRp(v)} mulai ${ymLabel(ym)}`, [ym])
  done()
}
// Hentikan dari bulan ini (bulan lalu tetap tercatat); hapus total jika baru mulai bulan ini
export async function stopBill(billId: string, ym: string) {
  if (!isYm(ym)) return
  const c = await me()
  if (!c) return done()
  const { data: b } = await c.sb.from('bills').select('name,start_ym').eq('id', billId).eq('owner_id', c.uid).maybeSingle()
  if (!b) return
  if (b.start_ym >= ym) await c.sb.from('bills').delete().eq('id', billId)
  else await c.sb.from('bills').update({ end_ym: ymAdd(ym, -1) }).eq('id', billId)
  await mirror(c, [{ table: 'bills', id: billId }], b.start_ym >= ym ? 'Hapus' : 'Hentikan', 'Tagihan', `${b.name}: ${b.start_ym >= ym ? 'dihapus' : `berhenti mulai ${ymLabel(ym)}`}`, [ym],
    b.start_ym >= ym ? [{ op: 'deleteWhere', tab: 'Status Tagihan', col: 'Id tagihan', value: billId }] : [])
  done()
}

/** Hapus tagihan seluruhnya (semua bulan, termasuk status bayar/lewati). */
export async function deleteBill(billId: string) {
  const c = await me()
  if (!c) return done()
  const { data: b } = await c.sb.from('bills').select('name,start_ym,end_ym').eq('id', billId).eq('owner_id', c.uid).maybeSingle()
  if (!b) return
  await c.sb.from('bills').delete().eq('id', billId).eq('owner_id', c.uid)
  const now = await curYm()
  const last = b.end_ym ?? ymAdd(now, 24)
  const months: string[] = [now]
  for (let m = b.start_ym, n = 0; m <= last && n < 60; m = ymAdd(m, 1), n++) months.push(m)
  await mirror(c, [{ table: 'bills', id: billId }], 'Hapus', 'Tagihan', `${b.name}: dihapus seluruhnya`, [...new Set(months)],
    [{ op: 'deleteWhere', tab: 'Status Tagihan', col: 'Id tagihan', value: billId }])
  done()
}

// ---------- Tabungan ----------
export async function addGoal(formData: FormData) {
  const name = text(formData.get('name'))
  if (!name) return
  const c = await me()
  if (!c) return done()
  const target = money(formData.get('target'))
  const { data: row } = await c.sb.from('goals').insert({ owner_id: c.uid, name, target, is_emergency: formData.get('is_emergency') === 'on' }).select('id').single()
  if (row) await mirror(c, [{ table: 'goals', id: row.id }], 'Tambah', 'Target Tabungan', `${name}, target ${fmtRp(target)}`)
  done()
}
export async function updateGoalTarget(id: string, _f: string, value: string) {
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'goals', id)
  await c.sb.from('goals').update({ target: money(value) }).eq('id', id).eq('owner_id', c.uid)
  if (old) await mirror(c, [{ table: 'goals', id }], 'Ubah', 'Target Tabungan', `${old.name}: target ${fmtRp(Number(old.target))} → ${fmtRp(money(value))}`)
  done()
}
export async function deleteGoal(id: string) {
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'goals', id)
  await c.sb.from('goals').delete().eq('id', id).eq('owner_id', c.uid)
  if (old) await mirror(c, [{ table: 'goals', id }], 'Hapus', 'Target Tabungan', `${old.name} (beserta setorannya)`, [], [{ op: 'deleteWhere', tab: 'Setoran Tabungan', col: 'Id target', value: id }])
  done()
}
export async function addDeposit(formData: FormData): Promise<string | void> {
  const goal_id = text(formData.get('goal_id'), 40)
  const ym = text(formData.get('ym'), 7)
  let amount = money(formData.get('amount'))
  if (!goal_id || !isYm(ym) || amount <= 0) return
  if (formData.get('dir') === 'tarik') amount = -amount
  const c = await me()
  if (!c) return done()
  const { data: g } = await c.sb.from('goals').select('id').eq('id', goal_id).eq('owner_id', c.uid).maybeSingle()
  if (!g) return
  const pocket_id = await pocketOf(c, formData.get('pocket_id'))
  const { data: row } = await c.sb.from('goal_deposits').insert({ goal_id, owner_id: c.uid, ym, amount, note: text(formData.get('note'), 80), pocket_id }).select('id').single()
  const gname = (await c.sb.from('goals').select('name').eq('id', goal_id).maybeSingle()).data?.name ?? ''
  if (row) await mirror(c, [{ table: 'goal_deposits', id: row.id }], amount < 0 ? 'Tarik' : 'Setor', 'Setoran Tabungan', `${ymLabel(ym)}: ${gname} ${fmtRp(Math.abs(amount))}`)
  done()
  return amount > 0 ? lowBalance(c, pocket_id) : undefined
}
/** Atur rencana setoran bulan ini untuk sebuah target (disimpan sebagai item anggaran Tabungan bulan itu). */
export async function setGoalPlan(goalId: string, _field: string, value: string) {
  const c = await me()
  if (!c) return done()
  const ym = await curYm()
  const { data: g } = await c.sb.from('goals').select('name,is_emergency').eq('id', goalId).eq('owner_id', c.uid).maybeSingle()
  if (!g) return
  const amount = money(value)
  const { data: items } = await c.sb.from('budget_items').select('id,label,amount').eq('owner_id', c.uid).eq('ym', ym).eq('grp', 'tabungan')
  const hit = planItems({ name: g.name as string, is_emergency: !!g.is_emergency }, (items ?? []).map((r) => ({ ...r, amount: Number(r.amount) })))
  let id: string | undefined
  if (hit.length) {
    id = hit[0].id as string
    const others = hit.slice(1).reduce((t, i) => t + i.amount, 0)
    await c.sb.from('budget_items').update({ amount: Math.max(0, amount - others) }).eq('id', id).eq('owner_id', c.uid)
  } else {
    const { data: row } = await c.sb.from('budget_items').insert({ owner_id: c.uid, ym, grp: 'tabungan', label: g.name, amount, sort: 99 }).select('id').single()
    id = row?.id as string | undefined
  }
  if (id) await mirror(c, [{ table: 'budget_items', id }], 'Ubah', 'Anggaran', `${ymLabel(ym)}: rencana setoran ${g.name} ${fmtRp(amount)}`, [ym])
  done()
}
export async function deleteDeposit(id: string) {
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'goal_deposits', id)
  await c.sb.from('goal_deposits').delete().eq('id', id).eq('owner_id', c.uid)
  if (old) await mirror(c, [{ table: 'goal_deposits', id }], 'Hapus', 'Setoran Tabungan', `${ymLabel(old.ym)}: ${fmtRp(Math.abs(Number(old.amount)))}`)
  done()
}

// ---------- Sumber dana ----------
/** Baris yang memakai sumber dana ini (untuk menyegarkan kolom "Sumber dana" di Sheet saat diganti nama/dihapus). */
async function linkedRows(c: C, pocketId: string) {
  const out: { table: Table; id: string }[] = []
  for (const t of ['income_items', 'expenses', 'goal_deposits'] as const) {
    const { data } = await c.sb.from(t).select('id').eq('owner_id', c.uid).eq('pocket_id', pocketId).limit(400)
    for (const r of data ?? []) out.push({ table: t, id: r.id as string })
  }
  return out
}

export async function addPocket(formData: FormData) {
  const name = text(formData.get('name'), 40)
  const kind = text(formData.get('kind'), 10)
  if (!name || !(POCKET_KINDS as readonly string[]).includes(kind)) return
  const c = await me()
  if (!c) return done()
  const opening = money(formData.get('opening_balance'))
  const { count } = await c.sb.from('pockets').select('id', { count: 'exact', head: true }).eq('owner_id', c.uid)
  const { data: row } = await c.sb.from('pockets').insert({ owner_id: c.uid, name, kind, opening_balance: opening, sort: count ?? 0 }).select('id').single()
  if (row) await mirror(c, [{ table: 'pockets', id: row.id }], 'Tambah', 'Sumber Dana', `${name} (${kind}), saldo awal ${fmtRp(opening)}`)
  done()
}
export async function updatePocket(id: string, field: 'name' | 'opening_balance' | 'kind', value: string) {
  const c = await me()
  if (!c) return done()
  if (field === 'kind' && !(POCKET_KINDS as readonly string[]).includes(value)) return
  const patch = field === 'name' ? { name: text(value, 40) } : field === 'kind' ? { kind: value } : { opening_balance: money(value) }
  if (field === 'name' && !(patch as { name: string }).name) return
  const old = await prev(c, 'pockets' as Table, id)
  if (!old) return
  await c.sb.from('pockets').update(patch).eq('id', id).eq('owner_id', c.uid)
  const linked = field === 'name' ? await linkedRows(c, id) : []
  await mirror(c, [{ table: 'pockets', id }, ...linked], 'Ubah', 'Sumber Dana', field === 'name'
    ? `"${old.name}" → "${text(value, 40)}"` : field === 'kind' ? `${old.name}: jenis ${old.kind} → ${value}` : `${old.name}: saldo awal ${fmtRp(Number(old.opening_balance))} → ${fmtRp(money(value))}`)
  done()
}
export async function deletePocket(id: string) {
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'pockets' as Table, id)
  if (!old) return
  const linked = await linkedRows(c, id)
  const { data: tr } = await c.sb.from('pocket_transfers').select('id').eq('owner_id', c.uid).or(`from_pocket.eq.${id},to_pocket.eq.${id}`)
  await c.sb.from('pockets').delete().eq('id', id).eq('owner_id', c.uid)
  await mirror(c, [{ table: 'pockets', id }, ...linked, ...(tr ?? []).map((r) => ({ table: 'pocket_transfers' as Table, id: r.id as string }))], 'Hapus', 'Sumber Dana',
    `${old.name} dihapus (catatan lama tetap ada, hanya tanpa sumber dana)`)
  done()
}
export async function addTransfer(formData: FormData): Promise<string | void> {
  const amount = money(formData.get('amount'))
  const fee = money(formData.get('fee'))
  const moved_on = text(formData.get('moved_on'), 10)
  if (amount <= 0) return 'Isi jumlah yang dipindah dulu.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(moved_on) || !isYm(moved_on.slice(0, 7))) return 'Tanggal belum dipilih.'
  const c = await me()
  if (!c) return done()
  const from = await pocketOf(c, formData.get('from_pocket'))
  const to = await pocketOf(c, formData.get('to_pocket'))
  if (!from || !to) return 'Pilih sumber dana asal dan tujuan.'
  if (from === to) return 'Asal dan tujuan tidak boleh sama.'
  const { data: row, error } = await c.sb.from('pocket_transfers').insert({ owner_id: c.uid, from_pocket: from, to_pocket: to, amount, fee, moved_on, note: text(formData.get('note'), 80) }).select('id').single()
  if (error || !row) {
    console.error('[pindah dana] gagal simpan', error)
    return `Gagal menyimpan: ${error?.message ?? 'tidak ada data kembali'}. Pastikan supabase/tambah-sumber-dana.sql sudah dijalankan.`
  }
  {
    const names = await Promise.all([from, to].map(async (i) => ((await c.sb.from('pockets').select('name').eq('id', i).maybeSingle()).data?.name as string) ?? ''))
    const items: { table: Table; id: string }[] = [{ table: 'pocket_transfers', id: row.id }]
    // Biaya admin otomatis jadi pengeluaran di Catatan (satu transaksi: dikurangkan dari sumber lewat transfer, bukan lewat catatan ini).
    if (fee > 0) {
      const ym = moved_on.slice(0, 7)
      const { data: ex } = await c.sb.from('expenses').insert({
        owner_id: c.uid, ym, spent_on: moved_on, budget_item_id: null, amount: fee, pocket_id: null, transfer_id: row.id,
        note: `Biaya admin: ${names[0]} → ${names[1]}`,
      }).select('id').single()
      if (ex) items.push({ table: 'expenses', id: ex.id })
    }
    await mirror(c, items, 'Pindah dana', 'Pindah Dana', `${moved_on}: ${names[0]} → ${names[1]} ${fmtRp(amount)}${fee > 0 ? `, biaya admin ${fmtRp(fee)}` : ''}`, [moved_on.slice(0, 7)])
  }
  done()
  return lowBalance(c, from)
}
export async function updateTransfer(formData: FormData) {
  const id = text(formData.get('id'), 40)
  const amount = money(formData.get('amount'))
  const fee = money(formData.get('fee'))
  const moved_on = text(formData.get('moved_on'), 10)
  if (!id || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(moved_on) || !isYm(moved_on.slice(0, 7))) return
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'pocket_transfers' as Table, id)
  if (!old) return
  const from = await pocketOf(c, formData.get('from_pocket'))
  const to = await pocketOf(c, formData.get('to_pocket'))
  if (!from || !to || from === to) return
  await c.sb.from('pocket_transfers').update({ from_pocket: from, to_pocket: to, amount, fee, moved_on, note: text(formData.get('note'), 80) }).eq('id', id).eq('owner_id', c.uid)
  const names = await Promise.all([from, to].map(async (i) => ((await c.sb.from('pockets').select('name').eq('id', i).maybeSingle()).data?.name as string) ?? ''))
  // Catatan biaya admin otomatis ikut disesuaikan (ubah / buat / hapus).
  const { data: fx } = await c.sb.from('expenses').select('id').eq('owner_id', c.uid).eq('transfer_id', id).limit(1)
  const items: { table: Table; id: string }[] = [{ table: 'pocket_transfers', id }]
  let exId = fx?.[0]?.id as string | undefined
  const note = `Biaya admin: ${names[0]} → ${names[1]}`
  if (fee > 0 && exId) await c.sb.from('expenses').update({ amount: fee, spent_on: moved_on, ym: moved_on.slice(0, 7), note, pocket_id: null }).eq('id', exId).eq('owner_id', c.uid)
  else if (fee > 0) {
    const { data: ex } = await c.sb.from('expenses').insert({ owner_id: c.uid, ym: moved_on.slice(0, 7), spent_on: moved_on, budget_item_id: null, amount: fee, pocket_id: null, transfer_id: id, note }).select('id').single()
    exId = ex?.id as string | undefined
  } else if (exId) await c.sb.from('expenses').delete().eq('id', exId).eq('owner_id', c.uid)
  if (exId) items.push({ table: 'expenses', id: exId })
  await mirror(c, items, 'Ubah', 'Pindah Dana', `${old.moved_on}: ${fmtRp(Number(old.amount))} → ${moved_on}: ${names[0]} → ${names[1]} ${fmtRp(amount)}${fee > 0 ? `, biaya admin ${fmtRp(fee)}` : ''}`, [String(old.moved_on).slice(0, 7), moved_on.slice(0, 7)])
  done()
}
export async function deleteTransfer(id: string) {
  const c = await me()
  if (!c) return done()
  const old = await prev(c, 'pocket_transfers' as Table, id)
  const { data: fx } = await c.sb.from('expenses').select('id').eq('owner_id', c.uid).eq('transfer_id', id)
  await c.sb.from('pocket_transfers').delete().eq('id', id).eq('owner_id', c.uid)
  if (old) await mirror(c, [{ table: 'pocket_transfers', id }, ...(fx ?? []).map((r) => ({ table: 'expenses' as Table, id: r.id as string }))], 'Hapus', 'Pindah Dana',
    `${old.moved_on}: pindah dana ${fmtRp(Number(old.amount))} dibatalkan`, [String(old.moved_on).slice(0, 7)])
  done()
}

// ---------- Reset bulan ----------
/** Hapus SEMUA data satu bulan: pemasukan, anggaran, catatan, setoran tabungan, status tagihan, pindah dana,
 *  dan tagihan yang mulai dibuat di bulan itu. Tagihan dari bulan sebelumnya tetap ada (berlaku lintas bulan). */
export async function resetMonth(ym: string) {
  if (!isYm(ym)) return
  const c = await me()
  if (!c) return done()
  const { sb, uid } = c
  const first = `${ym}-01`
  const next = `${ymAdd(ym, 1)}-01`
  const [{ data: tr }, { data: bl }] = await Promise.all([
    sb.from('pocket_transfers').select('id').eq('owner_id', uid).gte('moved_on', first).lt('moved_on', next),
    sb.from('bills').select('id').eq('owner_id', uid).eq('start_ym', ym),
  ])
  const trIds = (tr ?? []).map((r) => r.id as string)
  const blIds = (bl ?? []).map((r) => r.id as string)
  await sb.from('pocket_transfers').delete().eq('owner_id', uid).gte('moved_on', first).lt('moved_on', next) // ikut menghapus catatan biaya admin-nya
  for (const t of ['expenses', 'income_items', 'budget_items', 'goal_deposits', 'bill_months', 'bill_payments'] as const) await sb.from(t).delete().eq('owner_id', uid).eq('ym', ym)
  // pengeluaran berulang jangan dibuat ulang otomatis di bulan yang baru dikosongkan
  for (const r of (await sb.from('recurring_expenses').select('id,skipped_ym').eq('owner_id', uid).lte('start_ym', ym)).data ?? []) {
    await sb.from('recurring_expenses').update({ skipped_ym: [...new Set([...(r.skipped_ym ?? []), ym])] }).eq('id', r.id).eq('owner_id', uid)
  }
  if (blIds.length) await sb.from('bills').delete().eq('owner_id', uid).eq('start_ym', ym)
  const extra: SheetEvent[] = ['Pemasukan', 'Anggaran', 'Catatan', 'Setoran Tabungan', 'Status Tagihan'].map((tab) => ({ op: 'deleteWhere', tab, col: 'Bulan', value: ym }) as SheetEvent)
  for (const id of blIds) extra.push({ op: 'deleteWhere', tab: 'Status Tagihan', col: 'Id tagihan', value: id })
  await mirror(c, [
    ...trIds.map((id) => ({ table: 'pocket_transfers' as Table, id })),
    ...blIds.map((id) => ({ table: 'bills' as Table, id })),
  ], 'Reset bulan', 'Semua tab', `${ymLabel(ym)}: seluruh data bulan ini dihapus`, [ym], extra)
  done()
}

// ---------- Pengaturan ----------
export async function updateName(formData: FormData) {
  const nama = text(formData.get('nama'), 40)
  if (!nama) return
  const c = await me()
  if (!c) return done()
  await c.sb.from('profiles').upsert({ id: c.uid, nama })
  done()
}
export async function addViewer(formData: FormData) {
  const email = text(formData.get('email'), 120).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
  const c = await me()
  if (!c) return done()
  await c.sb.from('viewers').upsert({ owner_id: c.uid, viewer_email: email })
  done()
}
export async function removeViewer(email: string) {
  const c = await me()
  if (!c) return done()
  await c.sb.from('viewers').delete().eq('owner_id', c.uid).eq('viewer_email', email)
  done()
}

export async function todayYm() {
  return ymOfDate(new Date()).ym
}


// ---------- Google Sheet ----------
export type SyncState = { ok: boolean; message: string } | null

/** Isi ulang seluruh Google Sheet dari database (pertama kali tersambung atau untuk pemulihan). */
export async function syncAll(_prev: SyncState, _fd: FormData): Promise<SyncState> {
  if (DEMO) return { ok: false, message: 'Mode demo: tidak ada yang dikirim.' }
  if (!sheetsEnabled()) return { ok: false, message: 'Sinkron belum diatur. Isi SHEETS_WEBHOOK_URL dan SHEETS_WEBHOOK_SECRET di Vercel.' }
  const c = await me()
  if (!c) return null
  const ev = await fullSyncEvents(c.sb, c.uid)
  ev.push(logEvent(c.email, 'Sinkron ulang', 'Semua tab', 'Seluruh isi Sheet diisi ulang dari aplikasi'))
  let total = 0
  for (let i = 0; i < ev.length; i += 80) {
    const r = await postEvents(ev.slice(i, i + 80))
    if (!r.ok) return { ok: false, message: `Gagal: ${r.error}` }
    total += r.n ?? 0
  }
  return { ok: true, message: `Berhasil. ${total} langkah sinkron terkirim ke Google Sheet.` }
}

/** Ubah pembayaran minimum kartu kredit (berlaku seterusnya). */
export async function setBillMin(id: string, _field: string, value: string) {
  const c = await me()
  if (!c) return done()
  const { data: b } = await c.sb.from('bills').select('name,amount,min_payment').eq('id', id).eq('owner_id', c.uid).maybeSingle()
  if (!b) return
  const v = Math.min(money(value), Number(b.amount))
  await c.sb.from('bills').update({ min_payment: v }).eq('id', id).eq('owner_id', c.uid)
  await mirror(c, [{ table: 'bills', id }], 'Ubah minimum bayar', 'Tagihan', `${b.name}: minimum ${fmtRp(Number(b.min_payment ?? 0))} → ${fmtRp(v)}`, [await curYm()])
  done()
}

// ---------- Samakan saldo (rekonsiliasi) ----------
export async function reconcilePocket(formData: FormData): Promise<string | void> {
  const id = text(formData.get('id'), 40)
  const raw = String(formData.get('actual') ?? '').trim()
  if (!id) return
  if (!/\d/.test(raw)) return 'Isi saldo yang sebenarnya dulu.'
  const actual = (raw.startsWith('-') ? -1 : 1) * money(raw)
  const c = await me()
  if (!c) return done()
  const today = ymOfDate(new Date())
  const { pockets } = await queryPockets(c.sb, c.uid, today)
  const p = pockets.find((x) => x.id === id)
  if (!p) return
  const diff = actual - p.saldo
  if (diff === 0) return 'Saldonya sudah sama, tidak ada yang perlu disesuaikan.'
  const { error } = await c.sb.from('pocket_adjustments').insert({ owner_id: c.uid, pocket_id: id, amount: diff, note: text(formData.get('note'), 80), adjusted_on: today.iso })
  if (error) { console.error('[samakan saldo]', error); return `Gagal menyimpan: ${error.message}. Pastikan supabase/tambah-pembayaran-berulang.sql sudah dijalankan.` }
  await mirror(c, [], 'Samakan saldo', 'Sumber Dana', `${p.name}: ${fmtRp(p.saldo)} → ${fmtRp(actual)} (penyesuaian ${diff > 0 ? '+' : '−'}${fmtRp(Math.abs(diff))})`)
  done()
}
export async function deleteAdjustment(id: string) {
  const c = await me()
  if (!c) return done()
  const { data: a } = await c.sb.from('pocket_adjustments').select('amount,pocket_id').eq('id', id).eq('owner_id', c.uid).maybeSingle()
  if (!a) return
  await c.sb.from('pocket_adjustments').delete().eq('id', id).eq('owner_id', c.uid)
  const p = (await c.sb.from('pockets').select('name').eq('id', a.pocket_id).maybeSingle()).data
  await mirror(c, [], 'Hapus penyesuaian', 'Sumber Dana', `${p?.name ?? ''}: penyesuaian ${fmtRp(Number(a.amount))} dibatalkan`)
  done()
}

// ---------- Pengeluaran berulang ----------
export async function addRecurring(formData: FormData): Promise<string | void> {
  const note = text(formData.get('note'), 80)
  const amount = money(formData.get('amount'))
  const start_ym = text(formData.get('start_ym'), 7)
  const endRaw = text(formData.get('end_ym'), 7)
  if (!note) return 'Isi namanya dulu, mis. "Uang kos".'
  if (amount <= 0) return 'Isi nominalnya dulu.'
  if (!isYm(start_ym)) return 'Bulan mulai tidak valid.'
  if (endRaw && (!isYm(endRaw) || endRaw < start_ym)) return 'Bulan berakhir harus setelah bulan mulai.'
  const c = await me()
  if (!c) return done()
  const pocket_id = await pocketOf(c, formData.get('pocket_id'))
  const { error } = await c.sb.from('recurring_expenses').insert({
    owner_id: c.uid, note, amount, start_ym, end_ym: endRaw || null, pocket_id,
    day: Math.min(31, Math.max(1, Number(formData.get('day')) || 1)), category_label: text(formData.get('category_label'), 60),
  })
  if (error) { console.error('[berulang]', error); return `Gagal menyimpan: ${error.message}. Pastikan supabase/tambah-pembayaran-berulang.sql sudah dijalankan.` }
  await mirror(c, [], 'Tambah berulang', 'Catatan', `${note} ${fmtRp(amount)} tiap bulan mulai ${ymLabel(start_ym)}`)
  done()
}
export async function setRecurringField(id: string, field: 'amount' | 'day' | 'note', value: string) {
  const c = await me()
  if (!c) return done()
  const patch = field === 'amount' ? { amount: Math.max(1, money(value)) } : field === 'day' ? { day: Math.min(31, Math.max(1, Number(value) || 1)) } : { note: text(value, 80) }
  if (field === 'note' && !(patch as { note: string }).note) return
  await c.sb.from('recurring_expenses').update(patch).eq('id', id).eq('owner_id', c.uid)
  await mirror(c, [], 'Ubah berulang', 'Catatan', `${field} → ${value} (berlaku untuk bulan yang belum dibuat)`)
  done()
}
export async function deleteRecurring(id: string) {
  const c = await me()
  if (!c) return done()
  const old = (await c.sb.from('recurring_expenses').select('note').eq('id', id).eq('owner_id', c.uid).maybeSingle()).data
  if (!old) return
  await c.sb.from('recurring_expenses').delete().eq('id', id).eq('owner_id', c.uid)
  await mirror(c, [], 'Hapus berulang', 'Catatan', `${old.note} tidak diulang lagi (catatan lama tetap ada)`)
  done()
}
