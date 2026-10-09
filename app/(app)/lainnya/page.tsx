import Link from 'next/link'
import { PiggyBank, TrendingUp, Settings, LogOut, Landmark } from 'lucide-react'
import { getCtx } from '@/lib/data'
import { LogoutButton } from '@/components/LogoutButton'
import { PageHead } from '@/components/PageHead'

export default async function Lainnya() {
  const ctx = await getCtx()
  const links = [
    { href: '/tabungan', label: 'Tabungan & dana darurat', Icon: PiggyBank },
    { href: '/sumber-dana', label: 'Sumber dana (bank, e-wallet)', Icon: Landmark },
    { href: '/investasi', label: 'Simulasi investasi', Icon: TrendingUp },
    { href: '/pengaturan', label: 'Pengaturan & akses pasangan', Icon: Settings },
  ]
  return (
    <>
      <PageHead ctx={ctx} title="Menu" month={false} />
      <div className="bento">
        <section className="tile s12" style={{ ['--i' as string]: 0 }}>
          <ul className="rows">
            {links.map(({ href, label, Icon }) => (
              <li key={href}><Icon aria-hidden size={20} /><Link href={href} className="grow name" style={{ textDecoration: 'none' }}>{label}</Link></li>
            ))}
            <li><LogOut aria-hidden size={20} />
              <span className="grow"><LogoutButton /></span>
            </li>
          </ul>
        </section>
      </div>
    </>
  )
}
