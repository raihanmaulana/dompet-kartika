'use client'
import { useMemo, useState } from 'react'
import { futureValue, INSTRUMENTS, rp } from '@/lib/calc'

const fmt = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const num = (v: string) => Number(v.replace(/\D/g, '')) || 0
const COLORS = ['var(--color-ok)', 'var(--color-warn)', 'var(--color-accent-2)', 'var(--color-accent-deep)']

export function Simulator({ monthly }: { monthly: number }) {
  const [m, setM] = useState(fmt(String(monthly || 500000)))
  const [years, setYears] = useState(5)
  const [rates, setRates] = useState(INSTRUMENTS.map((i) => String(+(i.rate * 100).toFixed(2))))
  const amount = num(m)

  const rows = useMemo(() => INSTRUMENTS.map((ins, i) => {
    const r = Math.max(0, Math.min(40, Number(rates[i].replace(',', '.')) || 0)) / 100
    return { ...ins, r, fv: futureValue(amount, r, years) }
  }), [amount, years, rates])
  const modal = amount * years * 12
  const max = Math.max(modal, ...rows.map((r) => r.fv), 1)

  // garis pertumbuhan per tahun
  const W = 640, H = 240, P = 28
  const x = (t: number) => P + (t / years) * (W - P * 2)
  const y = (v: number) => H - P - (v / max) * (H - P * 2)
  const path = (f: (t: number) => number) => Array.from({ length: years + 1 }, (_, t) => `${t ? 'L' : 'M'}${x(t).toFixed(1)} ${y(f(t)).toFixed(1)}`).join(' ')

  return (
    <div className="stack" style={{ gap: 'var(--space-6)' }}>
      <div className="form-grid">
        <label className="field"><span>Disetor tiap bulan</span>
          <div className="pre"><em aria-hidden>Rp</em><input className="input money" inputMode="numeric" value={m} onChange={(e) => setM(fmt(e.target.value))} aria-label="Setoran per bulan" /></div>
        </label>
        <label className="field"><span>Lama: <b>{years} tahun</b></span>
          <input type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} aria-label="Lama investasi (tahun)" style={{ accentColor: 'var(--color-accent-deep)', minHeight: 46 }} />
        </label>
      </div>

      <figure style={{ margin: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Perkiraan pertumbuhan setoran ${rp(amount)} per bulan selama ${years} tahun`}>
          <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--color-rule)" strokeWidth="1.5" />
          <path d={path((t) => amount * 12 * t)} fill="none" stroke="var(--color-muted)" strokeWidth="2.5" strokeDasharray="6 6" />
          {rows.map((r, i) => <path key={r.key} d={path((t) => futureValue(amount, r.r, t))} fill="none" stroke={COLORS[i]} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />)}
          <text x={P} y={H - 6} fontSize="12" fill="var(--color-muted)">Sekarang</text>
          <text x={W - P} y={H - 6} fontSize="12" fill="var(--color-muted)" textAnchor="end">{years} tahun</text>
        </svg>
        <figcaption className="hint" style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <span>Garis putus-putus: hanya ditabung, tanpa hasil <b>{rp(modal)}</b></span>
        </figcaption>
      </figure>

      <ul className="rows">
        {rows.map((r, i) => (
          <li key={r.key} className="row wrap">
            <span style={{ width: 14, height: 14, borderRadius: 99, background: COLORS[i], flex: 'none' }} aria-hidden />
            <span className="grow" style={{ minWidth: '11rem' }}><span className="name">{r.label}</span><span className="meta">Risiko {r.risk.toLowerCase()}</span></span>
            <label className="field" style={{ width: '6.5rem' }}>
              <span className="sr">Asumsi imbal hasil per tahun {r.label}</span>
              <div className="pre"><input className="input money" style={{ paddingLeft: 12, paddingRight: 30 }} inputMode="decimal" value={rates[i]}
                onChange={(e) => setRates(rates.map((x, j) => (j === i ? e.target.value.replace(/[^\d.,]/g, '') : x)))} aria-label={`Imbal hasil ${r.label}, persen per tahun`} />
                <em style={{ left: 'auto', right: 12 }}>%</em></div>
            </label>
            <span style={{ textAlign: 'right', minWidth: '9rem' }}><span className="amt">{rp(r.fv)}</span><span className="meta" style={{ display: 'block' }}>+{rp(Math.max(0, r.fv - modal))} dari hasil</span></span>
          </li>
        ))}
      </ul>
      <p className="hint">Ini hitungan sederhana dari asumsi yang bisa kamu ubah, bukan janji hasil. Nilai investasi bisa naik dan turun, terutama reksa dana saham. Pajak dan biaya belum dihitung.</p>
    </div>
  )
}
