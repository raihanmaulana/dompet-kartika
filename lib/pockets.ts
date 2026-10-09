// Pengambilan data sumber dana + saldonya. Dipakai halaman (lib/data.ts) dan sinkron Sheet (lib/sheets.ts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { pocketBalances } from './calc.ts'
import type { Pocket, PocketView, Transfer } from './types.ts'

const num = (v: unknown) => Number(v ?? 0)
const nums = (rows: any[] | null) => (rows ?? []).map((r) => ({ ...r, amount: num(r.amount) }))

export async function queryPockets(sb: SupabaseClient, owner: string, today: { ym: string; iso: string }): Promise<{ pockets: PocketView[]; transfers: Transfer[] }> {
  const [p, t, inc, exp, dep] = await Promise.all([
    sb.from('pockets').select('*').eq('owner_id', owner).order('sort').order('created_at'),
    sb.from('pocket_transfers').select('*').eq('owner_id', owner).order('moved_on', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('income_items').select('ym,kind,amount,pocket_id').eq('owner_id', owner).not('pocket_id', 'is', null),
    sb.from('expenses').select('spent_on,amount,pocket_id').eq('owner_id', owner).not('pocket_id', 'is', null),
    sb.from('goal_deposits').select('ym,amount,pocket_id').eq('owner_id', owner).not('pocket_id', 'is', null),
  ])
  const pockets = (p.data ?? []).map((r) => ({ ...r, opening_balance: num(r.opening_balance) })) as Pocket[]
  const transfers = nums(t.data).map((r) => ({ ...r, fee: num(r.fee) })) as Transfer[]
  return { pockets: pocketBalances(pockets, nums(inc.data), nums(exp.data), nums(dep.data), transfers, today), transfers }
}
