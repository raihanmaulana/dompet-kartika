'use client'
import { useState } from 'react'
import { MoneyInput } from './Fields'

/** Pilihan jenis + kolom minimum bayar yang hanya muncul untuk kartu kredit. */
export function BillKindFields() {
  const [kind, setKind] = useState('tagihan')
  return (
    <>
      <label className="field"><span>Jenis</span>
        <select className="select" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="tagihan">Tagihan rutin</option><option value="cicilan">Cicilan</option>
          <option value="hutang">Hutang</option><option value="kartu">Kartu kredit</option>
        </select>
      </label>
      <label className="field"><span>{kind === 'kartu' ? 'Tagihan bulan ini' : 'Per bulan'}</span><MoneyInput name="amount" label="Nominal" required /></label>
      {kind === 'kartu' ? (
        <label className="field full"><span>Pembayaran minimum</span>
          <MoneyInput name="min_payment" label="Pembayaran minimum kartu kredit" />
          <small className="hint">Bayar di bawah ini bisa kena denda telat. Tagihan tiap bulan bisa diubah di daftar.</small>
        </label>
      ) : null}
    </>
  )
}
