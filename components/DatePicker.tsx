'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { daysInMonth, ymAdd, ymLabel, ymOfDate } from '@/lib/calc'

const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (ym: string, d: number) => `${ym}-${pad(d)}`
const nice = (v: string) => new Date(v + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const addDays = (v: string, n: number) => new Date(Date.parse(v + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)

/** Pemilih tanggal bertema pengganti <input type="date">. Nilai dikirim lewat input tersembunyi bernama `name`. */
export function DatePicker({ name, defaultValue, min, max, label }: { name: string; defaultValue: string; min?: string; max?: string; label: string }) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(defaultValue.slice(0, 7))
  const [cursor, setCursor] = useState(defaultValue)
  const hidden = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const ok = useCallback((v: string) => (!min || v >= min) && (!max || v <= max), [min, max])

  // Formulir dikosongkan setelah simpan (QuickForm): kembalikan tanggal ke nilai awal.
  useEffect(() => {
    const f = hidden.current?.form
    if (!f) return
    const on = () => setValue(defaultValue)
    f.addEventListener('reset', on)
    return () => f.removeEventListener('reset', on)
  }, [defaultValue])

  const show = () => { setView(value.slice(0, 7)); setCursor(value); setOpen(true) }
  const close = useCallback((back = true) => { setOpen(false); if (back) trigger.current?.focus() }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])
  useEffect(() => { if (open) grid.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus() }, [open, cursor])

  const pick = (v: string) => { if (!ok(v)) return; setValue(v); close() }
  const move = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key as 'ArrowLeft']
    if (!step) return
    e.preventDefault()
    const next = addDays(cursor, step)
    if (!ok(next)) return
    setCursor(next); setView(next.slice(0, 7))
  }

  const first = new Date(Date.UTC(Number(view.slice(0, 4)), Number(view.slice(5, 7)) - 1, 1)).getUTCDay()
  const blanks = (first + 6) % 7 // pekan mulai Senin
  const dim = daysInMonth(view)
  const today = open ? ymOfDate(new Date()).iso : ''
  const canPrev = !min || ymAdd(view, -1) >= min.slice(0, 7)
  const canNext = !max || ymAdd(view, 1) <= max.slice(0, 7)
  const tabbable = cursor.slice(0, 7) === view && ok(cursor) ? cursor : iso(view, Array.from({ length: dim }, (_, i) => i + 1).find((d) => ok(iso(view, d))) ?? 1)

  return (
    <>
      <input type="hidden" name={name} value={value} ref={hidden} />
      <button type="button" ref={trigger} className="input dp-trigger" onClick={() => (open ? close(false) : show())} aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${nice(value)}`}>
        <CalendarDays aria-hidden />
        <span>{new Date(value + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>
        <ChevronDown className="dp-caret" aria-hidden />
      </button>
      {open ? createPortal(
        <>
          <div className="mp-backdrop" onClick={() => close(false)} aria-hidden="true" />
          <div className="mp-panel dp-panel" role="dialog" aria-label={`Pilih ${label.toLowerCase()}`} style={panelPos(trigger.current)}>
            <div className="mp-head">
              <button type="button" onClick={() => setView((v) => ymAdd(v, -1))} aria-label="Bulan sebelumnya" disabled={!canPrev}><ChevronLeft aria-hidden /></button>
              <b aria-live="polite">{ymLabel(view)}</b>
              <button type="button" onClick={() => setView((v) => ymAdd(v, 1))} aria-label="Bulan berikutnya" disabled={!canNext}><ChevronRight aria-hidden /></button>
            </div>
            <div className="dp-dow" aria-hidden="true">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="dp-grid" ref={grid} onKeyDown={move}>
              {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: dim }, (_, i) => {
                const d = i + 1, v = iso(view, d), sel = v === value
                return (
                  <button key={v} type="button" disabled={!ok(v)} tabIndex={v === tabbable ? 0 : -1} aria-label={nice(v)} aria-pressed={sel}
                    className={`dp-d${sel ? ' sel' : ''}${v === today ? ' now' : ''}`} onClick={() => pick(v)}>{d}</button>
                )
              })}
            </div>
            <div className="mp-foot">
              <button type="button" className="btn small ghost" disabled={!!today && !ok(today)} onClick={() => pick(ymOfDate(new Date()).iso)}>Hari ini</button>
            </div>
          </div>
        </>, document.body) : null}
    </>
  )
}

function panelPos(el: HTMLElement | null): React.CSSProperties {
  if (!el || typeof window === 'undefined') return {}
  const r = el.getBoundingClientRect()
  const w = 312
  const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left))
  const below = r.bottom + 8
  const top = below + 380 > window.innerHeight ? Math.max(12, r.top - 8 - 380) : below
  return { ['--mp-left' as string]: `${left}px`, ['--mp-top' as string]: `${top}px` }
}
