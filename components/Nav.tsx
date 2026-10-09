'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, NotebookPen, Receipt, PieChart, PiggyBank, TrendingUp, Settings, LayoutGrid, Landmark } from 'lucide-react'

const ITEMS = [
  { href: '/', label: 'Beranda', Icon: Home },
  { href: '/catatan', label: 'Catatan', Icon: NotebookPen },
  { href: '/tagihan', label: 'Tagihan', Icon: Receipt },
  { href: '/anggaran', label: 'Anggaran', Icon: PieChart },
  { href: '/tabungan', label: 'Tabungan', Icon: PiggyBank },
  { href: '/sumber-dana', label: 'Sumber dana', Icon: Landmark },
  { href: '/investasi', label: 'Investasi', Icon: TrendingUp },
  { href: '/pengaturan', label: 'Pengaturan', Icon: Settings },
]
const MORE = ['/lainnya', '/tabungan', '/sumber-dana', '/investasi', '/pengaturan']

const is = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'))

export function RailNav() {
  const path = usePathname()
  return (
    <nav className="nav" aria-label="Menu utama">
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={is(path, href) ? 'page' : undefined}>
          <Icon aria-hidden strokeWidth={2.2} />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function TabBar() {
  const path = usePathname()
  const main = ITEMS.slice(0, 4)
  return (
    <nav className="tabbar" aria-label="Menu utama">
      {main.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={is(path, href) ? 'page' : undefined}>
          <Icon aria-hidden strokeWidth={2.2} />
          {label}
        </Link>
      ))}
      <Link href="/lainnya" aria-current={MORE.some((m) => is(path, m)) ? 'page' : undefined}>
        <LayoutGrid aria-hidden strokeWidth={2.2} />
        Menu
      </Link>
    </nav>
  )
}
