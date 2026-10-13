'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil } from 'lucide-react'
import { useBusyTransition } from './Busy'
import { useToast } from './Toast'
import { MoneyInput } from './Fields'
import { DatePicker } from './DatePicker'
import { updateExpense } from '@/lib/actions'
import type { Expense, Pocket } from '@/lib/types'

/** Tombol pensil + popup untuk mengubah catatan pengeluaran (jumlah, kategori, tanggal, sumber dana, catatan). */
export function ExpenseEditor({ expense, cats, pockets }: { expense: Expense; cats: { id: string; label: string }[]; pockets: Pocket[] }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useBusyTransition()
  const toast = useToast()
  const opener = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    card.current?.querySelector<HTMLInputElement>('input.money')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.mp-panel')) { setOpen(false); opener.current?.focus() }
      if (e.key === 'Tab' && card.current) {
        const f = [...card.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([type=hidden]):not([disabled]), select, a[href]')]
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const save = (fd: FormData) => start(async () => { await updateExpense(fd); toast('Perubahan tersimpan'); setOpen(false) })

  return (
    <>
      <button type="button" ref={opener} className="btn icon" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Ubah catatan ${expense.note || ''}`.trim()} title="Ubah catatan"><Pencil aria-hidden size={18} /></button>
      {open ? createPortal(
        <div className="confirm" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="confirm-card edit-card" ref={card} role="dialog" aria-modal="true" aria-labelledby={`ed-${expense.id}`}>
            <h2 id={`ed-${expense.id}`}>Ubah catatan</h2>
            <form action={save} className="stack edit-form">
              <input type="hidden" name="id" value={expense.id} />
              <div className="form-grid">
                <label className="field full"><span>Berapa?</span><MoneyInput name="amount" label="Jumlah pengeluaran" defaultValue={expense.amount} required /></label>
                <label className="field"><span>Kategori</span>
                  <select className="select" name="budget_item_id" defaultValue={expense.budget_item_id ?? ''}>
                    <option value="">Tanpa kategori</option>
                    {cats.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </label>
                <label className="field"><span>Tanggal</span><DatePicker name="spent_on" label="Tanggal" defaultValue={expense.spent_on} inModal /></label>
                {pockets.length ? (
                  <label className="field full"><span>Sumber dana</span>
                    <select className="select" name="pocket_id" defaultValue={expense.pocket_id ?? ''}>
                      <option value="">Tanpa sumber dana</option>
                      {pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                ) : null}
                <label className="field full"><span>Catatan</span><input className="input" name="note" maxLength={120} defaultValue={expense.note} /></label>
              </div>
              <div className="confirm-actions">
                <button type="submit" className="btn" disabled={pending} aria-busy={pending}>{pending ? 'Menyimpan…' : 'Simpan perubahan'}</button>
                <button type="button" className="btn ghost" onClick={() => { setOpen(false); opener.current?.focus() }}>Batal</button>
              </div>
            </form>
          </div>
        </div>, document.body) : null}
    </>
  )
}
