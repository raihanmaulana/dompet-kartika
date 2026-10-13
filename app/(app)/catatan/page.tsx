import { TileTitle } from '@/components/TileTitle'
import Link from 'next/link'
import { Download, FileText, ListChecks, Plus, Repeat, Target } from 'lucide-react'
import { getCtx, loadMonth, loadPockets, loadRecurring } from '@/lib/data'
import { billRowsFor, daysInMonth, rp, summarize, ymLabel } from '@/lib/calc'
import { addExpense, addRecurring, deleteRecurring, setRecurringField } from '@/lib/actions'
import { ConfirmButton } from '@/components/ConfirmButton'
import { PageHead } from '@/components/PageHead'
import { EmptyMonth } from '@/components/EmptyMonth'
import { DatePicker } from '@/components/DatePicker'
import { ExpenseList } from '@/components/ExpenseList'
import { PocketSelect } from '@/components/PocketSelect'
import { InlineField, MoneyInput, QuickForm, Submit } from '@/components/Fields'

export const metadata = { title: 'Catatan Pengeluaran' }

export default async function Catatan() {
  const ctx = await getCtx()
  const [data, { pockets }, recurring] = await Promise.all([loadMonth(ctx), loadPockets(ctx), loadRecurring(ctx)])
  const rows = billRowsFor(data.bills, data.billMonths, ctx.ym)
  const s = summarize(data.income, data.budget, data.expenses, rows, ctx.today, ctx.ym)
  if (!data.income.length && !data.budget.length) {
    return (<><PageHead ctx={ctx} title="Catatan Pengeluaran" sub="Pengeluaran harian" /><div className="bento"><EmptyMonth ctx={ctx} /></div></>)
  }
  const pos = data.budget.filter((b) => b.grp === 'kebutuhan' || b.grp === 'gaya_hidup')
  const defDate = ctx.ym === ctx.today.ym ? ctx.today.iso : `${ctx.ym}-01`
  const noPos = data.expenses.filter((e) => !e.budget_item_id).reduce((t, e) => t + e.amount, 0)

  return (
    <>
      <PageHead ctx={ctx} title="Catatan Pengeluaran" sub={`Pengeluaran ${ymLabel(ctx.ym)}: ${rp(s.spent)} · sisa jatah ${rp(s.sisaJatah)}`} actions={<span className="cluster"><a className="btn small ghost" href="/ekspor" download><Download aria-hidden size={16} /> CSV</a><Link className="btn small ghost" href="/laporan"><FileText aria-hidden size={16} /> Laporan PDF</Link></span>} />
      <div className="bento">
        <section className="tile s7" style={{ ['--i' as string]: 0 }} aria-labelledby="h-list">
          <div className="tile-head"><TileTitle id="h-list" icon={ListChecks}>Semua catatan</TileTitle><span className="tile-note">{data.expenses.length} catatan</span></div>
          <ExpenseList expenses={data.expenses} cats={pos} pockets={pockets} canEdit={ctx.canEdit} days={daysInMonth(ctx.ym)} />
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
                  <label className="field"><span>Tanggal</span><DatePicker name="spent_on" label="Tanggal" defaultValue={defDate} min={`${ctx.ym}-01`} max={`${ctx.ym}-${String(daysInMonth(ctx.ym)).padStart(2, '0')}`} /></label>
                  <PocketSelect pockets={pockets} full />
                  <label className="field full"><span>Catatan</span><input className="input" name="note" maxLength={120} placeholder="mis. kopi sore" /></label>
                </div>
                <Submit className="btn full"><Plus aria-hidden /> Simpan catatan</Submit>
              </QuickForm>
            </section>
          ) : null}

          <section className="tile plain" style={{ ['--i' as string]: 2 }} aria-labelledby="h-ulang">
            <div className="tile-head"><TileTitle id="h-ulang" icon={Repeat}>Pengeluaran berulang</TileTitle><span className="tile-note">{recurring.length} aktif</span></div>
            <p className="hint" style={{ marginBottom: 'var(--space-3)' }}>Untuk uang kos, langganan, dll. Otomatis jadi catatan tiap bulan saat tanggalnya tiba.</p>
            {recurring.length ? (
              <ul className="rows" style={{ marginBottom: 'var(--space-4)' }}>
                {recurring.map((r) => (
                  <li key={r.id} className="row wrap">
                    <span className="grow" style={{ minWidth: '9rem' }}>
                      <span className="name">{r.note}</span>
                      <span className="meta">Tiap tanggal {r.day} · mulai {ymLabel(r.start_ym)}{r.end_ym ? ` sampai ${ymLabel(r.end_ym)}` : ''}{r.category_label ? ` · ${r.category_label}` : ''}{r.pocket_id ? ` · ${pockets.find((p) => p.id === r.pocket_id)?.name ?? ''}` : ''}</span>
                    </span>
                    <span style={{ width: '8.5rem' }}><InlineField id={r.id} field="amount" value={r.amount} money action={setRecurringField} label={`Nominal ${r.note}`} disabled={!ctx.canEdit} /></span>
                    {ctx.canEdit ? <ConfirmButton action={deleteRecurring} args={[r.id]} trigger="Hapus" title={`Hentikan "${r.note}"?`} confirmText="Ya, hentikan" message="Tidak dibuat lagi untuk bulan berikutnya. Catatan yang sudah terbuat tetap ada." /> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {ctx.canEdit ? (
              <QuickForm action={addRecurring} className="stack">
                <div className="form-grid">
                  <label className="field full"><span>Nama</span><input className="input" name="note" required maxLength={80} placeholder="mis. Uang kos" /></label>
                  <label className="field"><span>Nominal</span><MoneyInput name="amount" label="Nominal per bulan" required /></label>
                  <label className="field"><span>Tiap tanggal</span><input className="input" type="number" name="day" min={1} max={31} defaultValue={1} required /></label>
                  <label className="field"><span>Kategori</span>
                    <select className="select" name="category_label" defaultValue="">
                      <option value="">Tanpa kategori</option>
                      {pos.map((p) => <option key={p.id} value={p.label}>{p.label}</option>)}
                    </select>
                  </label>
                  <PocketSelect pockets={pockets} />
                  <label className="field"><span>Mulai bulan</span><input className="input" type="month" name="start_ym" defaultValue={ctx.ym} required /></label>
                  <label className="field"><span>Sampai (opsional)</span><input className="input" type="month" name="end_ym" /></label>
                </div>
                <Submit className="btn ghost"><Plus aria-hidden /> Tambah berulang</Submit>
              </QuickForm>
            ) : null}
          </section>

          <section className="tile" style={{ ['--i' as string]: 3 }} aria-labelledby="h-pos">
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
