import { TileTitle } from '@/components/TileTitle'
import Link from 'next/link'
import { HeartPulse, History, PenLine, Plus, Receipt, Waypoints } from 'lucide-react'
import { getCtx, loadMonth } from '@/lib/data'
import { billRowsFor, daysInMonth, rp, summarize, ymLabel } from '@/lib/calc'
import { addExpense } from '@/lib/actions'
import { PageHead } from '@/components/PageHead'
import { EmptyMonth } from '@/components/EmptyMonth'
import { MoneyInput, QuickForm, Submit } from '@/components/Fields'

const pct = (n: number) => `${Math.round(n * 100)}%`

function Gauge({ name, value, goal, kind, text }: { name: string; value: number; goal: number; kind: 'max' | 'min'; text: string }) {
  const ok = kind === 'max' ? value <= goal : value >= goal
  const width = Math.min(100, (value / Math.max(goal * 1.6, 0.0001)) * 100)
  return (
    <div className="gauge">
      <div className="g-top"><span className="g-name">{name}</span><span className="g-val">{pct(value)}</span></div>
      <div className={`meter ${ok ? 'ok' : kind === 'max' ? 'over' : ''}`} role="img" aria-label={`${name}: ${pct(value)}, ${ok ? 'sesuai' : 'belum sesuai'} target`}>
        <i style={{ width: `${width}%` }} />
      </div>
      <p className="g-goal">{text}</p>
    </div>
  )
}

