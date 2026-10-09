import type { ReactNode } from 'react'
import { Eye } from 'lucide-react'
import { MonthSwitcher } from './MonthSwitcher'
import type { Ctx } from '@/lib/data'

export function PageHead({ ctx, title, sub, month = true, actions }: { ctx: Ctx; title: string; sub?: string; month?: boolean; actions?: ReactNode }) {
  return (
    <header className="topbar">
      <div>
        <div className="title-row"><h1 className="page-title">{title}</h1>{actions}</div>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      <div className="cluster">
        {!ctx.canEdit ? <span className="viewing"><Eye size={16} aria-hidden /> Lihat saja · data {ctx.ownerName}</span> : null}
        {month ? <MonthSwitcher ym={ctx.ym} /> : null}
      </div>
    </header>
  )
}
