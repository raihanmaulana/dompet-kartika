import { TileTitle } from '@/components/TileTitle'
import { CalendarClock, CreditCard, HandCoins, ListChecks, Plus, Receipt, Repeat } from 'lucide-react'
import { getCtx, loadMonth, loadPockets } from '@/lib/data'
import { billRowsFor, rp, summarize, ymLabel } from '@/lib/calc'
import { BillKindFields } from '@/components/BillKindFields'
import { addBill, changeBillFrom, deleteBill, deleteBillPayment, payBill, setBillMin, setBillAmountThisMonth, setBillSkipped, stopBill, undoBillPaid } from '@/lib/actions'
import { ModalForm } from '@/components/ModalForm'
import { DatePicker } from '@/components/DatePicker'
import { PocketSelect } from '@/components/PocketSelect'
import { ConfirmButton } from '@/components/ConfirmButton'
import { PageHead } from '@/components/PageHead'
import { ActionButton, InlineField, MoneyInput, QuickForm, Submit } from '@/components/Fields'

export const metadata = { title: 'Tagihan' }

const KIND = { tagihan: 'Tagihan rutin', cicilan: 'Cicilan', hutang: 'Hutang', kartu: 'Kartu kredit' } as const
const KIND_ICON = { tagihan: Receipt, cicilan: Repeat, hutang: HandCoins, kartu: CreditCard } as const

