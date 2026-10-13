'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check } from 'lucide-react'

type Kind = 'ok' | 'warn'
type Item = { id: number; text: string; kind: Kind }
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {})

/** Notifikasi singkat setelah menyimpan. Hilang sendiri; dibacakan pembaca layar lewat aria-live. */
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const seq = useRef(0)
  const timers = useRef<number[]>([])
  const toast = useCallback((text: string, kind: Kind = 'ok') => {
    const id = ++seq.current
    setItems((l) => [...l.slice(-2), { id, text, kind }])
    timers.current.push(window.setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), kind === 'warn' ? 6500 : 2600))
  }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'warn' ? 'alert' : 'status'}>
            {t.kind === 'warn' ? <AlertTriangle aria-hidden size={18} /> : <Check aria-hidden size={18} />}
            <span>{t.text.replace(/^⚠\s*/, '')}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
