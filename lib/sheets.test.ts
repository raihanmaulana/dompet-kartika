import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { rowEvent, summaryEvent, fullSyncEvents, type SheetEvent } from './sheets.ts'

// ---- Supabase tiruan (memori) ----
const DB: Record<string, any[]> = {
  income_items: [
    { id: 'i1', owner_id: 'u', ym: '2026-10', label: 'Gaji kotor', kind: 'masuk', amount: 6500000, sort: 0, pocket_id: 'p1' },
    { id: 'i2', owner_id: 'u', ym: '2026-10', label: 'PPh 21', kind: 'potong', amount: 65000, sort: 1 },
  ],
  budget_items: [
    { id: 'b1', owner_id: 'u', ym: '2026-10', grp: 'kebutuhan', label: 'Makan', amount: 1600000, sort: 0 },
    { id: 'b2', owner_id: 'u', ym: '2026-10', grp: 'tabungan', label: 'Dana darurat', amount: 1000000, sort: 1 },
  ],
  expenses: [{ id: 'e1', owner_id: 'u', ym: '2026-10', spent_on: '2026-10-02', budget_item_id: 'b1', note: 'Makan siang', amount: 35000, pocket_id: 'p2' }],
  bills: [{ id: 'l1', owner_id: 'u', name: 'Wifi', kind: 'tagihan', amount: 150000, due_day: 5, start_ym: '2026-10', end_ym: null, note: '' }],
  bill_months: [{ bill_id: 'l1', owner_id: 'u', ym: '2026-10', amount_override: 175000, skipped: false, paid: true, paid_at: '2026-10-05T03:00:00Z' }],
  goals: [{ id: 'g1', owner_id: 'u', name: 'Liburan', target: 3000000, is_emergency: false }],
  pockets: [
    { id: 'p1', owner_id: 'u', name: 'BCA', kind: 'bank', opening_balance: 1000000, sort: 0 },
    { id: 'p2', owner_id: 'u', name: 'GoPay', kind: 'ewallet', opening_balance: 0, sort: 1 },
  ],
  pocket_transfers: [{ id: 't1', owner_id: 'u', from_pocket: 'p1', to_pocket: 'p2', amount: 300000, moved_on: '2026-10-05', note: 'isi saldo' }],
  goal_deposits: [{ id: 'd1', owner_id: 'u', goal_id: 'g1', ym: '2026-10', amount: 500000, note: '' }],
}
function builder(table: string) {
  let rows = DB[table] ?? []
  const b: any = {
    select: () => b,
    order: () => b,
    limit: () => b,
    not: (k: string) => { rows = rows.filter((r) => r[k] != null); return b },
    eq: (k: string, v: any) => { rows = rows.filter((r) => r[k] === v); return b },
    gte: (k: string, v: any) => { rows = rows.filter((r) => r[k] >= v); return b },
    maybeSingle: async () => ({ data: rows[0] ?? null }),
    then: (res: any) => res({ data: rows }),
  }
  return b
}
const sb: any = { from: (t: string) => builder(t) }

test('baris & ringkasan dari database', async () => {
  const c = (await rowEvent(sb, 'expenses', 'e1')) as any
  assert.deepEqual(c.cells, ['e1', '2026-10', '2026-10-02', 'Makan', 'Makan siang', 35000, 'GoPay'])
  const pk = (await rowEvent(sb, 'pockets', 'p1')) as any
  assert.equal(pk.cells[1], 'BCA')
  assert.equal(pk.cells[4], 1000000 + 6500000 - 300000) // saldo awal + gaji − pindah (hari ini 2026-10 ke atas bergantung jam; lihat catatan)
  const tf = (await rowEvent(sb, 'pocket_transfers', 't1')) as any
  assert.deepEqual(tf.cells, ['t1', '2026-10-05', 'BCA', 'GoPay', 300000, 'isi saldo', 0])
  const st = (await rowEvent(sb, 'bill_months', '', 'l1|2026-10')) as any
  assert.equal(st.cells[3], 175000)
  assert.equal(st.cells[5], 'Lunas')
  assert.equal(st.cells[7], 'l1')
  const gone = await rowEvent(sb, 'expenses', 'zzz')
  assert.equal(gone.op, 'delete')
  const sm = (await summaryEvent(sb, 'u', '2026-10')) as any
  // bersih 6.435.000; tagihan 175.000 (nominal bulan itu); tabungan 1.000.000 → uang belanja 5.260.000; sisa 5.225.000
  assert.equal(sm.cells[4], 6435000)
  assert.equal(sm.cells[5], 175000)
  assert.equal(sm.cells[11], 5260000)
  assert.equal(sm.cells[13], 5225000)
  assert.equal((await summaryEvent(sb, 'u', '2030-01'))!.op, 'delete')
})

