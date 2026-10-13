'use client'
import { useBusyTransition } from './Busy'
import { useToast } from './Toast'

const KINDS = [['bank', 'Bank'], ['ewallet', 'E-wallet'], ['tunai', 'Tunai'], ['lainnya', 'Lainnya']] as const

/** Ganti jenis sumber dana (bank / e-wallet / tunai) langsung dari kartunya. */
export function KindSelect({ id, value, action }: { id: string; value: string; action: (id: string, field: any, value: string) => Promise<void> }) {
  const [pending, start] = useBusyTransition()
  const toast = useToast()
  return (
    <select className="select pocket-inline" aria-label="Jenis sumber dana" aria-busy={pending} disabled={pending} value={value}
      onChange={(e) => { const v = e.target.value; start(async () => { await action(id, 'kind', v); toast('Jenis diperbarui') }) }}>
      {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  )
}
