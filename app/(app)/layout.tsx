import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { getCtx } from '@/lib/data'
import { signOut } from '@/lib/auth-actions'
import { RailNav, TabBar } from '@/components/Nav'
import { OwnerSwitch } from '@/components/OwnerSwitch'
import { Mark } from '@/components/Mark'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx()
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="brand" aria-label="Dompet Kartika, ke beranda">
          <Mark />
          <span><b>dompet kartika</b><small>uang bulanan, rapi</small></span>
        </Link>
        <RailNav />
        <div className="rail-foot">
          <OwnerSwitch owners={ctx.owners} current={ctx.ownerId} me={ctx.userId} />
          <div className="who"><strong>{ctx.owners.find((o) => o.id === ctx.userId)?.nama}</strong>{ctx.email}</div>
          <form action={signOut}><button className="btn ghost small full" type="submit"><LogOut aria-hidden /> Keluar</button></form>
        </div>
      </aside>
      <div>
        <main className="main" id="isi">
          <div className="mobile-head">
            <Link href="/" className="brand" aria-label="Beranda"><Mark /><span><b>dompet kartika</b></span></Link>
            <OwnerSwitch owners={ctx.owners} current={ctx.ownerId} me={ctx.userId} />
          </div>
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  )
}
