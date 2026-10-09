import Link from 'next/link'
import { getCtx } from '@/lib/data'
import { LogoutButton } from '@/components/LogoutButton'
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
          <LogoutButton className="btn ghost small full" icon />
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
