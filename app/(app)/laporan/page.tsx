import { getCtx, loadMonth, loadPockets } from '@/lib/data'
import { billRowsFor, rp, summarize, ymLabel } from '@/lib/calc'
import { PageHead } from '@/components/PageHead'
import { PrintButton } from '@/components/PrintButton'

export const metadata = { title: 'Laporan bulanan' }

const KIND = { tagihan: 'Tagihan rutin', cicilan: 'Cicilan', hutang: 'Hutang', kartu: 'Kartu kredit' } as const
const tgl = (iso: string) => `${Number(iso.slice(8))}/${iso.slice(5, 7)}`

export default async function Laporan() {
  const ctx = await getCtx()
  const [data, { pockets }] = await Promise.all([loadMonth(ctx), loadPockets(ctx)])
  const rows = billRowsFor(data.bills, data.billMonths, ctx.ym)
  const s = summarize(data.income, data.budget, data.expenses, rows, ctx.today, ctx.ym)
  const cats = data.budget.filter((b) => b.grp === 'kebutuhan' || b.grp === 'gaya_hidup')
  const noCat = data.expenses.filter((e) => !e.budget_item_id).reduce((t, e) => t + e.amount, 0)
  const exps = [...data.expenses].sort((a, b) => a.spent_on.localeCompare(b.spent_on))

  return (
    <>
      <PageHead ctx={ctx} title={`Laporan ${ymLabel(ctx.ym)}`} sub={`Data ${ctx.ownerName}. Gunakan tombol cetak lalu pilih "Simpan sebagai PDF".`} actions={<PrintButton />} />
      <div className="report">
        <h2>Ringkasan</h2>
        <table className="report-table">
          <tbody>
            <tr><td>Pemasukan bersih</td><td>{rp(s.bersih)}</td></tr>
            <tr><td>Tagihan, cicilan, dan hutang</td><td>{rp(s.tagihan)}</td></tr>
            <tr><td>Tabungan</td><td>{rp(s.grp.tabungan)}</td></tr>
            <tr><td>Investasi</td><td>{rp(s.grp.investasi)}</td></tr>
            <tr><td><b>Uang belanja</b></td><td><b>{rp(s.uangBelanja)}</b></td></tr>
            <tr><td>Pengeluaran tercatat</td><td>{rp(s.spent)}</td></tr>
            <tr><td><b>Sisa jatah</b></td><td><b>{rp(s.sisaJatah)}</b></td></tr>
          </tbody>
        </table>

        <h2>Pengeluaran per kategori</h2>
        <table className="report-table">
          <thead><tr><th>Kategori</th><th>Dipakai</th><th>Anggaran</th></tr></thead>
          <tbody>
            {cats.map((c) => <tr key={c.id}><td>{c.label}</td><td>{rp(s.spentByItem[c.id] ?? 0)}</td><td>{rp(c.amount)}</td></tr>)}
            {noCat > 0 ? <tr><td>Tanpa kategori</td><td>{rp(noCat)}</td><td>—</td></tr> : null}
          </tbody>
        </table>

        <h2>Tagihan</h2>
        {rows.length ? (
          <table className="report-table">
            <thead><tr><th>Nama</th><th>Jenis</th><th>Tgl</th><th>Nominal</th><th>Dibayar</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.bill.id}><td>{r.bill.name}</td><td>{KIND[r.bill.kind]}</td><td>{r.dueDay}</td><td>{rp(r.amount)}</td><td>{rp(r.paidAmount)}</td><td>{r.skipped ? 'Dilewati' : r.paid ? 'Lunas' : r.paidAmount > 0 ? 'Dicicil' : 'Belum'}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="hint">Tidak ada tagihan bulan ini.</p>}

        <h2>Catatan pengeluaran</h2>
        {exps.length ? (
          <table className="report-table">
            <thead><tr><th>Tgl</th><th>Catatan</th><th>Kategori</th><th>Sumber</th><th>Jumlah</th></tr></thead>
            <tbody>
              {exps.map((e) => (
                <tr key={e.id}><td>{tgl(e.spent_on)}</td><td>{e.note || '—'}</td><td>{data.budget.find((b) => b.id === e.budget_item_id)?.label ?? '—'}</td><td>{pockets.find((p) => p.id === e.pocket_id)?.name ?? '—'}</td><td>{rp(e.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="hint">Belum ada catatan.</p>}

        {pockets.length ? (
          <>
            <h2>Saldo sumber dana (per hari ini)</h2>
            <table className="report-table">
              <tbody>{pockets.map((p) => <tr key={p.id}><td>{p.name}</td><td>{rp(p.saldo)}</td></tr>)}</tbody>
            </table>
          </>
        ) : null}
      </div>
    </>
  )
}
