import { TileTitle } from '@/components/TileTitle'
import Link from 'next/link'
import { BellRing, HeartPulse, PieChart, History, PenLine, Plus, Receipt, Waypoints } from 'lucide-react'
import { getCtx, loadMonth, loadPockets } from '@/lib/data'
import { billRowsFor, daysInMonth, rp, summarize, ymLabel } from '@/lib/calc'
import { addExpense } from '@/lib/actions'
import { PageHead } from '@/components/PageHead'
import { EmptyMonth } from '@/components/EmptyMonth'
import { MoneyInput, QuickForm, Submit } from '@/components/Fields'
import { DatePicker } from '@/components/DatePicker'
import { PocketSelect } from '@/components/PocketSelect'
import { SpendDonut, type Slice } from '@/components/SpendDonut'

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
  const [data, { pockets }] = await Promise.all([loadMonth(ctx), loadPockets(ctx)])
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
  // Peringatan yang perlu dilihat sekarang
  const alerts: { tone: 'over' | 'warn'; text: string; href: string }[] = []
  const nowMonth = ctx.ym === ctx.today.ym
  if (nowMonth) {
    for (const r of unpaid) {
      if (r.skipped) continue
      const gap = r.dueDay - ctx.today.day
      const sisa = rp(r.amount - r.paidAmount)
      if (gap < 0) alerts.push({ tone: 'over', text: `${r.bill.name} telat ${-gap} hari (sisa ${sisa})`, href: '/tagihan' })
      else if (gap <= 3) alerts.push({ tone: 'warn', text: `${r.bill.name} jatuh tempo ${gap === 0 ? 'hari ini' : gap === 1 ? 'besok' : `${gap} hari lagi`} (sisa ${sisa})`, href: '/tagihan' })
    }
  }
  for (const p of pockets) if (p.saldo < 0) alerts.push({ tone: 'over', text: `Saldo ${p.name} minus ${rp(-p.saldo)}`, href: '/sumber-dana' })
  if (s.uangBelanja > 0 && s.sisaJatah < 0) alerts.push({ tone: 'over', text: `Jatah belanja sudah terlewat ${rp(-s.sisaJatah)}`, href: '/catatan' })
  else if (s.uangBelanja > 0 && s.sisaJatah / s.uangBelanja < 0.15) alerts.push({ tone: 'warn', text: `Jatah belanja tinggal ${Math.round((s.sisaJatah / s.uangBelanja) * 100)}% (${rp(s.sisaJatah)})`, href: '/catatan' })
  const sliceMap = new Map<string, Slice>()
  for (const e of data.expenses) {
    const key = e.budget_item_id ?? '__none'
    const name = e.budget_item_id ? (data.budget.find((b) => b.id === e.budget_item_id)?.label ?? 'Tanpa kategori') : 'Tanpa kategori'
    const cur = sliceMap.get(key) ?? { key, name, amount: 0, count: 0 }
    cur.amount += e.amount; cur.count += 1
    sliceMap.set(key, cur)
  }
  const slices = [...sliceMap.values()].filter((x) => x.amount > 0).sort((x, y) => (x.key === '__none' ? 1 : 0) - (y.key === '__none' ? 1 : 0) || y.amount - x.amount)
  const defDate = ctx.ym === ctx.today.ym ? ctx.today.iso : `${ctx.ym}-01`

  return (
    <>
      <PageHead ctx={ctx} title={title} sub={`Ringkasan ${ymLabel(ctx.ym)}`} />
      <div className="bento">
        {alerts.length ? (
          <section className="tile s12 alerts" style={{ ['--i' as string]: 0 }} aria-labelledby="h-alert">
            <div className="tile-head"><TileTitle id="h-alert" icon={BellRing}>Perlu perhatian</TileTitle><span className="tile-note">{alerts.length} hal</span></div>
            <ul className="alert-list">
              {alerts.map((a, n) => (
                <li key={n} className={`alert ${a.tone}`}><span className="alert-dot" aria-hidden /><Link href={a.href} className="grow">{a.text}</Link><span className="alert-go" aria-hidden>→</span></li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="tile col blush s7" style={{ ['--i' as string]: 0 }} aria-labelledby="h-sisa">
          <p className="kicker" id="h-sisa">Sisa jatah {ymLabel(ctx.ym)}</p>
          <p className={`big ${over ? 'neg' : ''}`} style={{ fontSize: 'clamp(2.2rem, 5.4vw, 4rem)', whiteSpace: 'nowrap' }}>{rp(s.sisaJatah)}</p>
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
                    <option value="">Tanpa kategori</option>
                    {posList.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </label>
                <label className="field"><span>Tanggal</span><DatePicker name="spent_on" label="Tanggal" defaultValue={defDate} min={`${ctx.ym}-01`} max={`${ctx.ym}-${String(daysInMonth(ctx.ym)).padStart(2, '0')}`} /></label>
                <PocketSelect pockets={pockets} full />
                <label className="field full"><span>Catatan</span><input className="input" name="note" maxLength={120} placeholder="mis. makan siang bareng teman" /></label>
              </div>
              <Submit className="btn full"><Plus aria-hidden /> Catat</Submit>
            </QuickForm>
          ) : <p className="hint">Kamu sedang dalam mode lihat saja.</p>}
        </section>

        <section className="tile s6" style={{ ['--i' as string]: 2 }} aria-labelledby="h-alur">
          <div className="tile-head"><TileTitle id="h-alur" icon={Waypoints}>Distribusi Utama</TileTitle><Link className="link" href="/anggaran">Anggaran</Link></div>
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

        <section className="tile s12" style={{ ['--i' as string]: 6 }} aria-labelledby="h-donat">
          <div className="tile-head"><TileTitle id="h-donat" icon={PieChart}>Duitnya keluar ke mana?</TileTitle><Link className="link" href="/catatan">Lihat catatan</Link></div>
          {slices.length ? <SpendDonut slices={slices} total={s.spent} over={over} /> : <p className="hint">Belum ada pengeluaran di {ymLabel(ctx.ym)}. Begitu ada catatan, donatnya langsung terisi.</p>}
        </section>
      </div>
    </>
  )
}
