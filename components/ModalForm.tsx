'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBusyFlag } from './Busy'

/** Tombol yang membuka popup berisi formulir. Pesan error tampil di dalam popup; peringatan (⚠) tampil setelah tersimpan. */
export function ModalForm({ trigger, triggerClass = 'btn small', title, intro, submitText = 'Simpan', action, children }: {
  trigger: ReactNode; triggerClass?: string; title: string; intro?: ReactNode; submitText?: string
  action: (fd: FormData) => Promise<string | void>; children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLDivElement>(null)
  useBusyFlag(pending)
  const close = () => { setOpen(false); setMsg(''); setSaved(false); opener.current?.focus() }

  useEffect(() => {
    if (!open) return
    card.current?.querySelector<HTMLElement>('input:not([type=hidden]), select')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.ts-panel, .mp-panel')) close()
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
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const warn = msg.startsWith('⚠')
  return (
    <>
      <button type="button" ref={opener} className={triggerClass} onClick={() => setOpen(true)} aria-haspopup="dialog">{trigger}</button>
      {open ? createPortal(
        <div className="confirm" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
          <div className="confirm-card edit-card" ref={card} role="dialog" aria-modal="true" aria-label={title}>
            <h2>{title}</h2>
            {intro ? <div className="hint" style={{ marginBottom: 'var(--space-3)' }}>{intro}</div> : null}
            <form className="stack edit-form" action={async (fd) => {
              setPending(true)
              let r: string | void
              try { r = await action(fd) } catch { r = 'Gagal menyimpan, coba lagi.' }
              setPending(false)
              const m = typeof r === 'string' ? r : ''
              if (m && !m.startsWith('⚠')) { setMsg(m); return }
              if (m) { setMsg(m); setSaved(true); return } // tersimpan, tapi ada peringatan: biarkan terbaca dulu
              close()
            }}>
              {saved ? null : <div className="form-grid">{children}</div>}
              {msg ? <p className={warn ? 'form-msg warn' : 'form-msg err'} role={warn ? 'status' : 'alert'}>{msg}</p> : null}
              <div className="confirm-actions">
                {saved ? <button type="button" className="btn" onClick={close}>Mengerti</button>
                  : <button type="submit" className="btn" disabled={pending} aria-busy={pending}>{pending ? 'Menyimpan…' : submitText}</button>}
                {saved ? null : <button type="button" className="btn ghost" onClick={close}>Batal</button>}
              </div>
            </form>
          </div>
        </div>, document.body) : null}
    </>
  )
}
