import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/figtree'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Dompet Kartika', template: '%s · Dompet Kartika' },
  description: 'Catat pengeluaran, atur anggaran, tagihan, dan tabungan per bulan.',
}
export const viewport: Viewport = { themeColor: '#fbeff1', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
