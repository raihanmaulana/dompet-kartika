-- Jenis tagihan "Kartu kredit": pembayaran minimum + progres sudah bayar. Aman dijalankan berulang.
alter table public.bills add column if not exists min_payment bigint not null default 0;
alter table public.bill_months add column if not exists paid_amount bigint not null default 0;
alter table public.bills drop constraint if exists bills_kind_check;
alter table public.bills add constraint bills_kind_check check (kind in ('tagihan','cicilan','hutang','kartu'));
