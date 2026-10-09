'use client'
import { useEffect, useRef, useState } from 'react'

type Mood = 'idle' | 'laugh' | 'cry' | 'coins' | 'love' | 'sleep'

const CYCLE: Mood[] = ['laugh', 'cry', 'coins', 'love', 'sleep']
const SAY: Record<Mood, string> = {
  idle: 'Coba klik aku!',
  laugh: 'Hihihi, geli!',
  cry: 'Huhu… dompetnya tipis',
  coins: 'Hore, koin berjatuhan!',
  love: 'Aku sayang kamu!',
  sleep: 'Zzz… ngantuk…',
}
const COINS = [
  { dx: -70, dy: -78, d: 0 }, { dx: -30, dy: -104, d: 0.08 }, { dx: 8, dy: -92, d: 0.16 },
  { dx: 44, dy: -110, d: 0.04 }, { dx: 78, dy: -80, d: 0.12 }, { dx: 112, dy: -58, d: 0.2 },
]

function Coin({ i }: { i: number }) {
  const c = COINS[i]
  return (
    <g className="burst" style={{ ['--dx' as string]: `${c.dx}px`, ['--dy' as string]: `${c.dy}px`, animationDelay: `${c.d}s` }}>
      <circle cx="184" cy="104" r="9" fill="var(--color-warn)" stroke="var(--color-ink)" strokeWidth="3.5" />
      <path d="M184 99v10" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

const Heart = ({ x, y, r = 1, fill = 'var(--color-accent-deep)' }: { x: number; y: number; r?: number; fill?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${r})`} d="M0 8C-9 2-13-2-13-7a7 7 0 0 1 13-3.5A7 7 0 0 1 13-7C13-2 9 2 0 8Z" fill={fill} />
)

export function InteractiveMascot() {
  const [mood, setMood] = useState<Mood>('idle')
  const [n, setN] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const poke = () => {
    const next = CYCLE[n % CYCLE.length]
    setN(n + 1)
    setMood(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMood('idle'), next === 'sleep' ? 6000 : 4200)
  }

  return (
    <div className="mascot-wrap">
      <button type="button" className="mascot-btn" onClick={poke} aria-label="Dompet maskot. Tekan untuk mengubah ekspresinya.">
        <svg className="mascot" data-mood={mood} viewBox="0 0 240 220" aria-hidden="true" overflow="visible">
          <ellipse className="m-shadow" cx="120" cy="204" rx="78" ry="9" fill="var(--color-ink)" opacity=".12" />
          {/* koin: meledak dari lubang dompet */}
          <g data-m="coins">{COINS.map((_, i) => <Coin key={i} i={i} />)}</g>
          <g className="m-body">
            <rect x="22" y="48" width="196" height="146" rx="46" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="5" />
            <path d="M52 48c10-22 28-30 52-30h46" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
            <rect x="140" y="98" width="88" height="52" rx="26" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="5" />
            <path className="m-heart" d="M184 133c-9-6-14-10.5-14-16.5a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 6-5 10.5-14 16.5Z" fill="var(--color-accent-deep)" />

            {/* mata */}
            <g data-m="idle coins cry">
              <circle cx="78" cy="112" r="9" fill="var(--color-ink)" /><circle cx="108" cy="112" r="9" fill="var(--color-ink)" />
              <circle cx="75.5" cy="108.5" r="3" fill="var(--color-surface)" /><circle cx="105.5" cy="108.5" r="3" fill="var(--color-surface)" />
            </g>
            <g data-m="laugh" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round">
              <path d="M66 116q12-16 24 0" /><path d="M96 116q12-16 24 0" />
            </g>
            <g data-m="sleep" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round">
              <path d="M67 114q11 8 22 0" /><path d="M97 114q11 8 22 0" />
            </g>
            <g data-m="love"><Heart x={78} y={112} r={1.15} /><Heart x={108} y={112} r={1.15} /></g>
            <g data-m="cry" fill="none" stroke="var(--color-ink)" strokeWidth="4.5" strokeLinecap="round">
              <path d="M65 99l23-9" /><path d="M99 90l23 9" />
            </g>

            {/* mulut */}
            <path data-m="idle love" d="M80 138c6 8 22 8 28 0" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
            <g data-m="laugh">
              <path d="M76 132h36c-1 20-9 28-18 28s-17-8-18-28Z" fill="var(--color-ink)" stroke="var(--color-ink)" strokeWidth="4" strokeLinejoin="round" />
              <ellipse cx="94" cy="153" rx="10" ry="5.5" fill="var(--color-accent-deep)" />
            </g>
            <path data-m="cry" d="M80 150c6-10 22-10 28 0" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
            <ellipse data-m="coins" cx="94" cy="142" rx="8" ry="10" fill="var(--color-ink)" />
            <path data-m="sleep" d="M86 142q8 5 16 0" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />

            {/* pipi */}
            <ellipse className="m-cheek" cx="60" cy="132" rx="9" ry="6" fill="var(--color-surface)" />
            <ellipse className="m-cheek" cx="126" cy="132" rx="9" ry="6" fill="var(--color-surface)" />

            {/* air mata */}
            <g data-m="cry">
              <path className="tear t1" d="M76 124c-5 7-6 11-6 14a6 6 0 0 0 12 0c0-3-1-7-6-14Z" fill="var(--color-tear)" stroke="var(--color-ink)" strokeWidth="2.5" />
              <path className="tear t2" d="M110 124c-5 7-6 11-6 14a6 6 0 0 0 12 0c0-3-1-7-6-14Z" fill="var(--color-tear)" stroke="var(--color-ink)" strokeWidth="2.5" />
            </g>
          </g>
          {/* hati melayang */}
          <g data-m="love">
            <g className="float f1"><Heart x={40} y={40} r={0.9} /></g>
            <g className="float f2"><Heart x={120} y={22} r={1.1} fill="var(--color-accent-2)" /></g>
            <g className="float f3"><Heart x={196} y={44} r={0.8} /></g>
          </g>
          {/* zzz */}
          <g data-m="sleep" fontFamily="var(--font-display)" fontWeight="800" fill="var(--color-ink)">
            <text className="float z1" x="150" y="40" fontSize="28">z</text>
            <text className="float z2" x="176" y="22" fontSize="22">z</text>
            <text className="float z3" x="196" y="6" fontSize="16">z</text>
          </g>
        </svg>
      </button>
      <p className="mascot-say" role="status" aria-live="polite" data-mood={mood}>{SAY[mood]}</p>
    </div>
  )
}
