import { getCtx, loadMonth } from '@/lib/data'
import { billRowsFor, ymLabel } from '@/lib/calc'

export const dynamic = 'force-dynamic'

const cell = (v: string | number) => {
  const s = String(v ?? '')
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const KIND = { tagihan: 'Tagihan rutin', cicilan: 'Cicilan', hutang: 'Hutang', kartu: 'Kartu kredit' } as const

/** Unduh data bulan ini sebagai CSV (pemisah titik koma + BOM supaya langsung rapi di Excel Indonesia). */
export async function GET(req: Request) {
  const ctx = await getCtx()
  const jenis = new URL(req.url).searchParams.get('jenis') === 'tagihan' ? 'tagihan' : 'catatan'
  const data = await loadMonth(ctx)
  const rows: (string | number)[][] = []
  if (jenis === 'catatan') {
    const { loadPockets } = await import('@/lib/data')
    const { pockets } = await loadPockets(ctx)
    rows.push(['Tanggal', 'Kategori', 'Catatan', 'Sumber dana', 'Jumlah', 'Berulang'])
    for (const e of [...data.expenses].sort((a, b) => a.spent_on.localeCompare(b.spent_on))) {
      rows.push([e.spent_on, data.budget.find((b) => b.id === e.budget_item_id)?.label ?? '', e.note, pockets.find((p) => p.id === e.pocket_id)?.name ?? '', e.amount, e.recurring_id ? 'Ya' : ''])
    }
  } else {
    rows.push(['Nama', 'Jenis', 'Tanggal jatuh tempo', 'Nominal bulan ini', 'Sudah dibayar', 'Status'])
    for (const r of billRowsFor(data.bills, data.billMonths, ctx.ym)) {
      rows.push([r.bill.name, KIND[r.bill.kind], r.dueDay, r.amount, r.paidAmount, r.skipped ? 'Dilewati' : r.paid ? 'Lunas' : r.paidAmount > 0 ? 'Dicicil' : 'Belum'])
    }
  }
  const body = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n'
  const name = `${jenis}-${ctx.ym}.csv`
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } })
}
