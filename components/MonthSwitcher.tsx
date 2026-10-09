'use client'
import { useBusyTransition, useBusyFlag } from './Busy'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { setMonth } from '@/lib/actions'
import { ymAdd, ymLabel } from '@/lib/calc'

export function MonthSwitcher({ ym }: { ym: string }) {
  const [pending, start] = useBusyTransition()
  const go = (v: string) => start(() => setMonth(v))
  const opts = Array.from({ length: 31 }, (_, i) => ymAdd(ym, i - 18))
  return (
    <div className="monthbar" role="group" aria-label="Pilih bulan" aria-busy={pending}>
      <button type="button" onClick={() => go(ymAdd(ym, -1))} aria-label="Bulan sebelumnya"><ChevronLeft aria-hidden /></button>
      <select value={ym} onChange={(e) => go(e.target.value)} aria-label="Bulan" disabled={pending}>
        {opts.map((o) => <option key={o} value={o}>{ymLabel(o)}</option>)}
      </select>
      <button type="button" onClick={() => go(ymAdd(ym, 1))} aria-label="Bulan berikutnya"><ChevronRight aria-hidden /></button>
    </div>
  )
}
