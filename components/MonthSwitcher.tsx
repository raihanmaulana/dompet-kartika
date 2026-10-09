'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useBusyTransition } from './Busy'
import { setMonth } from '@/lib/actions'
import { ymAdd, ymLabel, ymOfDate, ymParts } from '@/lib/calc'

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function MonthSwitcher({ ym }: { ym: string }) {
  const [pending, start] = useBusyTransition()
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(ymParts(ym).y)
  const [cursor, setCursor] = useState(ym)
  const trigger = useRef<HTMLButtonElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const go = (v: string) => start(() => setMonth(v))

  const show = () => { setYear(ymParts(ym).y); setCursor(ym); setOpen(true) }
  const close = useCallback((back = true) => { setOpen(false); if (back) trigger.current?.focus() }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus()
  }, [open, cursor])

  const pick = (v: string) => { close(false); if (v !== ym) go(v); else trigger.current?.focus() }
  const move = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key as 'ArrowLeft']
    if (!step) return
    e.preventDefault()
    const next = ymAdd(cursor, step)
    setCursor(next); setYear(ymParts(next).y)
  }
  const now = open ? ymOfDate(new Date()).ym : ''
  const cur = ymParts(cursor)

  return (
    <div className="monthbar" role="group" aria-label="Pilih bulan" aria-busy={pending}>
      <button type="button" className="mb-step" onClick={() => go(ymAdd(ym, -1))} aria-label="Bulan sebelumnya" disabled={pending}><ChevronLeft aria-hidden /></button>
      <button type="button" ref={trigger} className="mb-pick" onClick={() => (open ? close(false) : show())} aria-haspopup="dialog" aria-expanded={open} disabled={pending}>
        <CalendarDays aria-hidden /> <span>{ymLabel(ym)}</span> <ChevronDown className="mb-caret" aria-hidden />
      </button>
      <button type="button" className="mb-step" onClick={() => go(ymAdd(ym, 1))} aria-label="Bulan berikutnya" disabled={pending}><ChevronRight aria-hidden /></button>

      {open ? createPortal(
        <>
          <div className="mp-backdrop" onClick={() => close(false)} aria-hidden="true" />
          <div className="mp-panel" role="dialog" aria-label="Pilih bulan dan tahun" style={panelPos(trigger.current)}>
            <div className="mp-head">
              <button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Tahun sebelumnya"><ChevronLeft aria-hidden /></button>
              <b aria-live="polite">{year}</b>
              <button type="button" onClick={() => setYear((y) => y + 1)} aria-label="Tahun berikutnya"><ChevronRight aria-hidden /></button>
            </div>
            <div className="mp-grid" ref={grid} onKeyDown={move}>
              {SHORT.map((name, i) => {
                const v = `${year}-${String(i + 1).padStart(2, '0')}`
                const sel = v === ym
                return (
                  <button key={v} type="button" className={`mp-m${sel ? ' sel' : ''}${v === now ? ' now' : ''}`} tabIndex={v === cursor || (cur.y !== year && i === 0) ? 0 : -1}
                    aria-pressed={sel} aria-label={ymLabel(v)} onClick={() => pick(v)}>
                    {name}
                  </button>
                )
              })}
            </div>
            <div className="mp-foot">
              <button type="button" className="btn small ghost" onClick={() => pick(ymOfDate(new Date()).ym)}>Ke bulan ini</button>
            </div>
          </div>
        </>, document.body) : null}
    </div>
  )
}

/** Desktop: tepat di bawah tombol. Layar kecil: ditaruh di bawah layar lewat CSS (gaya ini diabaikan). */
function panelPos(el: HTMLElement | null): React.CSSProperties {
  if (!el || typeof window === 'undefined') return {}
  const r = el.getBoundingClientRect()
  const w = 312
  const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))
  return { ['--mp-left' as string]: `${left}px`, ['--mp-top' as string]: `${r.bottom + 8}px` }
}
