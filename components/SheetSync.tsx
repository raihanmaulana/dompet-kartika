'use client'
import { useActionState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { syncAll, type SyncState } from '@/lib/actions'
import { useBusyFlag } from './Busy'

export function SheetSync({ enabled, sheetUrl }: { enabled: boolean; sheetUrl?: string }) {
  const [st, act, pending] = useActionState<SyncState, FormData>(syncAll, null)
  useBusyFlag(pending)
  return (
    <div className="stack">
      <p className="hint">
        {enabled
          ? 'Tersambung. Setiap perubahan di aplikasi otomatis disalin ke Google Sheet (satu arah) lengkap dengan log perubahan untuk audit.'
          : 'Belum tersambung. Ikuti langkah di berkas google-apps-script/Code.gs, lalu isi SHEETS_WEBHOOK_URL dan SHEETS_WEBHOOK_SECRET di Vercel.'}
      </p>
      <div className="cluster">
        <form action={act}>
          <button type="submit" className="btn small" disabled={!enabled || pending} aria-busy={pending}>
            <RefreshCw aria-hidden /> {pending ? 'Mengirim…' : 'Sinkronkan semua sekarang'}
          </button>
        </form>
        {sheetUrl ? <a className="btn small ghost" href={sheetUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden /> Buka Google Sheet</a> : null}
      </div>
      {st ? <p className={`form-msg ${st.ok ? 'info' : 'err'}`} role="status">{st.message}</p> : null}
      <p className="hint">Gunakan tombol ini saat pertama tersambung (untuk memasukkan data lama) atau jika Sheet terasa tertinggal.</p>
    </div>
  )
}
