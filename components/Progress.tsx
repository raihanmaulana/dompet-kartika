'use client'
import { useEffect, useState } from 'react'
import { stageLine } from './Loader'

/** Judul lucu + bar kemajuan + angka persen yang merayap (dipakai saat pindah halaman). */
export function PageProgress() {
  const [pct, setPct] = useState(8)
  useEffect(() => {
    const t = setInterval(() => setPct((p) => Math.min(92, p + Math.max(0.4, (92 - p) * 0.07))), 90)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <p>{stageLine(pct)}</p>
      <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Kemajuan">
        <div className="prog-track"><i style={{ width: `${pct}%` }} /></div>
        <span className="prog-coin" style={{ left: `${pct}%` }} aria-hidden="true" />
      </div>
      <b className="prog-num">{Math.round(pct)}%</b>
    </>
  )
}
