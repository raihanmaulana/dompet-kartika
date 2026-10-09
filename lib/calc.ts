import type { Bill, BillMonth, BudgetItem, Expense, Grp, IncomeItem } from './types.ts'

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export const isYm = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s)

export function ymParts(ym: string) {
  return { y: Number(ym.slice(0, 4)), m: Number(ym.slice(5, 7)) }
}
export function ymIndex(ym: string) {
  const { y, m } = ymParts(ym)
  return y * 12 + (m - 1)
}
export function ymFromIndex(i: number) {
  const y = Math.floor(i / 12)
  const m = (i % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}
export const ymAdd = (ym: string, n: number) => ymFromIndex(ymIndex(ym) + n)
export const ymDiff = (a: string, b: string) => ymIndex(a) - ymIndex(b) // a - b
export function ymLabel(ym: string, short = false) {
  const { y, m } = ymParts(ym)
  const name = BULAN[m - 1]
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`
}
export const daysInMonth = (ym: string) => {
  const { y, m } = ymParts(ym)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
export function ymOfDate(d: Date, tz = 'Asia/Jakarta') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  return { ym: parts.slice(0, 7), day: Number(parts.slice(8, 10)), iso: parts }
}

export const rp = (n: number) => {
  const neg = n < 0
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}Rp${s}`
}
export const rpShort = (n: number) => {
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (a >= 1_000) return `${sign}${Math.round(a / 1_000)} rb`
  return `${sign}${a}`
}

// ---------- Tagihan ----------
export type BillRow = {
  bill: Bill
  amount: number // nominal bulan ini (sudah memakai penyesuaian)
  skipped: boolean
  paid: boolean
  overridden: boolean
  dueDay: number // dibatasi ke jumlah hari di bulan itu
  monthsAfter: number | null // sisa bulan setelah bulan ini (null = tanpa batas)
  remainingTotal: number | null // total yang masih harus dibayar termasuk bulan ini
}

export const billActive = (b: Bill, ym: string) => b.start_ym <= ym && (!b.end_ym || ym <= b.end_ym)

export function billRowsFor(bills: Bill[], bms: BillMonth[], ym: string): BillRow[] {
  const rows: BillRow[] = []
  for (const bill of bills) {
    if (!billActive(bill, ym)) continue
    const bm = bms.find((x) => x.bill_id === bill.id && x.ym === ym)
    const overridden = bm?.amount_override != null
    const amount = bm?.amount_override ?? bill.amount
    const monthsAfter = bill.end_ym ? ymDiff(bill.end_ym, ym) : null
    rows.push({
      bill,
      amount,
      skipped: !!bm?.skipped,
      paid: !!bm?.paid,
      overridden,
      dueDay: Math.min(bill.due_day, daysInMonth(ym)),
      monthsAfter,
      remainingTotal: monthsAfter == null ? null : amount * (monthsAfter + 1),
    })
  }
  return rows.sort((a, b) => a.dueDay - b.dueDay || a.bill.name.localeCompare(b.bill.name))
}

// ---------- Ringkasan bulan ----------
export type Summary = {
  masuk: number
  potong: number
  bersih: number
  tagihan: number // semua tagihan + cicilan + hutang bulan ini (tidak termasuk yang dilewati)
  tagihanBiasa: number
  cicilanHutang: number
  tagihanBelumBayar: number
  grp: Record<Grp, number>
  uangBelanja: number // bersih - tagihan - tabungan - investasi
  rencanaBelanja: number // kebutuhan + gaya hidup yang direncanakan
  selisihRencana: number // uangBelanja - rencanaBelanja (negatif = rencana kebanyakan)
  spent: number
  sisaJatah: number
  sisaRencana: number // bersih - semua alokasi
  hariSisa: number
  jatahPerHari: number
  rasio: { butuh: number; gaya: number; simpan: number; cicilan: number }
  spentByItem: Record<string, number>
  danaDarurat: { min: number; max: number; bulanan: number }
}

export function summarize(
  income: IncomeItem[], budget: BudgetItem[], expenses: Expense[], rows: BillRow[],
  today?: { ym: string; day: number } | null, ym?: string,
): Summary {
  const masuk = income.filter((i) => i.kind === 'masuk').reduce((s, i) => s + i.amount, 0)
  const potong = income.filter((i) => i.kind === 'potong').reduce((s, i) => s + i.amount, 0)
  const bersih = masuk - potong
  const live = rows.filter((r) => !r.skipped)
  const tagihan = live.reduce((s, r) => s + r.amount, 0)
  const cicilanHutang = live.filter((r) => r.bill.kind !== 'tagihan').reduce((s, r) => s + r.amount, 0)
  const tagihanBelumBayar = live.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0)
  const grp: Record<Grp, number> = { kebutuhan: 0, gaya_hidup: 0, tabungan: 0, investasi: 0 }
  for (const b of budget) grp[b.grp] += b.amount
  const uangBelanja = bersih - tagihan - grp.tabungan - grp.investasi
  const rencanaBelanja = grp.kebutuhan + grp.gaya_hidup
  const spent = expenses.reduce((s, e) => s + e.amount, 0)
  const spentByItem: Record<string, number> = {}
  for (const e of expenses) if (e.budget_item_id) spentByItem[e.budget_item_id] = (spentByItem[e.budget_item_id] ?? 0) + e.amount
  const sisaJatah = uangBelanja - spent

  let hariSisa = 0
  if (ym) {
    const dim = daysInMonth(ym)
    if (!today || ym > today.ym) hariSisa = dim
    else if (ym === today.ym) hariSisa = dim - today.day + 1
    else hariSisa = 0
  }
  const pct = (n: number) => (bersih > 0 ? n / bersih : 0)
  return {
    masuk, potong, bersih, tagihan,
    tagihanBiasa: tagihan - cicilanHutang, cicilanHutang, tagihanBelumBayar, grp,
    uangBelanja, rencanaBelanja, selisihRencana: uangBelanja - rencanaBelanja,
    spent, sisaJatah,
    sisaRencana: bersih - tagihan - grp.kebutuhan - grp.gaya_hidup - grp.tabungan - grp.investasi,
    hariSisa,
    jatahPerHari: hariSisa > 0 ? Math.max(0, Math.floor(sisaJatah / hariSisa)) : 0,
    rasio: {
      butuh: pct(grp.kebutuhan + tagihan),
      gaya: pct(grp.gaya_hidup),
      simpan: pct(grp.tabungan + grp.investasi),
      cicilan: pct(cicilanHutang),
    },
    spentByItem,
    danaDarurat: {
      bulanan: grp.kebutuhan + grp.gaya_hidup + tagihan,
      min: (grp.kebutuhan + grp.gaya_hidup + tagihan) * 3,
      max: (grp.kebutuhan + grp.gaya_hidup + tagihan) * 6,
    },
  }
}

