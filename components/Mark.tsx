// Logo + maskot dompet: digambar tangan (SVG), semua warna lewat token.
export function Mark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg className={`${className ?? ''} ${animated ? 'hop' : ''}`} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="39" cy="9" r="5.5" fill="var(--color-warn)" stroke="var(--color-ink)" strokeWidth="2.2" />
      <rect x="4" y="8" width="40" height="36" rx="13" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="2.4" />
      <path d="M10 18l4.2 15 4.8-10.5L23.800 33 28 18" fill="none" stroke="var(--color-ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29.500 18H41M35.300 18v15.500" fill="none" stroke="var(--color-surface)" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  )
}

export function Mascot({ className }: { className?: string }) {
  return (
    <svg className={`mascot ${className ?? ''}`} viewBox="0 0 240 220" aria-hidden="true">
      <ellipse cx="120" cy="204" rx="78" ry="9" fill="var(--color-ink)" opacity=".1" />
      <rect x="22" y="48" width="196" height="146" rx="46" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="5" />
      <path d="M52 48c10-22 28-30 52-30h46" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
      <rect x="140" y="98" width="88" height="52" rx="26" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="5" />
      <path d="M184 133c-9-6-14-10.5-14-16.5a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 6-5 10.5-14 16.5Z" fill="var(--color-accent-deep)" />
      <circle cx="78" cy="112" r="9" fill="var(--color-ink)" />
      <circle cx="108" cy="112" r="9" fill="var(--color-ink)" />
      <circle cx="75.5" cy="108.5" r="3" fill="var(--color-surface)" />
      <circle cx="105.5" cy="108.5" r="3" fill="var(--color-surface)" />
      <path d="M80 138c6 8 22 8 28 0" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="60" cy="132" rx="9" ry="6" fill="var(--color-surface)" opacity=".7" />
      <ellipse cx="126" cy="132" rx="9" ry="6" fill="var(--color-surface)" opacity=".7" />
    </svg>
  )
}
