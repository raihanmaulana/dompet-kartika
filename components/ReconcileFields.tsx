'use client'
import { useState } from 'react'
import { rp } from '@/lib/calc'

/** Isian "saldo sebenarnya" dengan selisih yang langsung terlihat. */
export function ReconcileFields({ id, current }: { id: string; current: number }) {
  const [v, setV] = useState('')
  const neg = v.trim().startsWith('-')
  const digits = Number(v.replace(/\D/g, ''))
  const has = /\d/.test(v)
  const actual = (neg ? -1 : 1) * digits
  const diff = actual - current
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <p className="field full" style={{ margin: 0 }}>Saldo di aplikasi sekarang: <b>{rp(current)}</b></p>
      <label className="field full"><span>Saldo yang sebenarnya (cek di m-banking / e-wallet)</span>
        <div className="pre"><em aria-hidden>Rp</em>
          <input className="input money" name="actual" inputMode="text" autoComplete="off" aria-label="Saldo yang sebenarnya" placeholder="0" value={v}
            onChange={(e) => { const raw = e.target.value; const n = raw.trim().startsWith('-'); const d = raw.replace(/\D/g, ''); setV(d || n ? `${n ? '-' : ''}${d ? Number(d).toLocaleString('id-ID') : ''}` : '') }} />
        </div>
      </label>
      {has ? (
        <p className={`form-msg ${diff === 0 ? 'info' : 'warn'} field full`} role="status" style={{ margin: 0 }}>
          {diff === 0 ? 'Sudah sama, tidak ada yang perlu disesuaikan.' : `Akan dicatat penyesuaian ${diff > 0 ? '+' : '−'}${rp(Math.abs(diff))} supaya saldonya cocok.`}
        </p>
      ) : null}
      <label className="field full"><span>Catatan (opsional)</span><input className="input" name="note" maxLength={80} placeholder="mis. selisih biaya admin" /></label>
    </>
  )
}
