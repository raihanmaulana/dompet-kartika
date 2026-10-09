import { TileTitle } from '@/components/TileTitle'
import { CalendarCheck, PiggyBank, Plus, Sparkles } from 'lucide-react'
import { getCtx, loadGoals, loadMonth } from '@/lib/data'
import { billRowsFor, goalPlan, rp, summarize, ymLabel } from '@/lib/calc'
import { addDeposit, addGoal, deleteDeposit, deleteGoal, updateGoalTarget } from '@/lib/actions'
import { PageHead } from '@/components/PageHead'
import { Stamp } from '@/components/Stamp'
import { ActionButton, InlineField, MoneyInput, QuickForm, Submit } from '@/components/Fields'

export const metadata = { title: 'Tabungan' }

export default async function Tabungan() {
  const ctx = await getCtx()
  const [data, { goals, deposits }] = await Promise.all([loadMonth(ctx), loadGoals(ctx)])
  const rows = billRowsFor(data.bills, data.billMonths, ctx.ym)
  const s = summarize(data.income, data.budget, data.expenses, rows, ctx.today, ctx.ym)
  const saldo = (id: string) => deposits.filter((d) => d.goal_id === id).reduce((t, d) => t + d.amount, 0)
  const monthDeposit = deposits.filter((d) => d.ym === ctx.ym).reduce((t, d) => t + d.amount, 0)
  const emergency = goals.find((g) => g.is_emergency)
  const ro = !ctx.canEdit

  return (
    <>
      <PageHead ctx={ctx} title="Tabungan" sub="Dana darurat dulu, baru tujuan lain." />
      <div className="bento">
        <section className="tile blush s7" style={{ ['--i' as string]: 0 }} aria-labelledby="h-dd">
          <p className="kicker" id="h-dd">Target dana darurat</p>
          {s.danaDarurat.bulanan > 0 ? (
            <>
              <p className="big" style={{ fontSize: 'clamp(2.1rem, 5vw, 3.2rem)' }}>{rp(s.danaDarurat.min)} – {rp(s.danaDarurat.max)}</p>
              <p className="sub">Itu 3 sampai 6 kali biaya hidup bulanan <b>{rp(s.danaDarurat.bulanan)}</b> (kebutuhan, gaya hidup, dan tagihan {ymLabel(ctx.ym)}). Kalau ada hutang atau cicilan, targetnya ikut naik.</p>
              {emergency ? (
                <p className="sub" style={{ marginTop: 'var(--space-3)' }}>Sudah terkumpul <b>{rp(saldo(emergency.id))}</b> ({Math.min(100, Math.round((saldo(emergency.id) / s.danaDarurat.min) * 100))}% dari batas bawah).</p>
              ) : null}
            </>
          ) : <p className="sub">Isi anggaran {ymLabel(ctx.ym)} dulu supaya target dana darurat bisa dihitung.</p>}
        </section>

        <section className="tile s5" style={{ ['--i' as string]: 1 }} aria-labelledby="h-rencana">
          <div className="tile-head"><TileTitle id="h-rencana" icon={CalendarCheck}>Bulan ini</TileTitle></div>
          <ul className="rows">
            <li><span className="grow name">Rencana tabungan</span><span className="amt">{rp(s.grp.tabungan)}</span></li>
            <li><span className="grow name">Sudah disetor</span><span className="amt">{rp(monthDeposit)}</span></li>
            <li className="total-row"><span className="grow">Kurang</span><span className="amt">{rp(Math.max(0, s.grp.tabungan - monthDeposit))}</span></li>
          </ul>
        </section>

        {goals.map((g, idx) => {
          const sd = saldo(g.id)
          const p = g.target > 0 ? Math.min(100, (sd / g.target) * 100) : 0
          const plan = goalPlan(g, data.budget.filter((b) => b.grp === 'tabungan'))
          const doneMonth = deposits.filter((d) => d.goal_id === g.id && d.ym === ctx.ym).reduce((t, d) => t + d.amount, 0)
          const stamped = plan > 0 && doneMonth >= plan
          const list = deposits.filter((d) => d.goal_id === g.id).slice(0, 4)
          return (
            <section key={g.id} className="tile s6" style={{ ['--i' as string]: idx + 2 }} aria-labelledby={`g-${g.id}`}>
              <div className="tile-head">
                <TileTitle id={`g-${g.id}`} icon={PiggyBank}>{g.name}</TileTitle>
                {g.is_emergency ? <span className="chip ok">Dana darurat</span> : null}
              </div>
              <p className="big" style={{ fontSize: '2.1rem' }}>{rp(sd)}</p>
              {plan > 0 ? <p className="hint" style={{ marginTop: 'var(--space-1)' }}>{ymLabel(ctx.ym)}: {rp(Math.max(0, doneMonth))} dari rencana {rp(plan)}</p> : null}
              {stamped ? <Stamp id={g.id} name={g.name} monthLabel={ymLabel(ctx.ym)} /> : null}
              <div className={`meter ${p >= 100 ? 'ok' : ''}`} style={{ margin: 'var(--space-3) 0' }}><i style={{ width: `${p}%` }} /></div>
              <div className="row" style={{ border: 0, padding: 0 }}>
                <span className="grow hint">Target</span>
                <span style={{ width: '10.5rem' }}><InlineField id={g.id} field="target" value={g.target} money action={updateGoalTarget} label={`Target ${g.name}`} disabled={ro} /></span>
              </div>
              {list.length ? (
                <ul className="rows" style={{ marginTop: 'var(--space-3)' }}>
                  {list.map((d) => (
                    <li key={d.id}><span className="grow"><span className="name">{d.amount < 0 ? 'Tarik' : 'Setor'}</span><span className="meta">{ymLabel(d.ym)}{d.note ? ` · ${d.note}` : ''}</span></span>
                      <span className="amt">{rp(Math.abs(d.amount))}</span>
                      {!ro ? <ActionButton action={deleteDeposit} args={[d.id]} label="Hapus setoran" /> : null}</li>
                  ))}
                </ul>
              ) : null}
              {!ro ? (
                <>
                  <QuickForm action={addDeposit} className="cluster" >
                    <input type="hidden" name="goal_id" value={g.id} /><input type="hidden" name="ym" value={ctx.ym} />
                    <select className="select" name="dir" style={{ width: '6.5rem' }} aria-label="Setor atau tarik"><option value="setor">Setor</option><option value="tarik">Tarik</option></select>
                    <div style={{ flex: '1 1 8rem' }}><MoneyInput name="amount" label="Jumlah" required /></div>
                    <Submit className="btn small">Simpan</Submit>
                  </QuickForm>
                  <div style={{ marginTop: 'var(--space-3)' }}><ActionButton action={deleteGoal} args={[g.id]} label={`Hapus target ${g.name}`} icon={false} text="Hapus target ini" className="btn small ghost" /></div>
                </>
              ) : null}
            </section>
          )
        })}

        {!ro ? (
          <section className="tile s6 plain" style={{ ['--i' as string]: goals.length + 2 }} aria-labelledby="h-goal-baru">
            <div className="tile-head"><TileTitle id="h-goal-baru" icon={Sparkles}>Target baru</TileTitle></div>
            <QuickForm action={addGoal} className="stack">
              <div className="form-grid">
                <label className="field full"><span>Nama</span><input className="input" name="name" required maxLength={60} placeholder="mis. Liburan atau Dana darurat" /></label>
                <label className="field"><span>Target</span><MoneyInput name="target" label="Target nominal" /></label>
                <label className="field" style={{ justifyContent: 'flex-end' }}><span style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 46 }}><input type="checkbox" className="check" name="is_emergency" /> Ini dana darurat</span></label>
              </div>
              <Submit className="btn ghost"><Plus aria-hidden /> Buat target</Submit>
            </QuickForm>
          </section>
        ) : null}
      </div>
    </>
  )
}
