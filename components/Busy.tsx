'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { Loader, stageLine } from './Loader'

type Ctl = { inc: () => void; dec: () => void }
const Busy = createContext<Ctl>({ inc() {}, dec() {} })

const SHOW_AFTER = 250 // ms: proses cepat tidak memunculkan popup (hindari berkedip)
const MIN_SHOW = 600 // ms: sekali muncul, tampil cukup lama agar tidak kelip

export function BusyProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const [pct, setPct] = useState(0)
  const shownAt = useRef(0)
  const inc = useCallback(() => setCount((c) => c + 1), [])
  const dec = useCallback(() => setCount((c) => Math.max(0, c - 1)), [])
  const ctl = useMemo(() => ({ inc, dec }), [inc, dec])

  useEffect(() => {
    if (count > 0 && !visible) {
      const t = setTimeout(() => { shownAt.current = Date.now(); setPct(14); setVisible(true) }, SHOW_AFTER)
      return () => clearTimeout(t)
    }
    if (count === 0 && visible) {
      setPct(100) // proses selesai: bar langsung penuh, lalu popup menutup
      const t = setTimeout(() => setVisible(false), Math.max(380, MIN_SHOW - (Date.now() - shownAt.current)))
      return () => clearTimeout(t)
    }
  }, [count, visible])

  // Selama proses berjalan, bar merayap pelan mendekati 92% (tidak pernah "bohong" mencapai 100% sebelum selesai).
  useEffect(() => {
    if (!visible || count === 0) return
    const t = setInterval(() => setPct((p) => Math.min(92, p + Math.max(0.4, (92 - p) * 0.07))), 90)
    return () => clearInterval(t)
  }, [visible, count])

  return (
    <Busy.Provider value={ctl}>
      {children}
      {visible ? (
        <div className="busy" role="status" aria-live="polite" aria-label="Sedang memuat">
          <div className="busy-card">
            <Loader />
            <p>{stageLine(pct)}</p>
            <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Kemajuan">
              <div className="prog-track"><i style={{ width: `${pct}%` }} /></div>
              <span className="prog-coin" style={{ left: `${pct}%` }} aria-hidden="true" />
            </div>
            <b className="prog-num">{Math.round(pct)}%</b>
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
