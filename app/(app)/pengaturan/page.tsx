import { TileTitle } from '@/components/TileTitle'
import { Eye, Plus, Sheet, UserRound } from 'lucide-react'
import { getCtx, loadViewers } from '@/lib/data'
import { addViewer, removeViewer, updateName } from '@/lib/actions'
import { LogoutButton } from '@/components/LogoutButton'
import { PageHead } from '@/components/PageHead'
import { SheetSync } from '@/components/SheetSync'
import { sheetsEnabled } from '@/lib/sheets'
import { ActionButton, QuickForm, Submit } from '@/components/Fields'

export const metadata = { title: 'Pengaturan' }

export default async function Pengaturan() {
  const ctx = await getCtx()
  const viewers = await loadViewers()
  const mine = ctx.owners.find((o) => o.id === ctx.userId)
  return (
    <>
      <PageHead ctx={ctx} title="Pengaturan" month={false} />
      <div className="bento">
        <section className="tile s6" style={{ ['--i' as string]: 0 }} aria-labelledby="h-akun">
          <div className="tile-head"><TileTitle id="h-akun" icon={UserRound}>Akunku</TileTitle></div>
          <QuickForm action={updateName} className="stack" resetOnDone={false}>
            <label className="field"><span>Nama panggilan</span><input className="input" name="nama" defaultValue={mine?.nama ?? ''} required maxLength={40} /></label>
            <p className="hint">Masuk sebagai {ctx.email}</p>
            <div className="cluster"><Submit className="btn small">Simpan nama</Submit></div>
          </QuickForm>
          <div style={{ marginTop: 'var(--space-4)' }}><LogoutButton /></div>
        </section>

        <section className="tile s6" style={{ ['--i' as string]: 1 }} aria-labelledby="h-pantau">
          <div className="tile-head"><TileTitle id="h-pantau" icon={Eye}>Boleh dipantau oleh</TileTitle></div>
          <p className="hint" style={{ marginBottom: 'var(--space-4)' }}>Orang di daftar ini bisa melihat semua datamu setelah masuk dengan email tersebut, tapi tidak bisa mengubahnya.</p>
          {viewers.length ? (
            <ul className="rows">
              {viewers.map((v) => (
                <li key={v}><span className="grow name">{v}</span><ActionButton action={removeViewer} args={[v]} label={`Cabut akses ${v}`} /></li>
              ))}
            </ul>
          ) : <p className="hint">Belum ada.</p>}
          <QuickForm action={addViewer} className="cluster" >
            <input className="input" style={{ flex: '1 1 12rem' }} type="email" name="email" required placeholder="email pasangan" aria-label="Email pemantau" />
            <Submit className="btn small"><Plus aria-hidden /> Beri akses</Submit>
          </QuickForm>
        </section>
        <section className="tile s12" style={{ ['--i' as string]: 2 }} aria-labelledby="h-sheet">
          <div className="tile-head"><TileTitle id="h-sheet" icon={Sheet}>Google Sheet untuk audit</TileTitle></div>
          {ctx.canEdit
            ? <SheetSync enabled={sheetsEnabled()} sheetUrl={process.env.NEXT_PUBLIC_SHEET_URL} />
            : <p className="hint">Hanya pemilik data yang bisa mengatur sinkron Google Sheet.</p>}
        </section>
      </div>
    </>
  )
}
