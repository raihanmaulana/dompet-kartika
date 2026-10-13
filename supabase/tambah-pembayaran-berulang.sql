-- Wallet Together — pembayaran tagihan dari sumber dana, penyesuaian saldo, dan pengeluaran berulang.
-- Hanya MENAMBAH tabel/kolom baru. Tidak menghapus atau mengubah data yang sudah ada. Aman dijalankan ulang.

-- 1) Pembayaran tagihan/cicilan/kartu kredit (bisa dicicil, tiap pembayaran memilih sumber dana)
create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  ym text not null check (ym ~ '^\d{4}-\d{2}$'),
  amount bigint not null check (amount > 0),
  pocket_id uuid references public.pockets(id) on delete set null,
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists bill_payments_idx on public.bill_payments(owner_id, ym);

-- 2) Penyesuaian saldo ("samakan dengan saldo asli"); jumlah bertanda (+ / -)
create table if not exists public.pocket_adjustments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pocket_id uuid not null references public.pockets(id) on delete cascade,
  amount bigint not null,
  note text not null default '',
  adjusted_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists pocket_adjustments_idx on public.pocket_adjustments(owner_id);

-- 3) Pengeluaran berulang (uang kos, langganan, dll) → otomatis jadi catatan tiap bulan
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  amount bigint not null check (amount > 0),
  category_label text not null default '',
  pocket_id uuid references public.pockets(id) on delete set null,
  day int not null default 1 check (day between 1 and 31),
  start_ym text not null check (start_ym ~ '^\d{4}-\d{2}$'),
  end_ym text check (end_ym is null or end_ym ~ '^\d{4}-\d{2}$'),
  skipped_ym text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists recurring_idx on public.recurring_expenses(owner_id);
alter table public.expenses add column if not exists recurring_id uuid references public.recurring_expenses(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_recurring_ym_key') then
    alter table public.expenses add constraint expenses_recurring_ym_key unique (recurring_id, ym);
  end if;
end $$;

alter table public.bill_payments enable row level security;
alter table public.pocket_adjustments enable row level security;
alter table public.recurring_expenses enable row level security;

do $$
declare t text;
begin
  foreach t in array array['bill_payments','pocket_adjustments','recurring_expenses'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (public.can_view(owner_id))', t);
    execute format('create policy "%1$s_write" on public.%1$s for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;
