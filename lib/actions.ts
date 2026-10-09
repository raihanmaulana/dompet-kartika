'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isYm, ymAdd, ymOfDate } from './calc.ts'
import { DEMO } from './data.ts'
import { supabaseServer } from './supabase/server.ts'

const GRP = ['kebutuhan', 'gaya_hidup', 'tabungan', 'investasi'] as const
const KINDS = ['tagihan', 'cicilan', 'hutang'] as const

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
  return { sb, uid: user.id }
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
const DEFAULT_INCOME = [
  { label: 'Gaji kotor', kind: 'masuk', amount: 6_500_000 },
  { label: 'Potongan PPh 21', kind: 'potong', amount: 65_000 },
  { label: 'Potongan BPJS karyawan', kind: 'potong', amount: 195_000 },
  { label: 'Uang bulanan dari orang tua', kind: 'masuk', amount: 1_500_000 },
]
const DEFAULT_BUDGET = [
  { grp: 'kebutuhan', label: 'Kebutuhan pokok', amount: 2_850_000 },
  { grp: 'gaya_hidup', label: 'Gaya hidup', amount: 1_300_000 },
  { grp: 'tabungan', label: 'Dana darurat', amount: 1_000_000 },
  { grp: 'tabungan', label: 'Tujuan tertentu', amount: 500_000 },
  { grp: 'investasi', label: 'Reksa dana pasar uang', amount: 400_000 },
  { grp: 'investasi', label: 'SBN ritel / RD pendapatan tetap', amount: 400_000 },
  { grp: 'investasi', label: 'Reksa dana indeks saham', amount: 400_000 },
  { grp: 'investasi', label: 'Emas', amount: 200_000 },
]

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
      sb.from('income_items').select('label,kind,amount,sort').eq('owner_id', uid).eq('ym', prev),
      sb.from('budget_items').select('grp,label,amount,sort').eq('owner_id', uid).eq('ym', prev),
    ])
    if (inc.data?.length) await sb.from('income_items').insert(inc.data.map((r) => ({ ...r, owner_id: uid, ym })))
    if (bud.data?.length) await sb.from('budget_items').insert(bud.data.map((r) => ({ ...r, owner_id: uid, ym })))
  } else {
    await sb.from('income_items').insert(DEFAULT_INCOME.map((r, i) => ({ ...r, owner_id: uid, ym, sort: i })))
    await sb.from('budget_items').insert(DEFAULT_BUDGET.map((r, i) => ({ ...r, owner_id: uid, ym, sort: i })))
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
  await c.sb.from('income_items').insert({ owner_id: c.uid, ym, label, kind, amount: money(formData.get('amount')), sort: 99 })
  done()
}
export async function updateIncome(id: string, field: 'label' | 'amount', value: string) {
  const c = await me()
  if (!c) return done()
  const patch = field === 'label' ? { label: text(value) } : { amount: money(value) }
  if (field === 'label' && !patch.label) return
  await c.sb.from('income_items').update(patch).eq('id', id).eq('owner_id', c.uid)
  done()
}
export async function deleteIncome(id: string) {
  const c = await me()
  if (!c) return done()
  await c.sb.from('income_items').delete().eq('id', id).eq('owner_id', c.uid)
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
  await c.sb.from('budget_items').insert({ owner_id: c.uid, ym, grp, label, amount: money(formData.get('amount')), sort: 99 })
  done()
}
export async function updateBudget(id: string, field: 'label' | 'amount', value: string) {
  const c = await me()
  if (!c) return done()
  const patch = field === 'label' ? { label: text(value) } : { amount: money(value) }
  if (field === 'label' && !patch.label) return
  await c.sb.from('budget_items').update(patch).eq('id', id).eq('owner_id', c.uid)
  done()
}
export async function deleteBudget(id: string) {
  const c = await me()
  if (!c) return done()
  await c.sb.from('budget_items').delete().eq('id', id).eq('owner_id', c.uid)
  done()
}

// ---------- Catatan pengeluaran ----------
export async function addExpense(formData: FormData) {
  const spent_on = text(formData.get('spent_on'), 10)
  const amount = money(formData.get('amount'))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spent_on) || !isYm(spent_on.slice(0, 7)) || amount <= 0) return
  const item = text(formData.get('budget_item_id'), 40)
  const c = await me()
  if (!c) return done()
  await c.sb.from('expenses').insert({
    owner_id: c.uid, ym: spent_on.slice(0, 7), spent_on,
    budget_item_id: item || null, note: text(formData.get('note'), 120), amount,
  })
  done()
}
export async function deleteExpense(id: string) {
  const c = await me()
  if (!c) return done()
  await c.sb.from('expenses').delete().eq('id', id).eq('owner_id', c.uid)
  done()
}

