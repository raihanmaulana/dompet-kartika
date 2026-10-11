'use client'
import { useBusyTransition } from './Busy'
import type { Pocket } from '@/lib/types'

/** Pilihan sumber dana langsung di baris (menyimpan begitu dipilih). */
export function PocketInline({ table, id, value, pockets, action }: {
  table: string; id: string; value?: string | null; pockets: Pocket[]
  action: (table: any, id: string, field: string, value: string) => Promise<void>
}) {
  const [pending, start] = useBusyTransition()
  return (
    <select className="select pocket-inline" aria-label="Sumber dana" aria-busy={pending} disabled={pending} value={value ?? ''}
      onChange={(e) => { const v = e.target.value; start(() => action(table, id, 'pocket', v)) }}>
      <option value="">Tanpa sumber dana</option>
      {pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )
}
