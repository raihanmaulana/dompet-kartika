export type Grp = 'kebutuhan' | 'gaya_hidup' | 'tabungan' | 'investasi'
export type BillKind = 'tagihan' | 'cicilan' | 'hutang'

export type IncomeItem = { id: string; ym: string; label: string; kind: 'masuk' | 'potong'; amount: number; sort: number; pocket_id?: string | null }
export type BudgetItem = { id: string; ym: string; grp: Grp; label: string; amount: number; sort: number }
export type Expense = { id: string; ym: string; spent_on: string; budget_item_id: string | null; note: string; amount: number; pocket_id?: string | null }
export type Bill = { id: string; name: string; kind: BillKind; amount: number; due_day: number; start_ym: string; end_ym: string | null; note: string }
export type BillMonth = { bill_id: string; ym: string; amount_override: number | null; skipped: boolean; paid: boolean }
export type Goal = { id: string; name: string; target: number; is_emergency: boolean }
export type GoalDeposit = { id: string; goal_id: string; ym: string; amount: number; note: string; pocket_id?: string | null }

export type PocketKind = 'bank' | 'ewallet' | 'tunai' | 'lainnya'
export type Pocket = { id: string; name: string; kind: PocketKind; opening_balance: number; sort: number }
export type Transfer = { id: string; from_pocket: string; to_pocket: string; amount: number; moved_on: string; note: string }
export type PocketView = Pocket & { saldo: number }

export type MonthData = {
  ym: string
  income: IncomeItem[]
  budget: BudgetItem[]
  expenses: Expense[]
  bills: Bill[]
  billMonths: BillMonth[]
}