// ---------- Tagihan ----------
export async function addBill(formData: FormData) {
  const name = text(formData.get('name'))
  const kind = text(formData.get('kind'), 10)
  const start_ym = text(formData.get('start_ym'), 7)
  const endRaw = text(formData.get('months'), 3)
  const months = Number(endRaw.replace(/\D/g, ''))
  if (!name || !(KINDS as readonly string[]).includes(kind) || !isYm(start_ym)) return
  const c = await me()
  if (!c) return done()
  await c.sb.from('bills').insert({
    owner_id: c.uid, name, kind, amount: money(formData.get('amount')),
    due_day: Math.min(31, Math.max(1, Number(formData.get('due_day')) || 1)),
    start_ym, end_ym: months > 0 ? ymAdd(start_ym, months - 1) : null,
    note: text(formData.get('note'), 120),
  })
  done()
}
async function upsertBM(c: NonNullable<Awaited<ReturnType<typeof me>>>, billId: string, ym: string, patch: Record<string, unknown>) {
  const { data: bill } = await c.sb.from('bills').select('id').eq('id', billId).eq('owner_id', c.uid).maybeSingle()
  if (!bill) return
  const { data: cur } = await c.sb.from('bill_months').select('*').eq('bill_id', billId).eq('ym', ym).maybeSingle()
  await c.sb.from('bill_months').upsert({
    bill_id: billId, owner_id: c.uid, ym,
    amount_override: cur?.amount_override ?? null, skipped: cur?.skipped ?? false, paid: cur?.paid ?? false, paid_at: cur?.paid_at ?? null,
    ...patch,
  })
}
export async function setBillPaid(billId: string, ym: string, paid: boolean) {
  if (!isYm(ym)) return
  const c = await me()
  if (!c) return done()
  await upsertBM(c, billId, ym, { paid, paid_at: paid ? new Date().toISOString() : null })
  done()
}
export async function setBillSkipped(billId: string, ym: string, skipped: boolean) {
  if (!isYm(ym)) return
  const c = await me()
  if (!c) return done()
  await upsertBM(c, billId, ym, { skipped })
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
  await upsertBM(c, billId, ym, { amount_override: v === Number(bill.amount) ? null : v })
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
  if (b.start_ym >= ym) {
    await c.sb.from('bills').update({ amount: v }).eq('id', billId)
    await c.sb.from('bill_months').update({ amount_override: null }).eq('bill_id', billId).gte('ym', ym)
  } else {
    await c.sb.from('bills').update({ end_ym: ymAdd(ym, -1) }).eq('id', billId)
    await c.sb.from('bills').insert({
      owner_id: c.uid, name: b.name, kind: b.kind, amount: v, due_day: b.due_day,
      start_ym: ym, end_ym: b.end_ym, note: b.note,
    })
  }
  done()
}
// Hentikan dari bulan ini (bulan lalu tetap tercatat); hapus total jika baru mulai bulan ini
export async function stopBill(billId: string, ym: string) {
  if (!isYm(ym)) return
  const c = await me()
  if (!c) return done()
  const { data: b } = await c.sb.from('bills').select('start_ym').eq('id', billId).eq('owner_id', c.uid).maybeSingle()
  if (!b) return
  if (b.start_ym >= ym) await c.sb.from('bills').delete().eq('id', billId)
  else await c.sb.from('bills').update({ end_ym: ymAdd(ym, -1) }).eq('id', billId)
  done()
}

// ---------- Tabungan ----------
export async function addGoal(formData: FormData) {
  const name = text(formData.get('name'))
  if (!name) return
  const c = await me()
  if (!c) return done()
  await c.sb.from('goals').insert({ owner_id: c.uid, name, target: money(formData.get('target')), is_emergency: formData.get('is_emergency') === 'on' })
  done()
}
export async function updateGoalTarget(id: string, _f: string, value: string) {
  const c = await me()
  if (!c) return done()
  await c.sb.from('goals').update({ target: money(value) }).eq('id', id).eq('owner_id', c.uid)
  done()
}
export async function deleteGoal(id: string) {
  const c = await me()
  if (!c) return done()
  await c.sb.from('goals').delete().eq('id', id).eq('owner_id', c.uid)
  done()
}
export async function addDeposit(formData: FormData) {
  const goal_id = text(formData.get('goal_id'), 40)
  const ym = text(formData.get('ym'), 7)
  let amount = money(formData.get('amount'))
  if (!goal_id || !isYm(ym) || amount <= 0) return
  if (formData.get('dir') === 'tarik') amount = -amount
  const c = await me()
  if (!c) return done()
  const { data: g } = await c.sb.from('goals').select('id').eq('id', goal_id).eq('owner_id', c.uid).maybeSingle()
  if (!g) return
  await c.sb.from('goal_deposits').insert({ goal_id, owner_id: c.uid, ym, amount, note: text(formData.get('note'), 80) })
  done()
}
export async function deleteDeposit(id: string) {
  const c = await me()
  if (!c) return done()
  await c.sb.from('goal_deposits').delete().eq('id', id).eq('owner_id', c.uid)
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
