-- Cashbook database schema
-- Run this entire file in Supabase Dashboard -> SQL Editor.

-- UUID generation support. Supabase also supports gen_random_uuid(), but this
-- extension keeps the requested uuid_generate_v4() default explicit.
create extension if not exists "uuid-ossp";

create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  description text not null check (char_length(trim(description)) > 0),
  type text not null check (type in ('debit', 'credit')),
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null default 'UGX' check (currency_code ~ '^[A-Z]{3}$'),
  exchange_rate_to_ugx numeric(20, 8) not null default 1 check (exchange_rate_to_ugx > 0),
  category text not null check (char_length(trim(category)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Speeds up per-user date-ordered ledger queries.
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc, created_at desc);

alter table public.transactions enable row level security;
alter table public.transactions force row level security;

-- Re-running this file is safe: replace policies instead of creating duplicates.
drop policy if exists "Users can select own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;

create policy "Users can select own transactions"
  on public.transactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own transactions"
  on public.transactions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own transactions"
  on public.transactions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own transactions"
  on public.transactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Explicit grants; RLS still evaluates every authenticated request.
revoke all on table public.transactions from anon;
grant select, insert, update, delete on table public.transactions to authenticated;

-- Add the table to Supabase Realtime once. This guarded block is idempotent.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;
