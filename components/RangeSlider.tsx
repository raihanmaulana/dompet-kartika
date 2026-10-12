'use client'

/** Slider dua pegangan (dari – sampai). Dua <input type="range"> ditumpuk; hanya pegangannya yang bisa disentuh. */
export function RangeSlider({ min, max, step = 1, value, onChange, label, format }: {
  min: number; max: number; step?: number; value: [number, number]; onChange: (v: [number, number]) => void; label: string; format: (n: number) => string
}) {
  const span = Math.max(1, max - min)
  const pct = (n: number) => ((n - min) / span) * 100
  return (
    <div className="rs" role="group" aria-label={label}>
      <div className="rs-track" aria-hidden><i style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }} /></div>
      <input type="range" min={min} max={max} step={step} value={value[0]} aria-label={`${label}, dari`} aria-valuetext={format(value[0])}
        onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])} />
      <input type="range" min={min} max={max} step={step} value={value[1]} aria-label={`${label}, sampai`} aria-valuetext={format(value[1])}
        onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])} />
    </div>
  )
}