// ---------- Investasi ----------
// Setoran tiap akhir bulan, imbal hasil tahunan efektif r.
export function futureValue(monthly: number, annualRate: number, years: number) {
  const n = Math.round(years * 12)
  if (annualRate === 0) return monthly * n
  const i = Math.pow(1 + annualRate, 1 / 12) - 1
  return monthly * ((Math.pow(1 + i, n) - 1) / i)
}

export const INSTRUMENTS = [
  { key: 'rd_pu', label: 'Reksa dana pasar uang', rate: 0.045, risk: 'Rendah' },
  { key: 'sbn', label: 'SBN ritel / RD pendapatan tetap', rate: 0.06, risk: 'Rendah–menengah' },
  { key: 'emas', label: 'Emas', rate: 0.07, risk: 'Menengah' },
  { key: 'rd_saham', label: 'Reksa dana indeks saham', rate: 0.10, risk: 'Menengah–tinggi' },
] as const


/** Rencana setoran bulan ini untuk satu target: item anggaran "tabungan" dengan nama yang cocok. */
export function goalPlan(goal: { name: string; is_emergency: boolean }, tabunganItems: { label: string; amount: number }[]) {
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim()
  const g = norm(goal.name)
  const hit = (pred: (l: string) => boolean) => tabunganItems.filter((i) => pred(norm(i.label))).reduce((t, i) => t + i.amount, 0)
  let plan = hit((l) => l === g)
  if (!plan) plan = hit((l) => l.includes(g) || (l.length > 2 && g.includes(l)))
  if (!plan && goal.is_emergency) plan = hit((l) => l.includes('darurat'))
  return plan
}
