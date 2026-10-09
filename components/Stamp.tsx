'use client'
import { useEffect, useState } from 'react'

const BITS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + (i % 2 ? 0.18 : 0)
  const d = 62 + (i % 3) * 22
  return { dx: Math.round(Math.cos(a) * d), dy: Math.round(Math.sin(a) * d) - 8, c: i % 4, r: (i * 53) % 360, k: i % 3 }
})

/** Stempel "sudah menabung". Meriah sekali saat pertama muncul; klik untuk memutar ulang. */
export function Stamp({ id, name, monthLabel }: { id: string; name: string; monthLabel: string }) {
  const [play, setPlay] = useState(0)
  useEffect(() => {
    const key = `stamp:${id}:${monthLabel}`
    try {
      if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, '1'); setPlay(1) }
    } catch { setPlay(1) }
  }, [id, monthLabel])

  return (
    <div className="stamp-zone">
      <button type="button" className="stamp-btn" onClick={() => setPlay((n) => n + 1)} aria-label={`Stempel: target ${name} bulan ${monthLabel} sudah tercapai. Tekan untuk memutar ulang animasi.`}>
        <span className="confetti" key={`c${play}`} aria-hidden="true" data-on={play > 0}>
          {BITS.map((b, i) => (
            <i key={i} className={`bit c${b.c} k${b.k}`} style={{ ['--dx' as string]: `${b.dx}px`, ['--dy' as string]: `${b.dy}px`, ['--r' as string]: `${b.r}deg`, animationDelay: `${(i % 6) * 0.04}s` }} />
          ))}
        </span>
        <svg key={`s${play}`} className="stamp" data-on={play > 0} viewBox="0 0 120 120" aria-hidden="true">
          <circle className="ripple" cx="60" cy="60" r="50" fill="none" stroke="var(--color-accent)" strokeWidth="3" />
          <g className="stamp-body">
            <circle cx="60" cy="60" r="52" fill="var(--color-surface)" stroke="var(--color-accent-deep)" strokeWidth="4" />
            <circle cx="60" cy="60" r="44" fill="none" stroke="var(--color-accent-deep)" strokeWidth="1.8" strokeDasharray="2 5" strokeLinecap="round" />
            <path d="M60 24l5.4 11 12.1 1.7-8.8 8.5 2.1 12L60 51.4 49.2 57.2l2.1-12-8.8-8.5 12.1-1.7Z" fill="var(--color-warn)" stroke="var(--color-accent-deep)" strokeWidth="2.4" strokeLinejoin="round" />
            <text x="60" y="80" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="22" fill="var(--color-accent-deep)" letterSpacing=".5">LUNAS</text>
            <text x="60" y="94" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="9" fill="var(--color-accent-deep)" letterSpacing="1.5">BULAN INI</text>
          </g>
        </svg>
      </button>
      <p className="stamp-cap" role="status">Hore! Target bulan ini selesai.</p>
    </div>
  )
}
