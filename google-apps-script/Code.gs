/**
 * Wallet Together → Google Sheet (sinkron satu arah, hanya menerima kiriman dari aplikasi).
 *
 * CARA PASANG:
 * 1. Buka Google Sheet kosong → menu Ekstensi → Apps Script.
 * 2. Hapus isi Code.gs, tempel seluruh file ini.
 * 3. Ganti SECRET di bawah dengan kata sandi acak yang panjang (catat, nanti dipakai di Vercel).
 * 4. Pilih fungsi "siapkan" di dropdown atas → Jalankan → setujui izin yang diminta (sekali saja).
 * 5. Deploy → Deployment baru → jenis "Aplikasi web":
 *      - Jalankan sebagai: Saya
 *      - Yang memiliki akses: Siapa saja   (aman, karena setiap kiriman wajib membawa SECRET)
 *    Salin "URL aplikasi web" (berakhiran /exec).
 * 6. Di Vercel → Settings → Environment Variables, tambahkan:
 *      SHEETS_WEBHOOK_URL    = URL /exec tadi
 *      SHEETS_WEBHOOK_SECRET = SECRET yang sama
 *      NEXT_PUBLIC_SHEET_URL = alamat Google Sheet ini (opsional, untuk tombol "Buka Sheet")
 *    lalu Redeploy.
 * 7. Di aplikasi: Pengaturan → "Sinkronkan semua sekarang".
 *
 * AUDIT: bagikan Sheet ini ke Kartika dan pasangan sebagai "Pelihat" saja. Jangan beri akses edit,
 * supaya isi Sheet dan tab "Log perubahan" tetap bisa dipercaya.
 */
const SECRET = 'GANTI-DENGAN-KATA-SANDI-ACAK-YANG-PANJANG'

const RP = '"Rp"#,##0;-"Rp"#,##0'
// name: [header, ..], textCols (1-based, simpan sebagai teks agar "2026-10" tidak jadi tanggal), moneyCols
const TABS = {
  'Ringkasan Bulanan': { h: ['Kode bulan', 'Bulan', 'Gaji dan uang masuk', 'Potongan', 'Pemasukan bersih', 'Tagihan rutin', 'Cicilan dan hutang', 'Kebutuhan pokok', 'Gaya hidup', 'Tabungan', 'Investasi', 'Uang belanja', 'Pengeluaran tercatat', 'Sisa jatah'], text: [1], money: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  'Sumber Dana': { h: ['Id', 'Nama', 'Jenis', 'Saldo awal', 'Saldo sekarang'], text: [1], money: [4, 5] },
  'Pindah Dana': { h: ['Id', 'Tanggal', 'Dari', 'Ke', 'Jumlah', 'Catatan', 'Biaya admin'], text: [1, 2], money: [5, 7] },
  'Pemasukan': { h: ['Id', 'Bulan', 'Nama', 'Jenis', 'Nominal', 'Sumber dana'], text: [1, 2], money: [5] },
  'Anggaran': { h: ['Id', 'Bulan', 'Kelompok', 'Kategori', 'Jatah'], text: [1, 2], money: [5] },
  'Catatan': { h: ['Id', 'Bulan', 'Tanggal', 'Kategori', 'Catatan', 'Nominal', 'Sumber dana'], text: [1, 2, 3], money: [6] },
  'Tagihan': { h: ['Id', 'Nama', 'Jenis', 'Nominal per bulan', 'Tanggal jatuh tempo', 'Mulai', 'Sampai', 'Catatan'], text: [1, 6, 7], money: [4] },
  'Status Tagihan': { h: ['Id', 'Bulan', 'Tagihan', 'Nominal bulan itu', 'Dilewati', 'Status', 'Waktu lunas', 'Id tagihan'], text: [1, 2], money: [4] },
  'Target Tabungan': { h: ['Id', 'Nama', 'Target', 'Dana darurat'], text: [1], money: [3] },
  'Setoran Tabungan': { h: ['Id', 'Bulan', 'Target', 'Jumlah (minus = tarik)', 'Catatan', 'Id target', 'Sumber dana'], text: [1, 2], money: [4] },
  'Log perubahan': { h: ['Waktu', 'Pengguna', 'Aksi', 'Tabel', 'Rincian'], text: [], money: [] },
}

function siapkan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  Object.keys(TABS).forEach(function (name) { tab_(ss, name) })
  // hapus tab kosong bawaan ("Sheet1" / "Lembar1") bila ada
  ;['Sheet1', 'Lembar1'].forEach(function (n) {
    const d = ss.getSheetByName(n)
    if (d && ss.getSheets().length > 1 && d.getLastRow() === 0) ss.deleteSheet(d)
  })
}

