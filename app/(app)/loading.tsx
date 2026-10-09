import { Loader } from '@/components/Loader'
import { PageProgress } from '@/components/Progress'

export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-label="Sedang memuat">
      <div className="busy-card" style={{ boxShadow: 'none' }}>
        <Loader />
        <PageProgress />
      </div>
    </div>
  )
}
