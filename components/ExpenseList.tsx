'use client'
import { useMemo, useState } from 'react'
import { FilterX } from 'lucide-react'
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
  const reset = () => { setDayR(null); setAmtR(null); setCat(''); setPocket('') }

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <div className="filters" role="search" aria-label="Filter catatan">
        <label className="field"><span>Kategori</span>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Semua kategori</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            <option value={NONE}>Tanpa kategori</option>
          </select>
        </label>
        <label className="field"><span>Sumber dana</span>
          <select className="select" value={pocket} onChange={(e) => setPocket(e.target.value)}>
            <option value="">Semua sumber</option>
            {pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value={NONE}>Belum dipilih</option>
          </select>
        </label>
        <div className="field f-range">
          <span>Tanggal <b>{d[0] === d[1] ? `tgl ${d[0]}` : `tgl ${d[0]} – ${d[1]}`}</b></span>
          <RangeSlider min={1} max={days} value={d} onChange={(v) => setDayR(v[0] === 1 && v[1] === days ? null : v)} label="Rentang tanggal" format={(n) => `tanggal ${n}`} />
        </div>
        <div className="field f-range">
          <span>Nominal <b>{rp(a[0])} – {rp(a[1])}</b></span>
          <RangeSlider min={0} max={maxAmt} step={step} value={a} onChange={(v) => setAmtR(v[0] === 0 && v[1] === maxAmt ? null : v)} label="Rentang nominal" format={rp} />
        </div>
        <div className="f-foot">
          <span className="hint" aria-live="polite">{active ? `${shown.length} dari ${expenses.length} catatan · ${rp(total)}` : `${expenses.length} catatan · ${rp(total)}`}</span>
          {active ? <button type="button" className="btn small ghost" onClick={reset}><FilterX aria-hidden size={16} /> Reset filter</button> : null}
        </div>
      </div>

      {shown.length ? [...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <p className="hint" style={{ fontWeight: 700, marginBottom: 4 }}>{tgl(day)} · {rp(list.reduce((t, e) => t + e.amount, 0))}</p>
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
        </div>
      )) : <p className="hint">{expenses.length ? 'Tidak ada catatan yang cocok dengan filter ini.' : 'Belum ada catatan.'}</p>}
    </div>
  )
}
