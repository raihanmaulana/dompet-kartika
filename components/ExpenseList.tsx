'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter, FilterX } from 'lucide-react'
import { ThemedSelect } from './ThemedSelect'
import { ActionButton } from './Fields'
import { ExpenseEditor } from './ExpenseEditor'
import { RangeSlider } from './RangeSlider'
import { deleteExpense } from '@/lib/actions'
import { rp } from '@/lib/calc'
import type { Expense, Pocket } from '@/lib/types'

const tgl = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const NONE = '__none'

/** Daftar catatan dengan filter tanggal, kategori, sumber dana, dan rentang nominal. */
export function ExpenseList({ expenses, cats, pockets, canEdit, days }: {
  expenses: Expense[]; cats: { id: string; label: string }[]; pockets: Pocket[]; canEdit: boolean; days: number
}) {
  const [dayR, setDayR] = useState<[number, number] | null>(null)
  const [amtR, setAmtR] = useState<[number, number] | null>(null)
  const [cat, setCat] = useState('')
  const [pocket, setPocket] = useState('')
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLDivElement>(null)

  const top = Math.max(0, ...expenses.map((e) => e.amount))
  const step = top >= 2_000_000 ? 50_000 : top >= 200_000 ? 5_000 : 1_000
  const maxAmt = Math.max(step, Math.ceil(top / step) * step)
  const d: [number, number] = dayR ?? [1, days]
  const a: [number, number] = amtR ?? [0, maxAmt]
  const active = !!(dayR || amtR || cat || pocket)

  const label = (id: string | null) => cats.find((p) => p.id === id)?.label
  const pk = (id?: string | null) => pockets.find((p) => p.id === id)?.name

  const shown = useMemo(() => expenses.filter((e) => {
    const day = Number(e.spent_on.slice(8, 10))
    if (day < d[0] || day > d[1]) return false
    if (e.amount < a[0] || e.amount > a[1]) return false
    if (cat === NONE ? e.budget_item_id : cat && e.budget_item_id !== cat) return false
    if (pocket === NONE ? e.pocket_id : pocket && e.pocket_id !== pocket) return false
    return true
  }), [expenses, d[0], d[1], a[0], a[1], cat, pocket]) // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = new Map<string, Expense[]>()
  for (const e of shown) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e])
  const total = shown.reduce((t, e) => t + e.amount, 0)
  const nActive = [dayR, amtR, cat, pocket].filter(Boolean).length
  const closeModal = () => { setOpen(false); opener.current?.focus() }

  useEffect(() => {
    if (!open) return
    card.current?.querySelector<HTMLElement>('button.ts-btn')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.ts-panel')) closeModal()
      if (e.key === 'Tab' && card.current) {
        const f = [...card.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')]
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setDayR(null); setAmtR(null); setCat(''); setPocket('') }

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <div className="filter-bar">
        <button type="button" ref={opener} className="btn small ghost filter-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <Filter aria-hidden size={16} /> Filter{nActive ? <span className="filter-badge" aria-label={`${nActive} filter aktif`}>{nActive}</span> : null}
        </button>
        <span className="hint" aria-live="polite">{active ? `${shown.length} dari ${expenses.length} catatan · ${rp(total)}` : `${expenses.length} catatan · ${rp(total)}`}</span>
        {active ? <button type="button" className="btn small ghost" onClick={reset}><FilterX aria-hidden size={16} /> Reset</button> : null}
      </div>
      {open ? createPortal(
        <div className="confirm" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="confirm-card edit-card filter-card" ref={card} role="dialog" aria-modal="true" aria-labelledby="flt-t">
            <h2 id="flt-t"><Filter aria-hidden size={20} /> Filter catatan</h2>
            <div className="stack">
              <div className="field"><span>Kategori</span>
                <ThemedSelect label="Kategori" value={cat} onChange={setCat} options={[{ value: '', label: 'Semua kategori' }, ...cats.map((c) => ({ value: c.id, label: c.label })), { value: NONE, label: 'Tanpa kategori' }]} />
              </div>
              <div className="field"><span>Sumber dana</span>
                <ThemedSelect label="Sumber dana" value={pocket} onChange={setPocket} options={[{ value: '', label: 'Semua sumber' }, ...pockets.map((p) => ({ value: p.id, label: p.name })), { value: NONE, label: 'Belum dipilih' }]} />
              </div>
              <div className="field f-range">
                <span>Tanggal <b>{d[0] === d[1] ? `tgl ${d[0]}` : `tgl ${d[0]} – ${d[1]}`}</b></span>
                <RangeSlider min={1} max={days} value={d} onChange={(v) => setDayR(v[0] === 1 && v[1] === days ? null : v)} label="Rentang tanggal" format={(n) => `tanggal ${n}`} />
              </div>
              <div className="field f-range">
                <span>Nominal <b>{rp(a[0])} – {rp(a[1])}</b></span>
                <RangeSlider min={0} max={maxAmt} step={step} value={a} onChange={(v) => setAmtR(v[0] === 0 && v[1] === maxAmt ? null : v)} label="Rentang nominal" format={rp} />
              </div>
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={closeModal}>Tampilkan {shown.length} catatan</button>
              <button type="button" className="btn ghost" onClick={reset} disabled={!active}>Reset filter</button>
            </div>
          </div>
        </div>, document.body) : null}

      {shown.length ? [...byDay.entries()].map(([day, list]) => (
        <section key={day} className="day" aria-label={tgl(day)}>
          <div className="day-sep">
            <span className="day-badge" aria-hidden><b>{Number(day.slice(8, 10))}</b><i>{new Date(day + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'UTC' })}</i></span>
            <span className="day-title"><b>{tgl(day)}</b><span>{list.length} catatan</span></span>
            <span className="day-line" aria-hidden />
            <span className="day-total">{rp(list.reduce((t, e) => t + e.amount, 0))}</span>
          </div>
          <ul className="rows">
            {list.map((e) => (
              <li key={e.id}>
                <span className="grow"><span className="name">{e.note || label(e.budget_item_id) || 'Pengeluaran'}</span>
                  {label(e.budget_item_id) || pk(e.pocket_id) || e.transfer_id ? <span className="meta">{[label(e.budget_item_id), pk(e.pocket_id), e.transfer_id ? 'Otomatis dari Pindah dana (hapus lewat halaman Sumber dana)' : ''].filter(Boolean).join(' · ')}</span> : null}</span>
                <span className="amt">{rp(e.amount)}</span>
                {canEdit && !e.transfer_id ? <ExpenseEditor expense={e} cats={cats} pockets={pockets} /> : null}
                {canEdit && !e.transfer_id ? <ActionButton action={deleteExpense} args={[e.id]} label={`Hapus catatan ${e.note || rp(e.amount)}`} /> : null}
              </li>
            ))}
          </ul>
        </section>
      )) : <p className="hint">{expenses.length ? 'Tidak ada catatan yang cocok dengan filter ini.' : 'Belum ada catatan.'}</p>}
    </div>
  )
}
