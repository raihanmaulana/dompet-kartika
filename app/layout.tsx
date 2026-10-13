import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/figtree'
import './globals.css'
import { BusyProvider } from '@/components/Busy'
import { ToastProvider } from '@/components/Toast'
import { PwaRegister } from '@/components/PwaRegister'

export const metadata: Metadata = {
  title: { default: 'Wallet Together', template: '%s · Wallet Together' },
  description: 'Catat pengeluaran, atur anggaran, tagihan, dan tabungan per bulan.',
  appleWebApp: { capable: true, title: 'Wallet Together', statusBarStyle: 'default' },
  icons: { apple: '/apple-touch-icon.png' },
}
export const viewport: Viewport = { themeColor: '#fbeff1', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body><BusyProvider><ToastProvider>{children}</ToastProvider><PwaRegister /></BusyProvider></body>
    </html>
  )
}
