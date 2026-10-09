import { TileTitle } from '@/components/TileTitle'
import { Eye, Plus, UserRound } from 'lucide-react'
import { getCtx, loadViewers } from '@/lib/data'
import { addViewer, removeViewer, updateName } from '@/lib/actions'
import { signOut } from '@/lib/auth-actions'
import { PageHead } from '@/components/PageHead'
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
          <form action={signOut} style={{ marginTop: 'var(--space-4)' }}><button className="btn ghost small" type="submit">Keluar</button></form>
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
      </div>
    </>
  )
}
