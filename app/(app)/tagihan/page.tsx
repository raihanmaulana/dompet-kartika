import { TileTitle } from '@/components/TileTitle'
import { ListChecks, Plus } from 'lucide-react'
import { getCtx, loadMonth } from '@/lib/data'
import { billRowsFor, rp, summarize, ymLabel } from '@/lib/calc'
import { addBill, changeBillFrom, deleteBill, setBillAmountThisMonth, setBillPaid, setBillSkipped, stopBill } from '@/lib/actions'
import { ConfirmButton } from '@/components/ConfirmButton'
import { PageHead } from '@/components/PageHead'
import { ActionButton, InlineField, MoneyInput, QuickForm, Submit, Toggle } from '@/components/Fields'

export const metadata = { title: 'Tagihan' }

const KIND = { tagihan: 'Tagihan rutin', cicilan: 'Cicilan', hutang: 'Hutang' } as const

export default async function Tagihan() {
  const ctx = await getCtx()
  const data = await loadMonth(ctx)
  const rows = billRowsFor(data.bills, data.billMonths, ctx.ym)
  const s = summarize(data.income, data.budget, data.expenses, rows, ctx.today, ctx.ym)
  const live = rows.filter((r) => !r.skipped)
  const paid = live.filter((r) => r.paid).reduce((t, r) => t + r.amount, 0)

  return (
    <>
      <PageHead ctx={ctx} title="Tagihan dan hutang" sub={`Daftar ${ymLabel(ctx.ym)}. Nominal dan status bayar berlaku per bulan.`} />
      <div className="bento">
        <section className="tile col blush s5" style={{ ['--i' as string]: 0 }} aria-labelledby="h-total">
          <p className="kicker" id="h-total">Total bulan ini</p>
          <p className="big" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}>{rp(s.tagihan)}</p>
          <p className="sub">Sudah dibayar <b>{rp(paid)}</b>, belum <b>{rp(s.tagihanBelumBayar)}</b>.</p>
          <p className="sub" style={{ marginTop: 'var(--space-3)' }}>
            Cicilan dan hutang <b>{rp(s.cicilanHutang)}</b> ({Math.round(s.rasio.cicilan * 100)}% dari pemasukan bersih
            {s.rasio.cicilan > 0.3 ? ', di atas batas aman 30%' : ', masih di bawah batas aman 30%'}). Semuanya otomatis dipotong dari jatah belanja.
          </p>
          <div className="statrow">
            <div><b>{rp(s.tagihanBiasa)}</b><span>tagihan rutin</span></div>
            <div><b>{rp(live.filter((r) => r.bill.kind === 'cicilan').reduce((t, r) => t + r.amount, 0))}</b><span>cicilan</span></div>
            <div><b>{rp(live.filter((r) => r.bill.kind === 'hutang').reduce((t, r) => t + r.amount, 0))}</b><span>hutang</span></div>
          </div>
        </section>

        {ctx.canEdit ? (
          <section className="tile s7" style={{ ['--i' as string]: 1 }} aria-labelledby="h-tambah">
            <div className="tile-head"><TileTitle id="h-tambah" icon={Plus}>Tambah tagihan atau hutang</TileTitle></div>
            <QuickForm action={addBill} className="stack">
              <div className="form-grid">
                <label className="field full"><span>Nama</span><input className="input" name="name" required maxLength={80} placeholder="mis. Cicilan HP atau Pinjam ke teman" /></label>
                <label className="field"><span>Jenis</span>
                  <select className="select" name="kind" defaultValue="tagihan">
                    <option value="tagihan">Tagihan rutin</option><option value="cicilan">Cicilan</option><option value="hutang">Hutang</option>
                  </select>
                </label>
                <label className="field"><span>Per bulan</span><MoneyInput name="amount" label="Nominal per bulan" required /></label>
                <label className="field"><span>Jatuh tempo (tanggal)</span><input className="input" type="number" name="due_day" min={1} max={31} defaultValue={1} required /></label>
                <label className="field"><span>Mulai bulan</span><input className="input" type="month" name="start_ym" defaultValue={ctx.ym} required pattern="\d{4}-\d{2}" /></label>
                <label className="field"><span>Berapa bulan?</span><input className="input" type="number" name="months" min={1} max={120} placeholder="kosong = terus" /></label>
                <label className="field"><span>Catatan</span><input className="input" name="note" maxLength={120} /></label>
              </div>
              <Submit className="btn"><Plus aria-hidden /> Simpan</Submit>
            </QuickForm>
          </section>
        ) : null}

        <section className="tile s12" style={{ ['--i' as string]: 2 }} aria-labelledby="h-daftar">
          <div className="tile-head"><TileTitle id="h-daftar" icon={ListChecks}>Daftar {ymLabel(ctx.ym)}</TileTitle><span className="tile-note">{rows.length} item</span></div>
          {rows.length ? (
            <ul className="rows">
              {rows.map((r) => {
                const key = `${ctx.ym}-${r.bill.id}`
                return (
                  <li key={key} className="row wrap" style={{ opacity: r.skipped ? 0.62 : 1, alignItems: 'flex-start' }}>
                    {r.skipped ? <span style={{ width: 26 }} /> :
                      <Toggle checked={r.paid} label={`Tandai ${r.bill.name} sudah dibayar`} action={setBillPaid} args={[r.bill.id, ctx.ym]} disabled={!ctx.canEdit} />}
                    <span className="grow" style={{ minWidth: '12rem' }}>
                      <span className="name">{r.bill.name}</span>
                      <span className="meta">
                        {KIND[r.bill.kind]} · tanggal {r.dueDay}
                        {r.monthsAfter != null ? ` · ${r.monthsAfter === 0 ? 'cicilan terakhir' : `${r.monthsAfter} bulan lagi`}` : ''}
                        {r.remainingTotal != null && !r.skipped ? ` · sisa total ${rp(r.remainingTotal)}` : ''}
                      </span>
                      {r.bill.note ? <span className="meta" style={{ display: 'block' }}>{r.bill.note}</span> : null}
                      {ctx.canEdit ? (
                        <details style={{ marginTop: 6 }}>
                          <summary className="link" style={{ cursor: 'pointer', fontSize: 'var(--text-sm)' }}>Atur lainnya</summary>
                          <div className="stack" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-field)' }}>
                            <QuickForm action={changeBillFrom} className="cluster" resetOnDone={false}>
                              <input type="hidden" name="bill_id" value={r.bill.id} /><input type="hidden" name="ym" value={ctx.ym} />
                              <MoneyInput name="amount" defaultValue={r.bill.amount} label="Nominal baru" />
                              <Submit className="btn small ghost">Ubah dari bulan ini seterusnya</Submit>
                            </QuickForm>
                            <div className="cluster">
                              {r.skipped
                                ? <ActionButton action={setBillSkipped} args={[r.bill.id, ctx.ym, false]} label="Batalkan lewati bulan ini" icon={false} text="Batalkan lewati" className="btn small ghost" />
                                : <ActionButton action={setBillSkipped} args={[r.bill.id, ctx.ym, true]} label="Lewati bulan ini saja" icon={false} text="Lewati bulan ini saja" className="btn small ghost" />}
                              <ActionButton action={stopBill} args={[r.bill.id, ctx.ym]} label="Hentikan mulai bulan ini" icon={false} text="Hentikan mulai bulan ini" className="btn small ghost" />
                            </div>
                          </div>
                        </details>
                      ) : null}
                    </span>
                    {r.skipped ? <span className="chip">Dilewati</span> : r.paid ? <span className="chip ok">Lunas</span> : <span className="chip warn">Belum</span>}
                    {r.overridden ? <span className="chip">Diubah bulan ini</span> : null}
                    <span style={{ width: '9.5rem', flex: 'none' }}>
                      <InlineField id={`${r.bill.id}|${ctx.ym}`} field="amount" value={r.amount} money action={setBillAmountThisMonth}
                        label={`Nominal ${r.bill.name} bulan ini`} disabled={!ctx.canEdit || r.skipped} />
                    </span>
                    {ctx.canEdit ? (<ConfirmButton action={deleteBill} args={[r.bill.id]} trigger="Hapus" className="btn small ghost" title={`Hapus "${r.bill.name}"?`}
  message="Tagihan ini dihapus dari semua bulan, termasuk status bayarnya. Jatah belanja ikut dihitung ulang. Tidak bisa dibatalkan." />) : null}
                  </li>
                )
              })}
            </ul>
          ) : <p className="hint">Belum ada tagihan di {ymLabel(ctx.ym)}.</p>}
        </section>
      </div>
    </>
  )
}