export default async function Beranda() {
  const ctx = await getCtx()
  const data = await loadMonth(ctx)
  const rows = billRowsFor(data.bills, data.billMonths, ctx.ym)
  const s = summarize(data.income, data.budget, data.expenses, rows, ctx.today, ctx.ym)
  const title = `Halo, ${ctx.ownerName}`

  if (!data.income.length && !data.budget.length) {
    return (<><PageHead ctx={ctx} title={title} sub={`Yuk mulai ${ymLabel(ctx.ym)}.`} /><div className="bento"><EmptyMonth ctx={ctx} /></div></>)
  }

  const used = s.uangBelanja > 0 ? Math.min(100, (s.spent / s.uangBelanja) * 100) : 100
  const over = s.sisaJatah < 0
  const live = rows.filter((r) => !r.skipped)
  const unpaid = live.filter((r) => !r.paid)
  const posList = data.budget.filter((b) => b.grp === 'kebutuhan' || b.grp === 'gaya_hidup')
  const problems = [
    s.rasio.butuh > 0.5 && 'kebutuhan + tagihan di atas 50%',
    s.rasio.gaya > 0.3 && 'gaya hidup di atas 30%',
    s.rasio.simpan < 0.2 && 'tabungan + investasi di bawah 20%',
    s.rasio.cicilan > 0.3 && 'cicilan dan hutang di atas 30%',
  ].filter(Boolean) as string[]
  const defDate = ctx.ym === ctx.today.ym ? ctx.today.iso : `${ctx.ym}-01`

  return (
    <>
      <PageHead ctx={ctx} title={title} sub={`Ringkasan ${ymLabel(ctx.ym)}`} />
      <div className="bento">
        <section className="tile col blush s7" style={{ ['--i' as string]: 0 }} aria-labelledby="h-sisa">
          <p className="kicker" id="h-sisa">Sisa jatah {ymLabel(ctx.ym)}</p>
          <p className={`big ${over ? 'neg' : ''}`}>{rp(s.sisaJatah)}</p>
          <div className={`meter ${over ? 'over' : ''}`} style={{ marginTop: 'var(--space-5)' }} role="img" aria-label={`Terpakai ${Math.round(used)} persen dari uang belanja`}>
            <i style={{ width: `${used}%` }} />
          </div>
          <p className="sub">
            {s.hariSisa > 0
              ? <>Sudah dipakai <b>{rp(s.spent)}</b> dari <b>{rp(s.uangBelanja)}</b>. Aman sekitar <b>{rp(s.jatahPerHari)}</b> per hari untuk {s.hariSisa} hari ke depan.</>
              : <>Sudah dipakai <b>{rp(s.spent)}</b> dari <b>{rp(s.uangBelanja)}</b>. Bulan ini sudah lewat.</>}
          </p>
          {s.selisihRencana < 0 ? (
            <p className="form-msg err" style={{ marginTop: 'var(--space-4)' }}>
              Rencana kebutuhan + gaya hidup lebih besar {rp(-s.selisihRencana)} dari uang belanja yang tersisa setelah tagihan. <Link className="link" href="/anggaran">Atur ulang</Link>
            </p>
          ) : null}
          <div className="statrow">
            <div><b>{rp(s.spent)}</b><span>sudah dipakai</span></div>
            <div><b>{rp(s.tagihanBelumBayar)}</b><span>tagihan belum dibayar</span></div>
            <div><b>{s.hariSisa}</b><span>hari tersisa</span></div>
          </div>
        </section>

        <section className="tile s5" style={{ ['--i' as string]: 1 }} aria-labelledby="h-catat">
          <div className="tile-head"><TileTitle id="h-catat" icon={PenLine}>Catat pengeluaran</TileTitle></div>
          {ctx.canEdit ? (
            <QuickForm action={addExpense} className="stack">
              <div className="form-grid">
                <label className="field full"><span>Berapa?</span><MoneyInput name="amount" label="Jumlah pengeluaran" required /></label>
                <label className="field"><span>Untuk apa?</span>
                  <select className="select" name="budget_item_id" defaultValue="">
                    <option value="">Tanpa pos</option>
                    {posList.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </label>
                <label className="field"><span>Tanggal</span><input className="input" type="date" name="spent_on" defaultValue={defDate} min={`${ctx.ym}-01`} max={`${ctx.ym}-${String(daysInMonth(ctx.ym)).padStart(2, '0')}`} required /></label>
                <label className="field full"><span>Catatan</span><input className="input" name="note" maxLength={120} placeholder="mis. makan siang bareng teman" /></label>
              </div>
              <Submit className="btn full"><Plus aria-hidden /> Catat</Submit>
            </QuickForm>
          ) : <p className="hint">Kamu sedang dalam mode lihat saja.</p>}
        </section>

        <section className="tile s6" style={{ ['--i' as string]: 2 }} aria-labelledby="h-alur">
          <div className="tile-head"><TileTitle id="h-alur" icon={Waypoints}>Uang masuk, lalu ke mana</TileTitle><Link className="link" href="/anggaran">Anggaran</Link></div>
          <ul className="rows">
            <li><span className="grow name">Pemasukan bersih</span><span className="amt">{rp(s.bersih)}</span></li>
            <li><span className="grow"><span className="name">Tagihan rutin</span></span><span className="amt minus">−{rp(s.tagihanBiasa)}</span></li>
            <li><span className="grow"><span className="name">Cicilan dan hutang</span><span className="meta">Dipotong lebih dulu, sebelum jatah belanja</span></span><span className="amt minus">−{rp(s.cicilanHutang)}</span></li>
            <li><span className="grow name">Tabungan</span><span className="amt minus">−{rp(s.grp.tabungan)}</span></li>
            <li><span className="grow name">Investasi</span><span className="amt minus">−{rp(s.grp.investasi)}</span></li>
            <li className="total-row"><span className="grow">Uang belanja bulan ini</span><span className={over ? 'amt minus' : 'amt'}>{rp(s.uangBelanja)}</span></li>
          </ul>
        </section>

        <section className="tile col s6" style={{ ['--i' as string]: 3 }} aria-labelledby="h-cek">
          <div className="tile-head"><TileTitle id="h-cek" icon={HeartPulse}>Cek kesehatan uang</TileTitle><span className="tile-note">dari pemasukan bersih</span></div>
          <div className="gauges">
            <Gauge name="Kebutuhan + tagihan" value={s.rasio.butuh} goal={0.5} kind="max" text="Targetnya maksimal 50%" />
            <Gauge name="Gaya hidup" value={s.rasio.gaya} goal={0.3} kind="max" text="Targetnya maksimal 30%" />
            <Gauge name="Tabungan + investasi" value={s.rasio.simpan} goal={0.2} kind="min" text="Targetnya minimal 20%" />
            <Gauge name="Cicilan dan hutang" value={s.rasio.cicilan} goal={0.3} kind="max" text="Batas aman maksimal 30%" />
          </div>
          <p className="verdict">{problems.length ? <>Perlu perhatian: <b>{problems.join(', ')}</b>.</> : <>Semua ukuran masih sehat bulan ini.</>}</p>
        </section>

        <section className="tile s6" style={{ ['--i' as string]: 4 }} aria-labelledby="h-tagih">
          <div className="tile-head"><TileTitle id="h-tagih" icon={Receipt}>Tagihan belum dibayar</TileTitle><Link className="link" href="/tagihan">Semua</Link></div>
          {unpaid.length ? (
            <ul className="rows">
              {unpaid.slice(0, 5).map((r) => {
                const late = ctx.ym === ctx.today.ym && r.dueDay < ctx.today.day
                return (
                  <li key={r.bill.id}>
                    <span className="grow"><span className="name">{r.bill.name}</span><span className="meta">Tanggal {r.dueDay}</span></span>
                    {late ? <span className="chip over">Lewat</span> : null}
                    <span className="amt">{rp(r.amount)}</span>
                  </li>
                )
              })}
            </ul>
          ) : <p className="hint">{live.length ? 'Semua tagihan bulan ini sudah dibayar. Rapi!' : 'Belum ada tagihan di bulan ini.'}</p>}
          {unpaid.length ? <p className="tile-note" style={{ marginTop: 'var(--space-3)' }}>Total belum dibayar {rp(s.tagihanBelumBayar)}</p> : null}
        </section>

        <section className="tile s6" style={{ ['--i' as string]: 5 }} aria-labelledby="h-terakhir">
          <div className="tile-head"><TileTitle id="h-terakhir" icon={History}>Catatan terakhir</TileTitle><Link className="link" href="/catatan">Semua</Link></div>
          {data.expenses.length ? (
            <ul className="rows">
              {data.expenses.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <span className="grow"><span className="name">{e.note || data.budget.find((b) => b.id === e.budget_item_id)?.label || 'Pengeluaran'}</span>
                    <span className="meta">{e.spent_on.slice(8)}/{e.spent_on.slice(5, 7)}{e.budget_item_id ? ` · ${data.budget.find((b) => b.id === e.budget_item_id)?.label ?? ''}` : ''}</span></span>
                  <span className="amt">{rp(e.amount)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="hint">Belum ada pengeluaran tercatat di {ymLabel(ctx.ym)}.</p>}
        </section>
      </div>
    </>
  )
}
