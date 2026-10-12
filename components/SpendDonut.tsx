import { rp } from '@/lib/calc'

export type Slice = { key: string; name: string; amount: number; count: number }

/** Donat pengeluaran per kategori + wajah kecil yang ikut senang / khawatir. Murni SVG, tanpa library. */
export function SpendDonut({ slices, total, over }: { slices: Slice[]; total: number; over: boolean }) {
  const R = 15.9155 // keliling = 100 sehingga persen = panjang garis
  let acc = 0
  const parts = slices.map((s, i) => {
    const p = total > 0 ? (s.amount / total) * 100 : 0
    const seg = { ...s, p, start: acc, color: s.key === '__none' ? 'var(--chart-none)' : `var(--chart-${(i % 7) + 1})` }
    acc += p
    return seg
  })
  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 42 42" role="img" aria-label={`Pengeluaran per kategori, total ${rp(total)}`}>
          <circle className="d-bg" cx="21" cy="21" r={R} fill="none" strokeWidth="5.2" />
          {parts.map((s) => (
            <circle key={s.key} className="d-seg" cx="21" cy="21" r={R} fill="none" stroke={s.color} strokeWidth="5.2"
              strokeDasharray={`${Math.max(0, s.p - (parts.length > 1 ? 0.7 : 0))} ${100 - Math.max(0, s.p - (parts.length > 1 ? 0.7 : 0))}`}
              strokeDashoffset={25 - s.start} strokeLinecap="butt">
              <title>{`${s.name}: ${rp(s.amount)} (${Math.round(s.p)}%) · ${s.count} transaksi`}</title>
            </circle>
          ))}
        </svg>
        <div className="d-center">
          <svg viewBox="0 0 32 32" width="48" height="48" aria-hidden className="d-face">
            <circle cx="16" cy="16" r="14" className="d-face-bg" />
            <circle cx="11" cy="14" r="1.7" className="d-face-ink" /><circle cx="21" cy="14" r="1.7" className="d-face-ink" />
            <ellipse cx="7.5" cy="19" rx="2.3" ry="1.5" className="d-face-blush" /><ellipse cx="24.5" cy="19" rx="2.3" ry="1.5" className="d-face-blush" />
            {over ? <path d="M11.5 23 Q16 19 20.5 23" className="d-face-mouth" /> : <path d="M11.5 20 Q16 25.5 20.5 20" className="d-face-mouth" />}
          </svg>
          <b>{rp(total)}</b>
          <span>sudah keluar</span>
        </div>
      </div>
      <ul className="d-legend">
        {parts.map((s) => (
          <li key={s.key}>
            <i style={{ background: s.color }} aria-hidden />
            <span className="grow"><span className="name">{s.name}</span><span className="meta">{s.count} transaksi · {Math.round(s.p)}%</span></span>
            <span className="amt">{rp(s.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
