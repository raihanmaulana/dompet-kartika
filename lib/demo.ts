// Data contoh untuk DEMO_MODE=1 (hanya untuk melihat tampilan tanpa database).
import type { Bill, BillMonth, BudgetItem, Expense, Goal, GoalDeposit, IncomeItem } from './types.ts'

export const demoIncome = (ym: string): IncomeItem[] => [
  { id: 'i1', ym, label: 'Gaji kotor', kind: 'masuk', amount: 6_500_000, sort: 0 },
  { id: 'i2', ym, label: 'Potongan PPh 21', kind: 'potong', amount: 65_000, sort: 1 },
  { id: 'i3', ym, label: 'Potongan BPJS karyawan', kind: 'potong', amount: 195_000, sort: 2 },
  { id: 'i4', ym, label: 'Uang bulanan dari orang tua', kind: 'masuk', amount: 1_500_000, sort: 3 },
]
export const demoBudget = (ym: string): BudgetItem[] => [
  { id: 'b1', ym, grp: 'kebutuhan', label: 'Makan', amount: 1_600_000, sort: 0 },
  { id: 'b2', ym, grp: 'kebutuhan', label: 'Transport', amount: 600_000, sort: 1 },
  { id: 'b3', ym, grp: 'kebutuhan', label: 'Kos / kontribusi rumah', amount: 650_000, sort: 2 },
  { id: 'b4', ym, grp: 'gaya_hidup', label: 'Jajan dan hiburan', amount: 700_000, sort: 0 },
  { id: 'b5', ym, grp: 'gaya_hidup', label: 'Belanja', amount: 600_000, sort: 1 },
  { id: 'b6', ym, grp: 'tabungan', label: 'Dana darurat', amount: 1_000_000, sort: 0 },
  { id: 'b7', ym, grp: 'tabungan', label: 'Tujuan tertentu', amount: 500_000, sort: 1 },
  { id: 'b8', ym, grp: 'investasi', label: 'Reksa dana pasar uang', amount: 400_000, sort: 0 },
  { id: 'b9', ym, grp: 'investasi', label: 'Reksa dana indeks saham', amount: 400_000, sort: 1 },
  { id: 'b10', ym, grp: 'investasi', label: 'Emas', amount: 200_000, sort: 2 },
]
export const demoExpenses = (ym: string): Expense[] => [
  { id: 'e1', ym, spent_on: `${ym}-01`, budget_item_id: 'b1', note: 'Makan siang kantor', amount: 35_000 },
  { id: 'e2', ym, spent_on: `${ym}-02`, budget_item_id: 'b2', note: 'Ojek online', amount: 25_000 },
  { id: 'e3', ym, spent_on: `${ym}-04`, budget_item_id: 'b4', note: 'Kopi sore', amount: 28_000 },
  { id: 'e4', ym, spent_on: `${ym}-07`, budget_item_id: 'b5', note: 'Skincare', amount: 120_000 },
  { id: 'e5', ym, spent_on: `${ym}-08`, budget_item_id: 'b1', note: 'Makan malam bareng teman', amount: 85_000 },
]
export const demoBills: Bill[] = [
  { id: 'l1', name: 'Wifi kos', kind: 'tagihan', amount: 150_000, due_day: 5, start_ym: '2026-10', end_ym: null, note: '' },
  { id: 'l2', name: 'Pulsa / paket data', kind: 'tagihan', amount: 100_000, due_day: 12, start_ym: '2026-10', end_ym: null, note: '' },
  { id: 'l3', name: 'Cicilan HP', kind: 'cicilan', amount: 450_000, due_day: 20, start_ym: '2026-08', end_ym: '2027-01', note: '' },
  { id: 'l4', name: 'Pinjam ke teman', kind: 'hutang', amount: 200_000, due_day: 28, start_ym: '2026-10', end_ym: '2026-12', note: 'Untuk laptop' },
]
export const demoBillMonths: BillMonth[] = [
  { bill_id: 'l1', ym: '2026-10', amount_override: null, skipped: false, paid: true },
]
export const demoGoals: Goal[] = [
  { id: 'g1', name: 'Dana darurat', target: 15_000_000, is_emergency: true },
  { id: 'g2', name: 'Liburan', target: 3_000_000, is_emergency: false },
]
export const demoDeposits: GoalDeposit[] = [
  { id: 'd1', goal_id: 'g1', ym: '2026-10', amount: 1_000_000, note: '' },
  { id: 'd2', goal_id: 'g2', ym: '2026-10', amount: 500_000, note: '' },
]
