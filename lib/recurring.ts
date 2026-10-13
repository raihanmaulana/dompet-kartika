// Pengeluaran berulang → dibuat otomatis jadi catatan saat tanggalnya tiba. Dipanggil saat pemilik membuka sebuah bulan.
import type { SupabaseClient } from '@supabase/supabase-js'
import { daysInMonth } from './calc.ts'
import { logEvent, pocketEvents, queue, rowEvent, summaryEvent, type SheetEvent } from './sheets.ts'

export async function ensureRecurring(sb: SupabaseClient, owner: string, ym: string, todayIso: string, email: string): Promise<void> {
  try {
    const { data: recs, error } = await sb.from('recurring_expenses').select('*').eq('owner_id', owner).lte('start_ym', ym)
    if (error || !recs?.length) return
    const due = recs.filter((r) => (!r.end_ym || ym <= r.end_ym) && !(r.skipped_ym ?? []).includes(ym))
      .map((r) => ({ r, date: `${ym}-${String(Math.min(r.day, daysInMonth(ym))).padStart(2, '0')}` }))
      .filter((x) => x.date <= todayIso)
    if (!due.length) return
    const { data: have } = await sb.from('expenses').select('recurring_id').eq('owner_id', owner).eq('ym', ym).in('recurring_id', due.map((x) => x.r.id))
    const done = new Set((have ?? []).map((h) => h.recurring_id as string))
    const todo = due.filter((x) => !done.has(x.r.id))
    if (!todo.length) return
    const { data: items } = await sb.from('budget_items').select('id,label').eq('owner_id', owner).eq('ym', ym)
    const rows = todo.map(({ r, date }) => ({
      owner_id: owner, ym, spent_on: date, amount: Number(r.amount), note: r.note, pocket_id: r.pocket_id,
      budget_item_id: (items ?? []).find((i) => i.label === r.category_label)?.id ?? null, recurring_id: r.id,
    }))
    const { data: made, error: e2 } = await sb.from('expenses').upsert(rows, { onConflict: 'recurring_id,ym', ignoreDuplicates: true }).select('id')
    if (e2 || !made?.length) return
    const ev: SheetEvent[] = []
    for (const m of made) ev.push(await rowEvent(sb, 'expenses', m.id as string))
    ev.push(...(await pocketEvents(sb, owner)))
    const sm = await summaryEvent(sb, owner, ym)
    if (sm) ev.push(sm)
    ev.push(logEvent(email, 'Otomatis', 'Catatan', `${made.length} pengeluaran berulang dibuat untuk ${ym}`))
    queue(ev)
  } catch (e) {
    console.error('[berulang] gagal membuat catatan otomatis', e)
  }
}