// ---- Google Sheet tiruan + skrip Apps Script asli ----
function makeSheetApp() {
  const sheets: Record<string, any[][]> = {}
  const mk = (name: string) => {
    const data = sheets[name]
    const rng = (r: number, c: number, nr = 1, nc = 1) => ({
      setValues(v: any[][]) { v.forEach((row, i) => row.forEach((x, j) => { (data[r - 1 + i] ??= [])[c - 1 + j] = x })); return this },
      getValue: () => (data[r - 1] ?? [])[c - 1] ?? '',
      setNumberFormat() { return this }, setFontWeight() { return this }, setBackground() { return this },
      createTextFinder: (t: string) => ({ matchEntireCell() { return this }, findNext: () => {
        for (let i = r - 1; i < r - 1 + nr; i++) if (String((data[i] ?? [])[c - 1]) === t) return { getRow: () => i + 1 }
        return null } }),
    })
    return {
      getMaxRows: () => 1000, getMaxColumns: () => 30, getLastRow: () => data.filter(Boolean).length,
      insertRowsAfter() {}, insertColumnsAfter() {}, setFrozenRows() {}, hideColumns() {},
      getRange: (r: number, c: number, nr = 1, nc = 1) => ({ ...rng(r, c, nr, nc), getValues: () => [Array.from({ length: nc }, (_, j) => (data[r - 1] ?? [])[c - 1 + j] ?? '')] }),
      deleteRows: (r: number, n: number) => { data.splice(r - 1, n) }, deleteRow: (r: number) => { data.splice(r - 1, 1) },
      appendRow: (cells: any[]) => { data.push(cells) },
    }
  }
  return {
    sheets,
    app: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n: string) => (sheets[n] ? mk(n) : null),
        insertSheet: (n: string) => { sheets[n] = []; return mk(n) },
        getSheets: () => Object.keys(sheets), deleteSheet() {},
      }),
    },
  }
}
function loadScript(secret: string) {
  const { sheets, app } = makeSheetApp()
  const src = fs.readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8').replace("'GANTI-DENGAN-KATA-SANDI-ACAK-YANG-PANJANG'", `'${secret}'`)
  const ctx: any = {
    SpreadsheetApp: app, JSON, String, Math, Object,
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t: string) => ({ text: t, setMimeType() { return this } }) },
  }
  vm.createContext(ctx)
  vm.runInContext(src + '\nthis.doPost = doPost', ctx)
  const post = (events: SheetEvent[], s = secret) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ secret: s, events }) } }).text)
  return { sheets, post }
}

test('skrip Apps Script: tolak kata sandi salah, upsert, hapus, deleteWhere, reset, log', async () => {
  const { sheets, post } = loadScript('rahasia-123')
  assert.equal(post([], 'salah').ok, false)

  const full = await fullSyncEvents(sb, 'u')
  full.push({ op: 'log', cells: ['waktu', 'a@b.c', 'Sinkron ulang', 'Semua tab', 'x'] })
  const r = post(full)
  assert.equal(r.ok, true, JSON.stringify(r))
  assert.equal(sheets['Catatan'].length, 2) // header + 1
  assert.deepEqual(sheets['Catatan'][1], ['e1', '2026-10', '2026-10-02', 'Makan', 'Makan siang', 35000, 'GoPay'])
  assert.equal(sheets['Sumber Dana'].length, 3)
  assert.equal(sheets['Pindah Dana'].length, 2)
  assert.equal(sheets['Pemasukan'].length, 3)
  assert.equal(sheets['Ringkasan Bulanan'][1][13], 5225000)
  assert.equal(sheets['Log perubahan'].length, 2)

  // upsert menimpa baris yang sama (bukan menambah)
  post([{ op: 'upsert', tab: 'Catatan', id: 'e1', cells: ['e1', '2026-10', '2026-10-02', 'Makan', 'Makan siang', 40000] }])
  assert.equal(sheets['Catatan'].length, 2)
  assert.equal(sheets['Catatan'][1][5], 40000)
  // tambah baru
  post([{ op: 'upsert', tab: 'Catatan', id: 'e2', cells: ['e2', '2026-10', '2026-10-03', '', 'Kopi', 28000] }])
  assert.equal(sheets['Catatan'].length, 3)
  // hapus
  post([{ op: 'delete', tab: 'Catatan', id: 'e1' }])
  assert.equal(sheets['Catatan'].length, 2)
  assert.equal(sheets['Catatan'][1][0], 'e2')
  // deleteWhere: hapus semua status tagihan milik satu tagihan
  assert.equal(sheets['Status Tagihan'].length, 2)
  post([{ op: 'deleteWhere', tab: 'Status Tagihan', col: 'Id tagihan', value: 'l1' }])
  assert.equal(sheets['Status Tagihan'].length, 1)
  // tab tak dikenal ditolak
  assert.equal(post([{ op: 'reset', tab: 'Rahasia' }]).ok, false)
  // reset menyisakan header
  post([{ op: 'reset', tab: 'Pemasukan' }])
  assert.equal(sheets['Pemasukan'].length, 1)
})
