'use client'
import { useTransition } from 'react'
import { setViewAs } from '@/lib/actions'

export function OwnerSwitch({ owners, current, me }: { owners: { id: string; nama: string }[]; current: string; me: string }) {
  const [pending, start] = useTransition()
  if (owners.length < 2) return null
  return (
    <label className="field">
      <span className="hint">Lihat data</span>
      <select className="select" value={current} disabled={pending} onChange={(e) => start(() => setViewAs(e.target.value))}>
        {owners.map((o) => <option key={o.id} value={o.id}>{o.id === me ? `${o.nama} (saya)` : o.nama}</option>)}
      </select>
    </label>
  )
}
