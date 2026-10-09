import { ArrowLeftRight, Banknote, Landmark, Plus, Smartphone, Wallet, History, Coins } from 'lucide-react'
import { TileTitle } from '@/components/TileTitle'
import { getCtx, loadPockets } from '@/lib/data'
import { rp } from '@/lib/calc'
import { addPocket, addTransfer, deletePocket, deleteTransfer, updatePocket } from '@/lib/actions'
import { PageHead } from '@/components/PageHead'
import { ActionButton, InlineField, MoneyInput, QuickForm, Submit } from '@/components/Fields'
import { ConfirmButton } from '@/components/ConfirmButton'
import type { PocketKind } from '@/lib/types'

export const metadata = { title: 'Sumber dana' }

const KIND: Record<PocketKind, { label: string; Icon: typeof Wallet }> = {
  bank: { label: 'Bank', Icon: Landmark }, ewallet: { label: 'E-wallet', Icon: Smartphone },
  tunai: { label: 'Tunai', Icon: Banknote }, lainnya: { label: 'Lainnya', Icon: Wallet },
}
const tgl = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export default async function SumberDana() {
  const ctx = await getCtx()
  const { pockets, transfers } = await loadPockets(ctx)
  const ro = !ctx.canEdit
  const total = pockets.reduce((t, p) => t + p.saldo, 0)
  const name = (id: string) => pockets.find((p) => p.id === id)?.name ?? 'Sumber dihapus'
  let i = 0

  return (
    <>
      <PageHead ctx={ctx} title="Sumber dana" sub="Bank, e-wallet, dan tunai. Saldo dihitung dari catatan yang memilih sumber ini." month={false} />
      <div className="bento">
        <section className="tile col blush s5" style={{ ['--i' as string]: i++ }} aria-labelledby="h-total">
          <p className="kicker" id="h-total">Total semua sumber dana</p>
          <p className="big" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 3rem)', whiteSpace: 'nowrap' }}>{rp(total)}</p>
          <p className="sub">
            {pockets.length ? `${pockets.length} sumber dana.` : 'Belum ada sumber dana.'} Pemasukan, catatan pengeluaran, dan setoran tabungan yang memilih sumber dana ikut dihitung.
            Yang dibiarkan tanpa sumber dana tidak mengubah saldo mana pun.
          </p>
        </section>

        {!ro && pockets.length > 1 ? (
          <section className="tile s7" style={{ ['--i' as string]: i++ }} aria-labelledby="h-pindah">
            <div className="tile-head"><TileTitle id="h-pindah" icon={ArrowLeftRight}>Pindah dana</TileTitle></div>
            <p className="hint" style={{ marginBottom: 'var(--space-3)' }}>Biaya admin ikut dikurangkan dari sumber asal dan otomatis tercatat sebagai pengeluaran di Catatan.</p>
            <QuickForm action={addTransfer} className="stack">
              <div className="form-grid">
                <label className="field"><span>Dari</span>
                  <select className="select" name="from_pocket" defaultValue={pockets[0].id} required>{pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </label>
                <label className="field"><span>Ke</span>
                  <select className="select" name="to_pocket" defaultValue={pockets[1].id} required>{pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </label>
                <label className="field"><span>Jumlah</span><MoneyInput name="amount" label="Jumlah dipindah" required /></label>
                <label className="field"><span>Tanggal</span><input className="input" type="date" name="moved_on" defaultValue={ctx.today.iso} required /></label>
                <label className="field"><span>Biaya admin (opsional)</span><MoneyInput name="fee" label="Biaya admin" /></label>
                <label className="field"><span>Catatan</span><input className="input" name="note" maxLength={80} placeholder="mis. isi saldo GoPay" /></label>
              </div>
              <Submit className="btn"><ArrowLeftRight aria-hidden /> Pindahkan</Submit>
            </QuickForm>
          </section>
        ) : null}

        {pockets.map((p) => {
          const { label, Icon } = KIND[p.kind] ?? KIND.lainnya
          return (
            <section key={p.id} className="tile s4" style={{ ['--i' as string]: i++ }} aria-labelledby={`p-${p.id}`}>
              <div className="tile-head">
                <TileTitle id={`p-${p.id}`} icon={Icon}>{p.name}</TileTitle>
                <span className="chip">{label}</span>
              </div>
              <p className="big" style={{ fontSize: '2.1rem' }}>{rp(p.saldo)}</p>
              {p.saldo < 0 ? <p className="hint" style={{ color: 'var(--color-over)' }}>Saldo minus. Cek lagi catatan atau saldo awalnya.</p> : null}
              <div className="row" style={{ border: 0, padding: 0, marginTop: 'var(--space-3)' }}>
                <span className="grow hint" style={{ whiteSpace: 'nowrap' }}>Saldo awal</span>
                <span style={{ width: '10rem' }}><InlineField id={p.id} field="opening_balance" value={p.opening_balance} money action={updatePocket} label={`Saldo awal ${p.name}`} disabled={ro} /></span>
              </div>
              {!ro ? (
                <>
                  <div className="row" style={{ border: 0, padding: 0 }}>
                    <span className="grow hint" style={{ whiteSpace: 'nowrap' }}>Nama</span>
                    <span style={{ width: '10rem' }}><InlineField id={p.id} field="name" value={p.name} action={updatePocket} label={`Nama sumber dana ${p.name}`} /></span>
                  </div>
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <ConfirmButton action={deletePocket} args={[p.id]} trigger="Hapus sumber dana" title={`Hapus "${p.name}"?`}
                      message="Catatan yang memakai sumber ini tetap ada, hanya jadi tanpa sumber dana. Riwayat pindah dana dari/ke sumber ini ikut terhapus." />
                  </div>
                </>
              ) : null}
            </section>
          )
        })}

        {!ro ? (
          <section className={`tile s4 ${pockets.length ? 'plain' : ''}`} style={{ ['--i' as string]: i++ }} aria-labelledby="h-baru">
            <div className="tile-head"><TileTitle id="h-baru" icon={Plus}>Sumber dana baru</TileTitle></div>
            <QuickForm action={addPocket} className="stack">
              <div className="form-grid">
                <label className="field full"><span>Nama</span><input className="input" name="name" required maxLength={40} placeholder="mis. BCA, GoPay, Dompet" /></label>
                <label className="field"><span>Jenis</span>
                  <select className="select" name="kind" defaultValue="bank">
                    <option value="bank">Bank</option><option value="ewallet">E-wallet</option><option value="tunai">Tunai</option><option value="lainnya">Lainnya</option>
                  </select>
                </label>
                <label className="field"><span>Saldo sekarang</span><MoneyInput name="opening_balance" label="Saldo awal" /></label>
              </div>
              <Submit className="btn ghost"><Plus aria-hidden /> Tambah</Submit>
            </QuickForm>
          </section>
        ) : null}

        {transfers.length ? (
          <section className="tile s12" style={{ ['--i' as string]: i++ }} aria-labelledby="h-riwayat">
            <div className="tile-head"><TileTitle id="h-riwayat" icon={History}>Riwayat pindah dana</TileTitle><span className="tile-note">{transfers.length} kali</span></div>
            <ul className="rows">
              {transfers.slice(0, 20).map((t) => (
                <li key={t.id}>
                  <span className="grow"><span className="name">{name(t.from_pocket)} → {name(t.to_pocket)}{t.fee ? <span className="fee-tag">Fee: {rp(t.fee)}</span> : null}</span><span className="meta">{tgl(t.moved_on)}{t.note ? ` · ${t.note}` : ''}</span></span>
                  <span className="amt">{rp(t.amount)}</span>
                  {!ro ? <ActionButton action={deleteTransfer} args={[t.id]} label="Batalkan pindah dana ini" /> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!pockets.length && ro ? <section className="tile s12"><p className="hint"><Coins size={16} aria-hidden /> Belum ada sumber dana yang dicatat.</p></section> : null}
      </div>
    </>
  )
}
