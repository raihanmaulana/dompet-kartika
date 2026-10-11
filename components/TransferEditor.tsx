'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil } from 'lucide-react'
import { useBusyTransition } from './Busy'
import { MoneyInput } from './Fields'
import { DatePicker } from './DatePicker'
import { updateTransfer } from '@/lib/actions'
import type { Pocket, Transfer } from '@/lib/types'

/** Tombol pensil + popup untuk mengubah pindah dana (asal, tujuan, jumlah, biaya admin, tanggal, catatan). */
export function TransferEditor({ transfer, pockets }: { transfer: Transfer; pockets: Pocket[] }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useBusyTransition()
  const opener = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    card.current?.querySelector<HTMLInputElement>('input.money')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.mp-panel')) { setOpen(false); opener.current?.focus() }
      if (e.key === 'Tab' && card.current) {
        const f = [...card.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([type=hidden]):not([disabled]), select')]
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const save = (fd: FormData) => start(async () => { await updateTransfer(fd); setOpen(false) })

  return (
    <>
      <button type="button" ref={opener} className="btn icon" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Ubah pindah dana ini" title="Ubah pindah dana"><Pencil aria-hidden size={18} /></button>
      {open ? createPortal(
        <div className="confirm" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="confirm-card edit-card" ref={card} role="dialog" aria-modal="true" aria-labelledby={`et-${transfer.id}`}>
            <h2 id={`et-${transfer.id}`}>Ubah pindah dana</h2>
            <form action={save} className="stack edit-form">
              <input type="hidden" name="id" value={transfer.id} />
              <div className="form-grid">
                <label className="field"><span>Dari</span>
                  <select className="select" name="from_pocket" defaultValue={transfer.from_pocket} required>{pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </label>
                <label className="field"><span>Ke</span>
                  <select className="select" name="to_pocket" defaultValue={transfer.to_pocket} required>{pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </label>
                <label className="field"><span>Jumlah</span><MoneyInput name="amount" label="Jumlah dipindah" defaultValue={transfer.amount} required /></label>
                <label className="field"><span>Tanggal</span><DatePicker name="moved_on" label="Tanggal" defaultValue={transfer.moved_on} inModal /></label>
                <label className="field"><span>Biaya admin</span><MoneyInput name="fee" label="Biaya admin" defaultValue={transfer.fee ?? 0} /></label>
                <label className="field"><span>Catatan</span><input className="input" name="note" maxLength={80} defaultValue={transfer.note} /></label>
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
