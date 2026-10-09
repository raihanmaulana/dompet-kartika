import { CalendarPlus } from 'lucide-react'
import { seedMonth } from '@/lib/actions'
import { prevMonthHasData, type Ctx } from '@/lib/data'
import { ymAdd, ymLabel } from '@/lib/calc'
import { Submit } from './Fields'
import { Mark } from './Mark'

export async function EmptyMonth({ ctx }: { ctx: Ctx }) {
  const prev = ymAdd(ctx.ym, -1)
  const hasPrev = await prevMonthHasData(ctx, prev)
  return (
    <section className="tile s12 plain" style={{ ['--i' as string]: 0 }}>
      <div className="empty">
        <Mark className="mark-lg" />
        <h2>{ymLabel(ctx.ym)} masih kosong</h2>
        {ctx.canEdit ? (
          <>
            <p>
              {hasPrev
                ? `Mulai dari angka ${ymLabel(prev)} lalu ubah seperlunya. Bulan ini punya anggaran, catatan, dan tagihannya sendiri, jadi mengubahnya tidak memengaruhi bulan lain.`
                : 'Mulai dari rencana awal (gaji, potongan, uang bulanan, dan pos-pos anggaran), lalu sesuaikan angkanya.'}
            </p>
            <div className="actions">
              {hasPrev ? (
                <form action={seedMonth}>
                  <input type="hidden" name="ym" value={ctx.ym} /><input type="hidden" name="mode" value="prev" />
                  <Submit className="btn"><CalendarPlus aria-hidden /> Salin dari {ymLabel(prev)}</Submit>
                </form>
              ) : null}
              <form action={seedMonth}>
                <input type="hidden" name="ym" value={ctx.ym} /><input type="hidden" name="mode" value="default" />
                <Submit className={hasPrev ? 'btn ghost' : 'btn'}>Pakai rencana awal</Submit>
              </form>
            </div>
          </>
        ) : (
          <p>{ctx.ownerName} belum mengisi bulan ini.</p>
        )}
      </div>
    </section>
  )
}
