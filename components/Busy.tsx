'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { Loader, LOADING_LINES } from './Loader'

type Ctl = { inc: () => void; dec: () => void }
const Busy = createContext<Ctl>({ inc() {}, dec() {} })

const SHOW_AFTER = 250 // ms: proses cepat tidak memunculkan popup (hindari berkedip)
const MIN_SHOW = 600 // ms: sekali muncul, tampil cukup lama agar tidak kelip

export function BusyProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const [line, setLine] = useState(0)
  const shownAt = useRef(0)
  const inc = useCallback(() => setCount((c) => c + 1), [])
  const dec = useCallback(() => setCount((c) => Math.max(0, c - 1)), [])
  const ctl = useMemo(() => ({ inc, dec }), [inc, dec])

  useEffect(() => {
    if (count > 0 && !visible) {
      const t = setTimeout(() => { shownAt.current = Date.now(); setLine((l) => (l + 1) % LOADING_LINES.length); setVisible(true) }, SHOW_AFTER)
      return () => clearTimeout(t)
    }
    if (count === 0 && visible) {
      const t = setTimeout(() => setVisible(false), Math.max(0, MIN_SHOW - (Date.now() - shownAt.current)))
      return () => clearTimeout(t)
    }
  }, [count, visible])

  return (
    <Busy.Provider value={ctl}>
      {children}
      {visible ? (
        <div className="busy" role="status" aria-live="polite" aria-label="Sedang memuat">
          <div className="busy-card">
            <Loader />
            <p>{LOADING_LINES[line]}</p>
            <small>Jangan ditutup dulu ya</small>
          </div>
        </div>
      ) : null}
    </Busy.Provider>
  )
}

export const useBusy = () => useContext(Busy)

/** Pengganti useTransition: sambil berjalan, popup loading ikut muncul bila prosesnya lama. */
export function useBusyTransition() {
  const [pending, start] = useTransition()
  const { inc, dec } = useBusy()
  useEffect(() => {
    if (!pending) return
    inc()
    return () => dec()
  }, [pending, inc, dec])
  return [pending, start] as const
}

/** Tandai sibuk selama `active` true (untuk form: useFormStatus / useActionState). */
export function useBusyFlag(active: boolean) {
  const { inc, dec } = useBusy()
  useEffect(() => {
    if (!active) return
    inc()
    return () => dec()
  }, [active, inc, dec])
}