function tab_(ss, name) {
  const def = TABS[name]
  let sh = ss.getSheetByName(name)
  if (!sh) sh = ss.insertSheet(name)
  if (sh.getMaxRows() < 2) sh.insertRowsAfter(1, 1)
  if (sh.getMaxColumns() < def.h.length) sh.insertColumnsAfter(sh.getMaxColumns(), def.h.length - sh.getMaxColumns())
  sh.getRange(1, 1, 1, def.h.length).setValues([def.h]).setFontWeight('bold').setBackground('#fbd5df')
  sh.setFrozenRows(1)
  def.text.forEach(function (c) { sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@') })
  def.money.forEach(function (c) { sh.getRange(2, c, sh.getMaxRows() - 1, 1).setNumberFormat(RP) })
  if (def.h[0] === 'Id') sh.hideColumns(1)
  return sh
}

// Pakai tab yang sudah ada; bila judul kolomnya berubah (versi skrip baru), rapikan ulang otomatis.
function ensure_(ss, name) {
  const def = TABS[name]
  const sh = ss.getSheetByName(name)
  if (!sh) return tab_(ss, name)
  const cur = sh.getRange(1, 1, 1, def.h.length).getValues()[0]
  for (let i = 0; i < def.h.length; i++) if (String(cur[i]) !== def.h[i]) return tab_(ss, name)
  return sh
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}

function doGet() { return json_({ ok: true, info: 'Wallet Together siap menerima kiriman.' }) }

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.waitLock(25000)
  try {
    const body = JSON.parse(e.postData.contents)
    if (body.secret !== SECRET || SECRET.indexOf('GANTI-') === 0) return json_({ ok: false, error: 'Kata sandi tidak cocok' })
    const ss = SpreadsheetApp.getActiveSpreadsheet()
    let n = 0
    ;(body.events || []).forEach(function (ev) { apply_(ss, ev); n++ })
    return json_({ ok: true, n: n })
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  } finally {
    lock.releaseLock()
  }
}

function findRow_(sh, id) {
  const last = sh.getLastRow()
  if (last < 2) return 0
  const f = sh.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext()
  return f ? f.getRow() : 0
}

function apply_(ss, ev) {
  if (ev.op === 'log') {
    const lg = ensure_(ss, 'Log perubahan')
    lg.appendRow(ev.cells)
    return
  }
  if (!TABS[ev.tab]) throw new Error('Tab tidak dikenal: ' + ev.tab)
  const sh = ensure_(ss, ev.tab)
  if (ev.op === 'reset') {
    if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1)
    return
  }
  if (ev.op === 'upsert') {
    const r = findRow_(sh, ev.id)
    if (r) sh.getRange(r, 1, 1, ev.cells.length).setValues([ev.cells])
    else {
      const next = Math.max(2, sh.getLastRow() + 1)
      sh.getRange(next, 1, 1, ev.cells.length).setValues([ev.cells])
    }
    return
  }
  if (ev.op === 'delete') {
    const r = findRow_(sh, ev.id)
    if (r) sh.deleteRow(r)
    return
  }
  if (ev.op === 'deleteWhere') {
    const col = TABS[ev.tab].h.indexOf(ev.col) + 1
    if (!col) throw new Error('Kolom tidak ada: ' + ev.col)
    for (let r = sh.getLastRow(); r >= 2; r--) {
      if (String(sh.getRange(r, col).getValue()) === String(ev.value)) sh.deleteRow(r)
    }
  }
}
