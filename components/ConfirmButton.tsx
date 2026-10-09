'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { useBusyTransition } from './Busy'

/** Tombol dengan popup konfirmasi bertema sebelum menjalankan aksi yang tak bisa dibatalkan. */
export function ConfirmButton({ action, args, title, message, trigger, confirmText = 'Ya, hapus', className = 'btn small ghost' }: {
  action: (...a: any[]) => Promise<void>; args: unknown[]; title: string; message: string; trigger: string; confirmText?: string; className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useBusyTransition()
  const opener = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const ok = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); opener.current?.focus() }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === cancel.current) { e.preventDefault(); ok.current?.focus() }
        else if (!e.shiftKey && document.activeElement === ok.current) { e.preventDefault(); cancel.current?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" ref={opener} className={className} onClick={() => setOpen(true)} disabled={pending} aria-haspopup="dialog">{trigger}</button>
      {open ? createPortal(
        <div className="confirm" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-d">
            <span className="confirm-icon" aria-hidden="true"><Trash2 /></span>
            <h2 id="cf-t">{title}</h2>
            <p id="cf-d">{message}</p>
            <div className="confirm-actions">
              <button type="button" ref={cancel} className="btn ghost" onClick={() => { setOpen(false); opener.current?.focus() }}>Batal</button>
              <button type="button" ref={ok} className="btn danger" onClick={() => { setOpen(false); start(() => action(...args)) }}>{confirmText}</button>
            </div>
          </div>
        </div>, document.body) : null}
    </>
  )
}
