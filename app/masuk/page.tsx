import { AuthForm } from '@/components/AuthForm'
import { InteractiveMascot } from '@/components/InteractiveMascot'

export const metadata = { title: 'Masuk' }

export default function Masuk() {
  return (
    <div className="auth">
      <section className="auth-art" aria-label="Tentang Dompet Kartika">
        <InteractiveMascot />
        <div className="stack" style={{ gap: 'var(--space-5)' }}>
          <h1>Uang bulanan, rapi tiap bulan.</h1>
          <p>Catat jajan hari ini, lihat sisa jatah, dan pastikan cicilan serta hutang tidak diam-diam menggerogoti tabungan.</p>
        </div>
      </section>
      <section className="auth-form"><AuthForm /></section>
    </div>
  )
}
