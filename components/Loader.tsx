/** Dompet lucu yang melompat sambil menangkap koin. Dipakai di popup loading. */
export function Loader({ className = '' }: { className?: string }) {
  return (
    <svg className={`loader ${className}`} viewBox="0 0 112 112" aria-hidden="true">
      <ellipse className="shadow" cx="56" cy="104" rx="30" ry="5" fill="var(--color-ink)" opacity=".16" />
      <g className="coin c1"><circle cx="40" cy="30" r="7" fill="var(--color-warn)" stroke="var(--color-ink)" strokeWidth="2.4" /><path d="M40 26v8" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" /></g>
      <g className="coin c2"><circle cx="58" cy="26" r="7" fill="var(--color-warn)" stroke="var(--color-ink)" strokeWidth="2.4" /><path d="M58 22v8" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" /></g>
      <g className="coin c3"><circle cx="76" cy="31" r="7" fill="var(--color-warn)" stroke="var(--color-ink)" strokeWidth="2.4" /><path d="M76 27v8" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" /></g>
      <g className="body">
        <rect x="12" y="46" width="88" height="52" rx="22" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="3" />
        <path d="M24 46c4-9 12-13 22-13h20" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
        <rect x="68" y="63" width="40" height="22" rx="11" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="3" />
        <path className="heart" d="M88 80c-4.2-2.8-6.5-4.8-6.5-7.4a3.6 3.6 0 0 1 6.5-2.1 3.6 3.6 0 0 1 6.5 2.1c0 2.6-2.3 4.6-6.5 7.4Z" fill="var(--color-accent-deep)" />
        <circle cx="36" cy="68" r="4.2" fill="var(--color-ink)" />
        <circle cx="52" cy="68" r="4.2" fill="var(--color-ink)" />
        <path d="M38 79c3 4 11 4 14 0" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="27" cy="77" rx="4.5" ry="3" fill="var(--color-surface)" opacity=".7" />
        <ellipse cx="61" cy="77" rx="4.5" ry="3" fill="var(--color-surface)" opacity=".7" />
      </g>
    </svg>
  )
}

export const LOADING_LINES = [
  'Menghitung uang receh…',
  'Merapikan dompet…',
  'Menyusun koin satu-satu…',
  'Mengintip sisa jatah…',
  'Sebentar, lagi disimpan…',
]
