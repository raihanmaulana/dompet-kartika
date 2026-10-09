import type { LucideIcon } from 'lucide-react'

/** Judul kartu dengan lencana ikon, supaya tiap kartu mudah dibedakan sekilas. */
export function TileTitle({ id, icon: Icon, children }: { id?: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="tile-title" id={id}>
      <span className="badge" aria-hidden><Icon size={18} strokeWidth={2.3} /></span>
      <span>{children}</span>
    </h2>
  )
}
