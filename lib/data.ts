import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { isYm, ymOfDate } from './calc.ts'
import { supabaseServer } from './supabase/server.ts'
import * as demo from './demo.ts'
import type { Bill, BillMonth, BudgetItem, Expense, Goal, GoalDeposit, IncomeItem, MonthData } from './types.ts'

export const DEMO = process.env.DEMO_MODE === '1'

export type Owner = { id: string; nama: string }
export type Ctx = {
  userId: string
  email: string
  owners: Owner[]
  ownerId: string
  ownerName: string
  canEdit: boolean
  ym: string
  today: { ym: string; day: number; iso: string }
}

const num = (v: unknown) => Number(v ?? 0)

export const getCtx = cache(async (): Promise<Ctx> => {
  const store = await cookies()
  const today = ymOfDate(new Date())
  const cm = store.get('ym')?.value
  const ym = cm && isYm(cm) ? cm : today.ym

  if (DEMO) {
    return {
      userId: 'demo', email: 'demo@example.com',
      owners: [{ id: 'demo', nama: 'Kartika' }], ownerId: 'demo', ownerName: 'Kartika',
      canEdit: true, ym, today,
    }
  }

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/masuk')

  // pastikan profil ada
  const { data: prof } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (!prof) {
    const nama = (user.user_metadata?.nama as string | undefined) || (user.email ?? '').split('@')[0]
    await sb.from('profiles').upsert({ id: user.id, nama })
  }

  const { data: rows } = await sb.rpc('owners_i_can_view')
  let owners: Owner[] = ((rows ?? []) as { owner_id: string; nama: string }[]).map((r) => ({ id: r.owner_id, nama: r.nama || 'Tanpa nama' }))
  if (!owners.some((o) => o.id === user.id)) owners = [{ id: user.id, nama: 'Saya' }, ...owners]
  owners.sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : a.nama.localeCompare(b.nama)))

  let ownerId = store.get('view_as')?.value
  if (!ownerId || !owners.some((o) => o.id === ownerId)) {
    // pemantau yang belum punya data sendiri langsung melihat data pemilik
    const others = owners.filter((o) => o.id !== user.id)
    ownerId = user.id
    if (others.length) {
      const { count } = await sb.from('income_items').select('id', { count: 'exact', head: true }).eq('owner_id', user.id)
      if (!count) ownerId = others[0].id
    }
  }
  const owner = owners.find((o) => o.id === ownerId)!
  return {
    userId: user.id, email: user.email ?? '', owners, ownerId, ownerName: owner.nama,
    canEdit: ownerId === user.id, ym, today,
  }
})

export async function loadMonth(ctx: Ctx): Promise<MonthData> {
  const { ym } = ctx
  if (DEMO) {
    return {
      ym,
      income: ym >= '2026-10' ? demo.demoIncome(ym) : [],
      budget: ym >= '2026-10' ? demo.demoBudget(ym) : [],
      expenses: ym === '2026-10' ? demo.demoExpenses(ym) : [],
      bills: demo.demoBills,
      billMonths: demo.demoBillMonths,
    }
  }
  const sb = await supabaseServer()
  const o = ctx.ownerId
  const [inc, bud, exp, bills, bms] = await Promise.all([
    sb.from('income_items').select('*').eq('owner_id', o).eq('ym', ym).order('sort').order('label'),
    sb.from('budget_items').select('*').eq('owner_id', o).eq('ym', ym).order('sort').order('label'),
    sb.from('expenses').select('*').eq('owner_id', o).eq('ym', ym).order('spent_on', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('bills').select('*').eq('owner_id', o).order('due_day'),
    sb.from('bill_months').select('*').eq('owner_id', o).eq('ym', ym),
  ])
  return {
    ym,
    income: (inc.data ?? []).map((r) => ({ ...r, amount: num(r.amount) })) as IncomeItem[],
    budget: (bud.data ?? []).map((r) => ({ ...r, amount: num(r.amount) })) as BudgetItem[],
    expenses: (exp.data ?? []).map((r) => ({ ...r, amount: num(r.amount) })) as Expense[],
    bills: (bills.data ?? []).map((r) => ({ ...r, amount: num(r.amount) })) as Bill[],
    billMonths: (bms.data ?? []).map((r) => ({ ...r, amount_override: r.amount_override == null ? null : num(r.amount_override) })) as BillMonth[],
  }
}

export async function loadGoals(ctx: Ctx): Promise<{ goals: Goal[]; deposits: GoalDeposit[] }> {
  if (DEMO) return { goals: demo.demoGoals, deposits: demo.demoDeposits }
  const sb = await supabaseServer()
  const [g, d] = await Promise.all([
    sb.from('goals').select('*').eq('owner_id', ctx.ownerId).order('created_at'),
    sb.from('goal_deposits').select('*').eq('owner_id', ctx.ownerId).order('created_at', { ascending: false }),
  ])
  return {
    goals: (g.data ?? []).map((r) => ({ ...r, target: num(r.target) })) as Goal[],
    deposits: (d.data ?? []).map((r) => ({ ...r, amount: num(r.amount) })) as GoalDeposit[],
  }
}

export async function loadViewers(): Promise<string[]> {
  if (DEMO) return ['pasangan@example.com']
  const sb = await supabaseServer()
  const { data } = await sb.from('viewers').select('viewer_email').order('viewer_email')
  return (data ?? []).map((r) => r.viewer_email as string)
}

export async function prevMonthHasData(ctx: Ctx, prev: string): Promise<boolean> {
  if (DEMO) return prev >= '2026-10'
  const sb = await supabaseServer()
  const { count } = await sb.from('income_items').select('id', { count: 'exact', head: true }).eq('owner_id', ctx.ownerId).eq('ym', prev)
  return !!count
}
