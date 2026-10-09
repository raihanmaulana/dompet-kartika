import { TileTitle } from '@/components/TileTitle'
import { ListChecks, Plus, Target } from 'lucide-react'
import { getCtx, loadMonth, loadPockets } from '@/lib/data'
import { billRowsFor, daysInMonth, rp, summarize, ymLabel } from '@/lib/calc'
import { addExpense, deleteExpense } from '@/lib/actions'
import { PageHead } from '@/components/PageHead'
import { EmptyMonth } from '@/components/EmptyMonth'
import { PocketSelect } from '@/components/PocketSelect'
import { ActionButton, MoneyInput, QuickForm, Submit } from '@/components/Fields'

export const metadata = { title: 'Catatan Pengeluaran' }

const tgl = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

export default async function Catatan() {
  const ctx = await getCtx()
  const [data, { pockets }] = await Promise.all([loadMonth(ctx), loadPockets(ctx)])
  const pk = (id?: string | null) => pockets.find((p) => p.id === id)?.name
  const rows = billRowsFor(data.bills, data.billMonths, ctx.ym)
  const s = summarize(data.income, data.budget, data.expenses, rows, ctx.today, ctx.ym)
  if (!data.income.length && !data.budget.length) {
    return (<><PageHead ctx={ctx} title="Catatan Pengeluaran" sub="Pengeluaran harian" /><div className="bento"><EmptyMonth ctx={ctx} /></div></>)
  }
  const pos = data.budget.filter((b) => b.grp === 'kebutuhan' || b.grp === 'gaya_hidup')
  const label = (id: string | null) => pos.find((p) => p.id === id)?.label
  const byDay = new Map<string, typeof data.expenses>()
  for (const e of data.expenses) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e])
  const defDate = ctx.ym === ctx.today.ym ? ctx.today.iso : `${ctx.ym}-01`
  const noPos = data.expenses.filter((e) => !e.budget_item_id).reduce((t, e) => t + e.amount, 0)

  return (
    <>
      <PageHead ctx={ctx} title="Catatan Pengeluaran" sub={`Pengeluaran ${ymLabel(ctx.ym)}: ${rp(s.spent)} · sisa jatah ${rp(s.sisaJatah)}`} />
      <div className="bento">
        <section className="tile s7" style={{ ['--i' as string]: 0 }} aria-labelledby="h-list">
          <div className="tile-head"><TileTitle id="h-list" icon={ListChecks}>Semua catatan</TileTitle><span className="tile-note">{data.expenses.length} catatan</span></div>
          {data.expenses.length ? (
            <div className="stack" style={{ gap: 'var(--space-5)' }}>
              {[...byDay.entries()].map(([day, list]) => (
                <div key={day}>
                  <p className="hint" style={{ fontWeight: 700, marginBottom: 4 }}>{tgl(day)} · {rp(list.reduce((t, e) => t + e.amount, 0))}</p>
                  <ul className="rows">
                    {list.map((e) => (
                      <li key={e.id}>
                        <span className="grow"><span className="name">{e.note || label(e.budget_item_id) || 'Pengeluaran'}</span>
                          {label(e.budget_item_id) || pk(e.pocket_id) || e.transfer_id ? <span className="meta">{[label(e.budget_item_id), pk(e.pocket_id), e.transfer_id ? 'Otomatis dari Pindah dana (hapus lewat halaman Sumber dana)' : ''].filter(Boolean).join(' · ')}</span> : null}</span>
                        <span className="amt">{rp(e.amount)}</span>
                        {ctx.canEdit && !e.transfer_id ? <ActionButton action={deleteExpense} args={[e.id]} label={`Hapus catatan ${e.note || rp(e.amount)}`} /> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : <p className="hint">Belum ada catatan di {ymLabel(ctx.ym)}. Catatan di bulan lain tidak tampil di sini.</p>}
        </section>

        <div className="stack col5">
          {ctx.canEdit ? (
            <section className="tile" style={{ ['--i' as string]: 1 }} aria-labelledby="h-baru">
              <div className="tile-head"><TileTitle id="h-baru" icon={Plus}>Catat baru</TileTitle></div>
              <QuickForm action={addExpense} className="stack">
                <div className="form-grid">
                  <label className="field full"><span>Berapa?</span><MoneyInput name="amount" label="Jumlah pengeluaran" required /></label>
                  <label className="field"><span>Kategori</span>
                    <select className="select" name="budget_item_id" defaultValue="">
                      <option value="">Tanpa kategori</option>
                      {pos.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Tanggal</span><input className="input" type="date" name="spent_on" defaultValue={defDate} min={`${ctx.ym}-01`} max={`${ctx.ym}-${String(daysInMonth(ctx.ym)).padStart(2, '0')}`} required /></label>
                  <PocketSelect pockets={pockets} full />
                  <label className="field full"><span>Catatan</span><input className="input" name="note" maxLength={120} placeholder="mis. kopi sore" /></label>
                </div>
                <Submit className="btn full"><Plus aria-hidden /> Simpan catatan</Submit>
              </QuickForm>
            </section>
          ) : null}

          <section className="tile" style={{ ['--i' as string]: 2 }} aria-labelledby="h-pos">
            <div className="tile-head"><TileTitle id="h-pos" icon={Target}>Per kategori</TileTitle></div>
            <ul className="rows">
              {pos.map((p) => {
                const used = s.spentByItem[p.id] ?? 0
                const o = used > p.amount
                return (
                  <li key={p.id} style={{ display: 'block' }}>
                    <div className="row" style={{ padding: 0, border: 0 }}>
                      <span className="grow name">{p.label}</span>
                      <span className={`chip ${o ? 'over' : ''}`}>{o ? 'Melebihi' : 'Aman'}</span>
                    </div>
                    <div className={`meter ${o ? 'over' : ''}`} style={{ margin: '8px 0 4px' }}><i style={{ width: `${p.amount > 0 ? Math.min(100, (used / p.amount) * 100) : used ? 100 : 0}%` }} /></div>
                    <p className="meta hint">{rp(used)} dari {rp(p.amount)}</p>
                  </li>
                )
              })}
              {noPos > 0 ? <li><span className="grow name">Tanpa kategori</span><span className="amt">{rp(noPos)}</span></li> : null}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
