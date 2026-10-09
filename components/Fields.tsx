'use client'
import { useBusyTransition, useBusyFlag } from './Busy'
import { useRef, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

const fmt = (v: string) => {
  const d = v.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Input uang berformat Rp1.500.000 (nilai dikirim apa adanya, server membersihkan titik) */
export function MoneyInput({ name, defaultValue = 0, label, required, placeholder = '0', className = '' }: {
  name: string; defaultValue?: number; label: string; required?: boolean; placeholder?: string; className?: string
}) {
  const [v, setV] = useState(defaultValue ? fmt(String(defaultValue)) : '')
  return (
    <div className={`pre ${className}`}>
      <em aria-hidden>Rp</em>
      <input className="input money" name={name} inputMode="numeric" autoComplete="off" aria-label={label} required={required}
        placeholder={placeholder} value={v} onChange={(e) => setV(fmt(e.target.value))} />
    </div>
  )
}

/** Sel yang tersimpan saat dilepas fokus (blur) atau Enter. */
export function InlineField({ id, field, value, action, money = false, disabled, label, extra, align }: {
  id: string; field: string; value: string | number; action: (id: string, field: any, value: string) => Promise<void>
  money?: boolean; disabled?: boolean; label: string; extra?: string; align?: 'right'
}) {
  const initial = money ? fmt(String(value)) : String(value)
  const [v, setV] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [pending, start] = useBusyTransition()
  const commit = () => {
    if (v === saved) return
    setSaved(v)
    start(() => action(id, field, v))
  }
  const input = (
    <input className={`input bare ${money ? 'money' : ''} ${extra ?? ''}`} aria-label={label} value={v} disabled={disabled}
      inputMode={money ? 'numeric' : undefined} aria-busy={pending}
      style={align ? { textAlign: align } : undefined}
      onChange={(e) => setV(money ? fmt(e.target.value) : e.target.value)}
      onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
  )
  return money ? <div className="pre"><em aria-hidden style={{ left: 10 }}>Rp</em>{input}</div> : input
}

export function ActionButton({ action, args, label, icon = true, text, className = 'btn icon' }: {
  action: (...a: any[]) => Promise<void>; args: unknown[]; label: string; icon?: boolean; text?: string; className?: string
}) {
  const [pending, start] = useBusyTransition()
  return (
    <button type="button" className={className} aria-label={label} title={label} aria-busy={pending} disabled={pending}
      onClick={() => start(() => action(...args))}>
      {icon ? <Trash2 aria-hidden size={18} /> : null}{text}
    </button>
  )
}

export function Submit({ children, className = 'btn', pendingText = 'Menyimpan…' }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus()
  useBusyFlag(pending)
  return <button type="submit" className={className} aria-busy={pending} disabled={pending}>{pending ? pendingText : children}</button>
}

/** Form yang mengosongkan isiannya setelah tersimpan. */
export function QuickForm({ action, children, className, resetOnDone = true }: {
  action: (fd: FormData) => Promise<void>; children: ReactNode; className?: string; resetOnDone?: boolean
}) {
  const ref = useRef<HTMLFormElement>(null)
  return (
    <form ref={ref} className={className} action={async (fd) => { await action(fd); if (resetOnDone) ref.current?.reset() }}>
      {children}
    </form>
  )
}

export function Toggle({ checked, label, action, args, disabled }: {
  checked: boolean; label: string; action: (...a: any[]) => Promise<void>; args: unknown[]; disabled?: boolean
}) {
  const [on, setOn] = useState(checked)
  const [, start] = useBusyTransition()
  return (
    <input type="checkbox" className="check" aria-label={label} checked={on} disabled={disabled}
      onChange={(e) => { const n = e.target.checked; setOn(n); start(() => action(...args, n)) }} />
  )
}
