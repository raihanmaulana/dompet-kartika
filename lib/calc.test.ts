import test from 'node:test'
import assert from 'node:assert/strict'
import { billRowsFor, summarize, futureValue, ymAdd, ymDiff, rp, daysInMonth } from './calc.ts'
import type { Bill, BillMonth, BudgetItem, IncomeItem, Expense } from './types.ts'

const ym = '2026-10'
const inc: IncomeItem[] = [
  { id: 'a', ym, label: 'Gaji kotor', kind: 'masuk', amount: 6_500_000, sort: 0 },
  { id: 'b', ym, label: 'PPh 21', kind: 'potong', amount: 65_000, sort: 1 },
  { id: 'c', ym, label: 'BPJS', kind: 'potong', amount: 195_000, sort: 2 },
  { id: 'd', ym, label: 'Ortu', kind: 'masuk', amount: 1_500_000, sort: 3 },
]
const bud: BudgetItem[] = [
  { id: 'k', ym, grp: 'kebutuhan', label: 'Kebutuhan', amount: 2_850_000, sort: 0 },
  { id: 'g', ym, grp: 'gaya_hidup', label: 'Gaya hidup', amount: 1_300_000, sort: 0 },
  { id: 't', ym, grp: 'tabungan', label: 'Dana darurat', amount: 1_500_000, sort: 0 },
  { id: 'i', ym, grp: 'investasi', label: 'RD', amount: 1_400_000, sort: 0 },
]
const bills: Bill[] = [
  { id: 'w', name: 'Wifi', kind: 'tagihan', amount: 150_000, due_day: 5, start_ym: '2026-10', end_ym: null, note: '' },
  { id: 'h', name: 'Pinjaman', kind: 'hutang', amount: 300_000, due_day: 31, start_ym: '2026-09', end_ym: '2026-12', note: '' },
]

test('bulan helper', () => {
  assert.equal(ymAdd('2026-12', 1), '2027-01')
  assert.equal(ymAdd('2026-01', -1), '2025-12')
  assert.equal(ymDiff('2027-03', '2026-10'), 5)
  assert.equal(daysInMonth('2026-02'), 28)
  assert.equal(rp(7740000), 'Rp7.740.000')
})

test('gaji bersih = 7.740.000 dan hutang memotong jatah', () => {
  const rows = billRowsFor(bills, [], ym)
  assert.equal(rows.length, 2)
  const s = summarize(inc, bud, [], rows, { ym, day: 1 }, ym)
  assert.equal(s.bersih, 7_740_000)
  assert.equal(s.tagihan, 450_000)
  assert.equal(s.cicilanHutang, 300_000)
  assert.equal(s.uangBelanja, 7_740_000 - 450_000 - 1_500_000 - 1_400_000)
  const sNo = summarize(inc, bud, [], billRowsFor([bills[0]], [], ym), { ym, day: 1 }, ym)
  assert.equal(sNo.uangBelanja - s.uangBelanja, 300_000) // hutang 300rb mengurangi uang belanja tepat 300rb
})

test('per bulan: nominal beda, lewati, bayar', () => {
  const bms: BillMonth[] = [
    { bill_id: 'h', ym, amount_override: 500_000, skipped: false, paid: true },
    { bill_id: 'w', ym, amount_override: null, skipped: true, paid: false },
  ]
  const rows = billRowsFor(bills, bms, ym)
  const s = summarize(inc, bud, [], rows, { ym, day: 1 }, ym)
  assert.equal(s.tagihan, 500_000) // wifi dilewati
  assert.equal(s.tagihanBelumBayar, 0)
  const nov = billRowsFor(bills, bms, '2026-11')
  assert.equal(nov.find((r) => r.bill.id === 'h')!.amount, 300_000) // bulan lain tidak ikut berubah
  assert.equal(nov.find((r) => r.bill.id === 'h')!.paid, false)
})

