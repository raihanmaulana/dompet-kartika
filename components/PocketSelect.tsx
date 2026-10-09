import type { Pocket } from '@/lib/types'

/** Pilihan sumber dana di formulir. Tidak tampil kalau belum ada sumber dana. */
export function PocketSelect({ pockets, label = 'Sumber dana', name = 'pocket_id', full = false }: { pockets: Pocket[]; label?: string; name?: string; full?: boolean }) {
  if (!pockets.length) return null
  return (
    <label className={`field${full ? ' full' : ''}`}><span>{label}</span>
      <select className="select" name={name} defaultValue="">
        <option value="">Tanpa sumber dana</option>
        {pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
  )
}
