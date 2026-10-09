'use client'
import { useEffect, useMemo } from 'react'
import { playCelebration } from '@/lib/celebrate'

const N = 90
/** Hujan confetti layar penuh + suara. `fire` berganti angka tiap kali harus dimainkan ulang. */
export function Confetti({ fire, onEnd }: { fire: number; onEnd: () => void }) {
  const bits = useMemo(() => Array.from({ length: N }, (_, i) => ({
    left: Math.random() * 100, dx: (Math.random() - 0.5) * 240, rot: 360 + Math.random() * 720,
    delay: Math.random() * 0.35, dur: 1.9 + Math.random() * 1.3, c: i % 5, k: i % 3, size: 7 + Math.random() * 7,
  })), [fire])

  useEffect(() => {
    if (!fire) return
    playCelebration()
    const t = setTimeout(onEnd, 3800)
    return () => clearTimeout(t)
  }, [fire, onEnd])

  if (!fire) return null
  return (
    <div className="rain" aria-hidden="true" key={fire}>
      {bits.map((b, i) => (
        <i key={i} className={`rb c${b.c} k${b.k}`} style={{ left: `${b.left}%`, width: b.size, height: b.k === 2 ? b.size * 1.8 : b.size, ['--dx' as string]: `${b.dx}px`, ['--rot' as string]: `${b.rot}deg`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />
      ))}
    </div>
  )
}
