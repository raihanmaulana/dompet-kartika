'use client'
import { useBusyTransition } from './Busy'
import { useToast } from './Toast'
import type { Pocket } from '@/lib/types'

/** Pilihan sumber dana langsung di baris (menyimpan begitu dipilih). */
export function PocketInline({ table, id, value, pockets, action }: {
  table: string; id: string; value?: string | null; pockets: Pocket[]
  action: (table: any, id: string, field: string, value: string) => Promise<void>
}) {
  const [pending, start] = useBusyTransition()
  const toast = useToast()
  return (
    <select className="select pocket-inline" aria-label="Sumber dana" aria-busy={pending} disabled={pending} value={value ?? ''}
      onChange={(e) => { const v = e.target.value; start(async () => { await action(table, id, 'pocket', v); toast('Sumber dana diperbarui') }) }}>
      <option value="">Tanpa sumber dana</option>
      {pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )
}
