'use client'
import { useBusyTransition } from './Busy'

const KINDS = [['bank', 'Bank'], ['ewallet', 'E-wallet'], ['tunai', 'Tunai'], ['lainnya', 'Lainnya']] as const

/** Ganti jenis sumber dana (bank / e-wallet / tunai) langsung dari kartunya. */
export function KindSelect({ id, value, action }: { id: string; value: string; action: (id: string, field: any, value: string) => Promise<void> }) {
  const [pending, start] = useBusyTransition()
  return (
    <select className="select pocket-inline" aria-label="Jenis sumber dana" aria-busy={pending} disabled={pending} value={value}
      onChange={(e) => { const v = e.target.value; start(() => action(id, 'kind', v)) }}>
      {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  )
}
