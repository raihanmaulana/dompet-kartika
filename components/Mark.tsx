// Logo + maskot dompet: digambar tangan (SVG), semua warna lewat token.
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="5" y="12" width="38" height="28" rx="10" fill="var(--color-accent)" />
      <path d="M9 17c0-3 2.4-5 5.4-5H33" fill="none" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="27" y="22" width="16" height="10" rx="5" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="2.4" />
      <path d="M33.2 28.4c-1.7-1.1-2.6-1.9-2.6-3a1.5 1.5 0 0 1 2.6-.9 1.5 1.5 0 0 1 2.6.9c0 1.1-.9 1.9-2.6 3Z" fill="var(--color-accent-deep)" />
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