export default async function Tagihan() {
  const ctx = await getCtx()
  const [data, { pockets }] = await Promise.all([loadMonth(ctx), loadPockets(ctx)])
  const pname = (id: string | null) => pockets.find((p) => p.id === id)?.name
  const rows = billRowsFor(data.bills, data.billMonths, ctx.ym)
  const s = summarize(data.income, data.budget, data.expenses, rows, ctx.today, ctx.ym)
  const pays = data.payments
  const live = rows.filter((r) => !r.skipped)
  const paid = live.filter((r) => r.paid).reduce((t, r) => t + r.amount, 0)

  return (
    <>
      <PageHead ctx={ctx} title="Tagihan dan hutang" sub={`Daftar ${ymLabel(ctx.ym)}. Nominal dan status bayar berlaku per bulan.`} />
      <div className="bento">
        <section className="tile col blush s5" style={{ ['--i' as string]: 0 }} aria-labelledby="h-total">
          <p className="kicker" id="h-total">Total bulan ini</p>
          <p className="big" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3rem)', whiteSpace: 'nowrap' }}>{rp(s.tagihan)}</p>
          <p className="sub">Sudah dibayar <b>{rp(paid)}</b>, belum <b>{rp(s.tagihanBelumBayar)}</b>.</p>
          <p className="sub" style={{ marginTop: 'var(--space-3)' }}>
            Cicilan dan hutang <b>{rp(s.cicilanHutang)}</b> ({Math.round(s.rasio.cicilan * 100)}% dari pemasukan bersih
            {s.rasio.cicilan > 0.3 ? ', di atas batas aman 30%' : ', masih di bawah batas aman 30%'}). Semuanya otomatis dipotong dari jatah belanja.
          </p>
          <div className="statrow">
            <div><b>{rp(s.tagihanBiasa)}</b><span>tagihan rutin</span></div>
            <div><b>{rp(live.filter((r) => r.bill.kind === 'cicilan').reduce((t, r) => t + r.amount, 0))}</b><span>cicilan</span></div>
            <div><b>{rp(live.filter((r) => r.bill.kind === 'hutang').reduce((t, r) => t + r.amount, 0))}</b><span>hutang</span></div>
            <div><b>{rp(live.filter((r) => r.bill.kind === 'kartu').reduce((t, r) => t + r.amount, 0))}</b><span>kartu kredit</span></div>
          </div>
        </section>

        {ctx.canEdit ? (
          <section className="tile s7" style={{ ['--i' as string]: 1 }} aria-labelledby="h-tambah">
            <div className="tile-head"><TileTitle id="h-tambah" icon={Plus}>Tambah tagihan atau hutang</TileTitle></div>
            <QuickForm action={addBill} className="stack">
              <div className="form-grid">
                <label className="field full"><span>Nama</span><input className="input" name="name" required maxLength={80} placeholder="mis. Cicilan HP atau Pinjam ke teman" /></label>
                <BillKindFields />
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
            <ul className="bills">
              {rows.map((r) => {
                const Icon = KIND_ICON[r.bill.kind]
                const nowDay = ctx.today.ym === ctx.ym ? ctx.today.day : null
                const gap = nowDay == null ? null : r.dueDay - nowDay
                const late = !r.paid && !r.skipped && gap != null && gap < 0
                const pct = r.amount > 0 ? Math.min(100, Math.round((r.paidAmount / r.amount) * 100)) : 0
                const minPct = r.amount > 0 && r.minPayment > 0 ? Math.min(100, (r.minPayment / r.amount) * 100) : 0
                const due = r.skipped ? 'Dilewati' : r.paid ? 'Selesai' : gap == null ? `Tgl ${r.dueDay}` : gap < 0 ? `Telat ${-gap} hari` : gap === 0 ? 'Hari ini' : `${gap} hari lagi`
                return (
                  <li key={`${ctx.ym}-${r.bill.id}`} className={`bill k-${r.bill.kind}${r.paid ? ' is-paid' : ''}${r.skipped ? ' is-skipped' : ''}${late ? ' is-late' : ''}`}>
                    <span className="bill-date" aria-label={`Jatuh tempo tanggal ${r.dueDay}`}><b>{r.dueDay}</b><i>tgl</i></span>
                    <div className="bill-main">
                      <div className="bill-top">
                        <span className="bill-ic" aria-hidden><Icon size={16} /></span>
                        <span className="name">{r.bill.name}</span>
                        <span className="chip">{KIND[r.bill.kind]}</span>
                        {r.skipped ? <span className="chip">Dilewati</span>
                          : r.paid ? <span className="chip ok">Lunas</span>
                          : r.isCard && r.minMet ? <span className="chip ok">Minimum terpenuhi</span>
                          : late ? <span className="chip over">Telat</span> : <span className="chip warn">Belum</span>}
                        {r.overridden ? <span className="chip">Diubah bulan ini</span> : null}
                      </div>
                      <p className="meta">
                        <CalendarClock size={13} aria-hidden /> {due}
                        {r.monthsAfter != null ? ` · ${r.monthsAfter === 0 ? 'cicilan terakhir' : `${r.monthsAfter} bulan lagi`}` : ''}
                        {r.remainingTotal != null && !r.skipped ? ` · sisa total ${rp(r.remainingTotal)}` : ''}
                        {r.bill.note ? ` · ${r.bill.note}` : ''}
                      </p>

                      {(r.isCard || (r.paidAmount > 0 && !r.paid)) && !r.skipped ? (
                        <div className="cc">
                          <div className="cc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={r.amount} aria-valuenow={r.paidAmount}
                            aria-label={`Sudah dibayar ${rp(r.paidAmount)} dari ${rp(r.amount)}`}>
                            <div className={`meter${r.paid ? ' ok' : ''}`}><i style={{ width: `${pct}%` }} /></div>
                            {minPct > 0 && !r.paid ? <span className="cc-min" style={{ left: `${minPct}%` }} title={`Minimum ${rp(r.minPayment)}`} aria-hidden /> : null}
                          </div>
                          <p className="cc-line">
                            <span>Dibayar <b>{rp(r.paidAmount)}</b> ({pct}%)</span>
                            <span>{r.paid ? 'Tagihan bulan ini beres' : `Sisa ${rp(r.amount - r.paidAmount)}`}</span>
                          </p>
                          {r.minPayment > 0 ? (
                            <p className="cc-line sub">
                              <span>Minimum <b>{rp(r.minPayment)}</b></span>
                              <span>{r.paid || r.minMet ? 'aman dari denda telat' : `kurang ${rp(r.minPayment - r.paidAmount)} lagi`}</span>
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {ctx.canEdit ? (
                        <details className="bill-more">
                          <summary className="link">Atur lainnya</summary>
                          <div className="bill-more-body stack">
                            {pays.filter((p) => p.bill_id === r.bill.id).length ? (
                              <div className="pay-list">
                                <span className="hint">Riwayat bayar bulan ini</span>
                                {pays.filter((p) => p.bill_id === r.bill.id).map((p) => (
                                  <div key={p.id} className="pay-row">
                                    <span className="grow">{Number(p.paid_on.slice(8))}/{p.paid_on.slice(5, 7)} · {pname(p.pocket_id) ?? 'tanpa sumber dana'}</span>
                                    <b>{rp(p.amount)}</b>
                                    <ActionButton action={deleteBillPayment} args={[p.id]} label={`Hapus pembayaran ${rp(p.amount)}`} />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {r.isCard ? (
                              <div className="cluster">
                                <span className="hint">Minimum</span>
                                <span style={{ width: '9.5rem' }}><InlineField id={r.bill.id} field="min_payment" value={r.bill.min_payment ?? 0} money action={setBillMin} label="Pembayaran minimum" /></span>
                              </div>
                            ) : null}
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
                              <ConfirmButton action={deleteBill} args={[r.bill.id]} trigger="Hapus" className="btn small ghost" title={`Hapus "${r.bill.name}"?`}
                                message="Tagihan ini dihapus dari semua bulan, termasuk status bayarnya. Jatah belanja ikut dihitung ulang. Tidak bisa dibatalkan." />
                            </div>
                          </div>
                        </details>
                      ) : null}
                    </div>

                    <div className="bill-side">
                      <span className="bill-amt">
                        <InlineField id={`${r.bill.id}|${ctx.ym}`} field="amount" value={r.amount} money action={setBillAmountThisMonth}
                          label={`Nominal ${r.bill.name} bulan ini`} disabled={!ctx.canEdit || r.skipped} />
                      </span>
                      {!r.skipped && ctx.canEdit ? (
                        r.paid ? (
                          <ActionButton action={undoBillPaid} args={[r.bill.id, ctx.ym]} label="Batalkan status lunas" icon={false} text="Batalkan lunas" className="btn small ghost" />
                        ) : (
                          <ModalForm triggerClass="btn small" trigger={r.paidAmount > 0 || r.isCard ? 'Catat bayar' : 'Bayar'} title={`Bayar ${r.bill.name}`} submitText="Simpan pembayaran" action={payBill}
                            intro={<>Sisa bulan ini <b>{rp(r.amount - r.paidAmount)}</b>{r.minPayment > 0 && !r.minMet ? <>, minimum <b>{rp(r.minPayment - r.paidAmount)}</b> lagi</> : null}.</>}>
                            <input type="hidden" name="bill_id" value={r.bill.id} /><input type="hidden" name="ym" value={ctx.ym} />
                            <label className="field full"><span>Nominal dibayar</span><MoneyInput name="amount" label="Nominal dibayar" defaultValue={r.amount - r.paidAmount} required /></label>
                            <PocketSelect pockets={pockets} label="Dibayar dari" />
                            <label className="field"><span>Tanggal bayar</span><DatePicker name="paid_on" label="Tanggal bayar" defaultValue={ctx.today.iso} inModal /></label>
                          </ModalForm>
                        )
                      ) : null}
                    </div>
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
