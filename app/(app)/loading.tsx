import { Loader, LOADING_LINES } from '@/components/Loader'

export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-label="Sedang memuat">
      <div className="busy-card" style={{ boxShadow: 'none' }}>
        <Loader />
        <p>{LOADING_LINES[0]}</p>
      </div>
    </div>
  )
}