test('hutang berakhir & sisa', () => {
  const r = billRowsFor(bills, [], ym).find((x) => x.bill.id === 'h')!
  assert.equal(r.monthsAfter, 2)
  assert.equal(r.remainingTotal, 900_000)
  assert.equal(r.dueDay, 31)
  assert.equal(billRowsFor(bills, [], '2027-01').length, 1) // hutang sudah lunas
  assert.equal(billRowsFor(bills, [], '2026-02')[0]?.bill.id ?? null, null)
  assert.equal(billRowsFor(bills, [], '2026-11').find((x) => x.bill.id === 'w')!.dueDay, 5)
  assert.equal(billRowsFor([{ ...bills[1], start_ym: '2026-01', end_ym: null }], [], '2027-02')[0].dueDay, 28)
})

test('pengeluaran & jatah harian', () => {
  const ex: Expense[] = [{ id: 'e', ym, spent_on: '2026-10-02', budget_item_id: 'k', note: 'makan', amount: 100_000 }]
  const s = summarize(inc, bud, ex, billRowsFor(bills, [], ym), { ym, day: 10 }, ym)
  assert.equal(s.spent, 100_000)
  assert.equal(s.spentByItem.k, 100_000)
  assert.equal(s.hariSisa, 22)
  assert.equal(s.jatahPerHari, Math.floor(s.sisaJatah / 22))
  const past = summarize(inc, bud, ex, [], { ym: '2026-11', day: 3 }, ym)
  assert.equal(past.hariSisa, 0)
  const future = summarize(inc, bud, ex, [], { ym: '2026-09', day: 3 }, ym)
  assert.equal(future.hariSisa, 31)
})

test('nilai masa depan', () => {
  assert.equal(futureValue(100, 0, 1), 1200)
  const fv = futureValue(1_000_000, 0.10, 5)
  assert.ok(fv > 76_000_000 && fv < 77_000_000, String(fv))
})

test('goalPlan mencocokkan nama target dengan item anggaran tabungan', async () => {
  const { goalPlan } = await import('./calc.ts')
  const items = [{ label: 'Dana Darurat', amount: 1000000 }, { label: 'Liburan', amount: 300000 }]
  assert.equal(goalPlan({ name: 'Dana darurat', is_emergency: true }, items), 1000000)
  assert.equal(goalPlan({ name: 'Dana', is_emergency: true }, [{ label: 'Tabungan darurat', amount: 5 }]), 5)
  assert.equal(goalPlan({ name: 'Liburan', is_emergency: false }, items), 300000)
  assert.equal(goalPlan({ name: 'Rumah', is_emergency: false }, items), 0)
})

test('pocketBalances menghitung saldo tiap sumber dana', async () => {
  const { pocketBalances } = await import('./calc.ts')
  const pockets = [
    { id: 'a', name: 'BCA', kind: 'bank' as const, opening_balance: 1_000_000, sort: 0 },
    { id: 'b', name: 'GoPay', kind: 'ewallet' as const, opening_balance: 0, sort: 1 },
  ]
  const today = { ym: '2026-10', iso: '2026-10-09' }
  const r = pocketBalances(
    pockets,
    [
      { ym: '2026-10', kind: 'masuk', amount: 6_500_000, pocket_id: 'a' },
      { ym: '2026-10', kind: 'potong', amount: 260_000, pocket_id: 'a' },
      { ym: '2026-11', kind: 'masuk', amount: 9_999_999, pocket_id: 'a' }, // bulan depan: belum dihitung
      { ym: '2026-10', kind: 'masuk', amount: 500_000 }, // tanpa sumber: diabaikan
    ],
    [{ spent_on: '2026-10-02', amount: 35_000, pocket_id: 'b' }, { spent_on: '2026-10-20', amount: 1, pocket_id: 'b' }],
    [{ ym: '2026-10', amount: 1_000_000, pocket_id: 'a' }, { ym: '2026-10', amount: -200_000, pocket_id: 'a' }],
    [{ id: 't', from_pocket: 'a', to_pocket: 'b', amount: 300_000, fee: 2_500, moved_on: '2026-10-05', note: '' }],
    today,
  )
  // BCA: 1.000.000 + 6.500.000 − 260.000 − 1.000.000 + 200.000 − 300.000 − 2.500 (biaya admin) = 6.137.500
  assert.equal(r[0].saldo, 6_137_500)
  // GoPay: −35.000 + 300.000 = 265.000
  assert.equal(r[1].saldo, 265_000)
})
