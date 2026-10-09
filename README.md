# Dompet Kartika

Aplikasi web untuk mencatat pengeluaran harian, mengatur anggaran, tagihan/hutang, tabungan, dan simulasi investasi.
**Semua data tersimpan per bulan** (anggaran, catatan, tagihan, status bayar), jadi ganti bulan = isi berbeda.
Cicilan dan hutang otomatis dipotong dari uang belanja (jatah) bulan itu.

Stack: Next.js 15 (App Router) · Supabase (Auth + Postgres + Row Level Security) · Vercel (gratis).

## Pasang (sekitar 10 menit)

### 1. Supabase (database + login)
1. Daftar di supabase.com → **New project** (paket Free). Simpan password database.
2. Buka **SQL Editor** → New query → tempel seluruh isi `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: salin `Project URL` dan `anon public` key.
4. (Disarankan) **Authentication → Providers → Email**: matikan *Confirm email* supaya bisa langsung masuk setelah daftar. Kalau dibiarkan menyala, tautan konfirmasi akan dikirim ke email.
5. Setelah punya alamat situs Vercel (langkah 2): **Authentication → URL Configuration** → isi *Site URL* dengan alamat itu dan tambahkan `https://ALAMAT-KAMU.vercel.app/auth/callback` di *Redirect URLs*.

### 2. Vercel (hosting)
1. Push folder ini ke repo GitHub.
2. vercel.com → **Add New → Project** → pilih repo → framework terdeteksi *Next.js*.
3. **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (isi dari langkah 1.3). Jangan isi `DEMO_MODE`.
4. **Deploy**.

### 3. Pakai
- Kartika membuka situs → **Daftar** → mulai dari rencana awal.
- Pasangan: daftar dengan emailnya sendiri. Kartika membuka **Pengaturan → Boleh dipantau oleh** dan memasukkan email pasangan. Setelah masuk, pasangan melihat data Kartika dalam mode lihat saja (tidak bisa mengubah).

## Cara kerja per bulan
- Pilih bulan di kanan atas; seluruh halaman mengikuti bulan itu.
- Bulan baru kosong → tombol **Salin dari bulan lalu** (anggaran dan pemasukan), lalu ubah sesukanya tanpa memengaruhi bulan lain.
- Tagihan/hutang dibuat sekali dengan bulan mulai dan lama (atau terus-menerus). Per bulan bisa: ubah nominal bulan itu saja, ubah dari bulan itu seterusnya, lewati satu bulan, tandai lunas, atau hentikan.
- Uang belanja = pemasukan bersih − tagihan/cicilan/hutang − tabungan − investasi. Sisa jatah = uang belanja − pengeluaran tercatat.

## Google Sheet untuk audit (opsional)

Setiap perubahan di aplikasi disalin otomatis ke Google Sheet (satu arah: aplikasi → Sheet). Tab: Pemasukan, Anggaran, Catatan, Tagihan, Status Tagihan, Target Tabungan, Setoran Tabungan, Ringkasan Bulanan, dan **Log perubahan** (siapa, kapan, apa).

1. Buat Google Sheet kosong → **Extensions → Apps Script**.
2. Tempel isi `google-apps-script/Code.gs`, ganti `SECRET` dengan kata sandi acak panjang, lalu jalankan fungsi `siapkan` sekali (izinkan akses).
3. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone*. Salin URL `/exec`.
4. Di Vercel → Environment Variables isi `SHEETS_WEBHOOK_URL` (URL tadi), `SHEETS_WEBHOOK_SECRET` (sama dengan SECRET), dan opsional `NEXT_PUBLIC_SHEET_URL`. Redeploy.
5. Buka **Pengaturan → Sinkronkan semua sekarang** untuk mengisi data yang sudah ada.
6. Bagikan Sheet sebagai **Viewer** saja. Mengubah Sheet tidak mengubah aplikasi.

Sinkron bersifat best-effort: jika gagal, aksi di aplikasi tetap berhasil; tekan "Sinkronkan semua" untuk memulihkan.

## Lokal
```
cp .env.example .env.local   # isi key Supabase
npm install
npm run dev
npm test                     # tes logika hitung
```
Lihat tampilan tanpa database: `DEMO_MODE=1 npm run dev` (data contoh, tidak tersimpan).
