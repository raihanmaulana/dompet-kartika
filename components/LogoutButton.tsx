'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import { useBusyTransition } from './Busy'
import { signOut } from '@/lib/auth-actions'

/** Dompet melambai. Dipakai di popup konfirmasi keluar. */
function ByeWallet() {
  return (
    <svg className="bye" viewBox="0 0 120 112" aria-hidden="true">
      <ellipse cx="54" cy="104" rx="30" ry="5" fill="var(--color-ink)" opacity=".14" />
      <g className="bye-arm"><path d="M96 62c8-4 12-14 10-24" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" /><circle cx="106" cy="34" r="6" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="3" /></g>
      <rect x="10" y="40" width="88" height="56" rx="22" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="3" />
      <path d="M22 40c4-9 12-13 22-13h20" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
      <rect x="64" y="58" width="40" height="22" rx="11" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="3" />
      <circle cx="84" cy="69" r="3.2" fill="var(--color-accent-deep)" />
      <circle cx="34" cy="64" r="4.2" fill="var(--color-ink)" />
      <circle cx="50" cy="64" r="4.2" fill="var(--color-ink)" />
      <path d="M36 76c3 4 11 4 14 0" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="25" cy="73" rx="4.5" ry="3" fill="var(--color-surface)" opacity=".7" />
      <ellipse cx="59" cy="73" rx="4.5" ry="3" fill="var(--color-surface)" opacity=".7" />
    </svg>
  )
}

export function LogoutButton({ className = 'btn ghost small', icon = false }: { className?: string; icon?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useBusyTransition()
  const trigger = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const ok = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); trigger.current?.focus() }
      if (e.key === 'Tab') {
        const first = cancel.current, last = ok.current
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const confirm = () => { setOpen(false); start(() => signOut()) }

  return (
    <>
      <button type="button" ref={trigger} className={className} onClick={() => setOpen(true)} disabled={pending} aria-haspopup="dialog">
        {icon ? <LogOut aria-hidden /> : null} Keluar
      </button>
      {open ? createPortal(
        <div className="confirm" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="out-t" aria-describedby="out-d">
            <ByeWallet />
            <h2 id="out-t">Mau keluar dulu?</h2>
            <p id="out-d">Datamu aman tersimpan. Kamu bisa masuk lagi kapan saja.</p>
            <div className="confirm-actions">
              <button type="button" ref={cancel} className="btn ghost" onClick={() => { setOpen(false); trigger.current?.focus() }}>Batal, tetap di sini</button>
              <button type="button" ref={ok} className="btn" onClick={confirm}><LogOut aria-hidden /> Ya, keluar</button>
            </div>
          </div>
        </div>, document.body) : null}
    </>
  )
}
