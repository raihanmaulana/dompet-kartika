import { getCtx, loadMonth } from '@/lib/data'
import { billRowsFor, rp, summarize, ymLabel } from '@/lib/calc'
import { PageHead } from '@/components/PageHead'
import { Simulator } from '@/components/Simulator'

export const metadata = { title: 'Investasi' }

export default async function Investasi() {
  const ctx = await getCtx()
  const data = await loadMonth(ctx)
  const s = summarize(data.income, data.budget, data.expenses, billRowsFor(data.bills, data.billMonths, ctx.ym), ctx.today, ctx.ym)
  return (
    <>
      <PageHead ctx={ctx} title="Simulasi investasi" sub={s.grp.investasi ? `Rencana ${ymLabel(ctx.ym)}: ${rp(s.grp.investasi)} per bulan.` : 'Coba angka setoran dan lamanya.'} />
      <div className="bento">
        <section className="tile s12" style={{ ['--i' as string]: 0 }} aria-label="Simulator">
          <Simulator key={s.grp.investasi} monthly={s.grp.investasi} />
        </section>
      </div>
    </>
  )
}
