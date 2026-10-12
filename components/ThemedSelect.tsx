'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type Opt = { value: string; label: string }

/** Dropdown bertema pengganti <select>: panel di portal, bisa dipakai di dalam modal, lengkap dengan navigasi keyboard. */
export function ThemedSelect({ value, options, onChange, label, placeholder }: { value: string; options: Opt[]; onChange: (v: string) => void; label: string; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()
  const cur = options.find((o) => o.value === value)

  const place = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const up = below < 180 && above > below
    setBox({ left: r.left, width: r.width, max: Math.max(120, Math.min(280, up ? above : below)), ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) })
  }
  const show = () => { setIdx(Math.max(0, options.findIndex((o) => o.value === value))); place(); setOpen(true) }
  const close = (focus = true) => { setOpen(false); if (focus) btn.current?.focus() }
  const pick = (v: string) => { onChange(v); close() }

  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { const t = e.target as Node; if (!list.current?.contains(t) && !btn.current?.contains(t)) close(false) }
    const move = () => place()
    document.addEventListener('mousedown', out)
    window.addEventListener('resize', move)
    window.addEventListener('scroll', move, true)
    return () => { document.removeEventListener('mousedown', out); window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`)?.scrollIntoView({ block: 'nearest' }) }, [idx, open])

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show() } return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setIdx(0) }
    else if (e.key === 'End') { e.preventDefault(); setIdx(options.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[idx].value) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'Tab') close(false)
  }

  return (
    <>
      <button type="button" ref={btn} className="ts-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={`${label}: ${cur?.label ?? placeholder ?? ''}`}
        onClick={() => (open ? close(false) : show())} onKeyDown={onKey}>
        <span className="grow">{cur?.label ?? placeholder ?? 'Pilih'}</span>
        <ChevronDown aria-hidden size={18} className="ts-chev" />
      </button>
      {open && box ? createPortal(
        <ul id={id} ref={list} role="listbox" aria-label={label} className="ts-panel" style={{ left: box.left, width: box.width, top: box.top, bottom: box.bottom, maxHeight: box.max }}>
          {options.map((o, i) => (
            <li key={o.value} role="option" data-i={i} aria-selected={o.value === value} className={`ts-opt${i === idx ? ' is-active' : ''}${o.value === value ? ' is-on' : ''}`}
              onMouseEnter={() => setIdx(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.value)}>
              <span className="grow">{o.label}</span>{o.value === value ? <Check aria-hidden size={16} /> : null}
            </li>
          ))}
        </ul>, document.body) : null}
    </>
  )
}
