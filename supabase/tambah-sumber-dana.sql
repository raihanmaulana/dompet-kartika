-- Dompet Kartika — fitur "Sumber dana" (bank, e-wallet, tunai).
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.

create table if not exists public.pockets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'bank' check (kind in ('bank','ewallet','tunai','lainnya')),
  opening_balance bigint not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pocket_transfers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  from_pocket uuid not null references public.pockets(id) on delete cascade,
  to_pocket uuid not null references public.pockets(id) on delete cascade,
  amount bigint not null check (amount > 0),
  moved_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (from_pocket <> to_pocket)
);

alter table public.income_items add column if not exists pocket_id uuid references public.pockets(id) on delete set null;
alter table public.expenses add column if not exists pocket_id uuid references public.pockets(id) on delete set null;
alter table public.goal_deposits add column if not exists pocket_id uuid references public.pockets(id) on delete set null;

create index if not exists pockets_idx on public.pockets(owner_id);
create index if not exists pocket_transfers_idx on public.pocket_transfers(owner_id);

alter table public.pockets enable row level security;
alter table public.pocket_transfers enable row level security;

do $$
declare t text;
begin
  foreach t in array array['pockets','pocket_transfers'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (public.can_view(owner_id))', t);
    execute format('create policy "%1$s_write" on public.%1$s for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;
