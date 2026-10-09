import { Eye } from 'lucide-react'
import { MonthSwitcher } from './MonthSwitcher'
import type { Ctx } from '@/lib/data'

export function PageHead({ ctx, title, sub, month = true }: { ctx: Ctx; title: string; sub?: string; month?: boolean }) {
  return (
    <header className="topbar">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      <div className="cluster">
        {!ctx.canEdit ? <span className="viewing"><Eye size={16} aria-hidden /> Lihat saja · data {ctx.ownerName}</span> : null}
        {month ? <MonthSwitcher ym={ctx.ym} /> : null}
      </div>
    </header>
  )
}
