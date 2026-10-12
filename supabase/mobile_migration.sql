-- Mobile/Desktop upgrade: historical currencies, preferences, liabilities and sync timestamps.
-- Safe to run after the original schema.sql in Supabase SQL Editor.

alter table public.transactions
  add column if not exists currency_code text not null default 'UGX',
  add column if not exists exchange_rate_to_ugx numeric(20, 8) not null default 1,
  add column if not exists updated_at timestamptz not null default now();

alter table public.transactions
  alter column amount type numeric(20, 4);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_currency_code_check') then
    alter table public.transactions add constraint transactions_currency_code_check
      check (currency_code ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_exchange_rate_check') then
    alter table public.transactions add constraint transactions_exchange_rate_check
      check (exchange_rate_to_ugx > 0);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

-- Synced user preference. The client also caches this locally for instant startup.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_currency text not null default 'UGX' check (preferred_currency ~ '^[A-Z]{3}$'),
  daily_reminder_enabled boolean not null default false,
  daily_reminder_time time not null default '19:00',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
alter table public.user_preferences force row level security;
drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences" on public.user_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on table public.user_preferences from anon;
grant select, insert, update, delete on table public.user_preferences to authenticated;
drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

-- Loans and debts sync across devices; notification IDs are derived from id.
create table if not exists public.liabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  kind text not null check (kind in ('loan', 'debt')),
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null default 'UGX' check (currency_code ~ '^[A-Z]{3}$'),
  exchange_rate_to_ugx numeric(20, 8) not null default 1 check (exchange_rate_to_ugx > 0),
  due_date date not null,
  recurrence text not null default 'none' check (recurrence in ('none', 'monthly')),
  reminder_days_before smallint not null default 1 check (reminder_days_before between 0 and 30),
  reminder_time time not null default '09:00',
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists liabilities_user_due_idx on public.liabilities (user_id, status, due_date);
alter table public.liabilities enable row level security;
alter table public.liabilities force row level security;
drop policy if exists "Users manage own liabilities" on public.liabilities;
create policy "Users manage own liabilities" on public.liabilities
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on table public.liabilities from anon;
grant select, insert, update, delete on table public.liabilities to authenticated;

drop trigger if exists liabilities_set_updated_at on public.liabilities;
create trigger liabilities_set_updated_at
before update on public.liabilities
for each row execute function public.set_updated_at();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_preferences') then
    alter publication supabase_realtime add table public.user_preferences;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'liabilities') then
    alter publication supabase_realtime add table public.liabilities;
  end if;
end $$;
