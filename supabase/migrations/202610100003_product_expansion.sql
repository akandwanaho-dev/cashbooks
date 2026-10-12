-- Cashbook product expansion: accounts, profiles, social content, admin controls.
-- Run AFTER schema.sql and mobile_migration.sql.

-- Expense detail fields retain compatibility with the existing cash ledger.
alter table public.transactions
  add column if not exists account_id uuid,
  add column if not exists merchant text,
  add column if not exists notes text,
  add column if not exists occurred_at timestamptz;
update public.transactions set occurred_at = (date::timestamp at time zone 'Africa/Kampala') where occurred_at is null;
alter table public.transactions alter column occurred_at set default now();
alter table public.transactions alter column occurred_at set not null;

create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  icon text not null default 'WalletCards',
  color text not null default '#10b981' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  budget_amount numeric(20,4) check (budget_amount is null or budget_amount >= 0),
  budget_currency text not null default 'UGX' check (budget_currency ~ '^[A-Z]{3}$'),
  archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounts_user_idx on public.accounts(user_id, archived, sort_order);

-- Add the FK after accounts exists. Deleting a box keeps its financial records.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_account_id_fkey') then
    alter table public.transactions add constraint transactions_account_id_fkey
      foreign key (account_id) references public.accounts(id) on delete set null;
  end if;
end $$;
create index if not exists transactions_account_idx on public.transactions(user_id, account_id, occurred_at desc);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9._-]{3,40}$'),
  full_name text not null default '',
  avatar_url text,
  phone text,
  bio text check (bio is null or char_length(bio) <= 300),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'support', 'user')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- SECURITY DEFINER avoids recursive user_roles RLS checks. No client can grant itself a role.
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id = check_user_id and role = 'admin') $$;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create table if not exists public.money_quotes (
  id uuid primary key default uuid_generate_v4(),
  text text not null check (char_length(trim(text)) between 3 and 300),
  author text,
  category text not null default 'Motivation',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_reminder_enabled boolean not null default false,
  daily_reminder_time time not null default '19:00',
  quotes_enabled boolean not null default true,
  expense_reminders_enabled boolean not null default true,
  debt_reminders_enabled boolean not null default true,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  setting_key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Automatic timestamps.
do $$
declare table_name text;
begin
  foreach table_name in array array['accounts','profiles','money_quotes','notification_preferences','app_settings'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

-- Create private defaults when a Supabase Auth user is created.
create or replace function public.handle_new_cashbook_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare safe_username text;
begin
  safe_username := regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^A-Za-z0-9._-]', '', 'g');
  if char_length(safe_username) < 3 then safe_username := 'user_' || left(new.id::text, 8); end if;
  insert into public.profiles(user_id, username, full_name)
    values(new.id, safe_username || '_' || left(new.id::text, 4), coalesce(new.raw_user_meta_data->>'full_name', safe_username))
    on conflict (user_id) do nothing;
  insert into public.notification_preferences(user_id) values(new.id) on conflict do nothing;
  insert into public.accounts(user_id, name, description, icon, color, sort_order) values
    (new.id, 'Home', 'Household bills and family needs', 'Home', '#10b981', 1),
    (new.id, 'Personal', 'Personal care and everyday spending', 'UserRound', '#f59e0b', 2);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_cashbook on auth.users;
create trigger on_auth_user_created_cashbook after insert on auth.users
for each row execute function public.handle_new_cashbook_user();

-- Backfill profiles and defaults for accounts that existed before this migration.
insert into public.profiles(user_id, username, full_name, onboarding_completed)
select u.id,
  coalesce(nullif(regexp_replace(split_part(coalesce(u.email, 'user'), '@', 1), '[^A-Za-z0-9._-]', '', 'g'), ''), 'user') || '_' || left(u.id::text, 4),
  coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, 'User'), '@', 1)),
  false
from auth.users u
on conflict (user_id) do nothing;
insert into public.notification_preferences(user_id)
select id from auth.users on conflict (user_id) do nothing;
insert into public.accounts(user_id, name, description, icon, color, sort_order)
select u.id, defaults.name, defaults.description, defaults.icon, defaults.color, defaults.sort_order
from auth.users u
cross join (values
  ('Home', 'Household bills and family needs', 'Home', '#10b981', 1),
  ('Personal', 'Personal care and everyday spending', 'UserRound', '#f59e0b', 2)
) as defaults(name, description, icon, color, sort_order)
where not exists (select 1 from public.accounts a where a.user_id = u.id);

-- RLS: users own finance data; administrators manage only global/admin content.
alter table public.accounts enable row level security;
alter table public.accounts force row level security;
drop policy if exists "Users manage own accounts" on public.accounts;
create policy "Users manage own accounts" on public.accounts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Tighten transaction writes so account_id can only reference the same user's box.
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can insert own transactions" on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id and (account_id is null or exists(select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))));
create policy "Users can update own transactions" on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (account_id is null or exists(select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))));

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
drop policy if exists "Users and admins read profiles" on public.profiles;
drop policy if exists "Users and admins update profiles" on public.profiles;
drop policy if exists "Users create own profile" on public.profiles;
create policy "Users and admins read profiles" on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
create policy "Users and admins update profiles" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());
create policy "Users create own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
drop policy if exists "Users read own role and admins read roles" on public.user_roles;
drop policy if exists "Admins manage roles" on public.user_roles;
create policy "Users read own role and admins read roles" on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.money_quotes enable row level security;
alter table public.money_quotes force row level security;
drop policy if exists "Authenticated users read active quotes" on public.money_quotes;
drop policy if exists "Admins read all quotes" on public.money_quotes;
drop policy if exists "Admins manage quotes" on public.money_quotes;
create policy "Authenticated users read active quotes" on public.money_quotes for select to authenticated using (active);
create policy "Admins read all quotes" on public.money_quotes for select to authenticated using (public.is_admin());
create policy "Admins manage quotes" on public.money_quotes for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
drop policy if exists "Users manage notification preferences" on public.notification_preferences;
create policy "Users manage notification preferences" on public.notification_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter table public.app_settings enable row level security;
alter table public.app_settings force row level security;
drop policy if exists "Authenticated users read app settings" on public.app_settings;
drop policy if exists "Admins manage app settings" on public.app_settings;
create policy "Authenticated users read app settings" on public.app_settings for select to authenticated using (true);
create policy "Admins manage app settings" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.accounts, public.profiles, public.user_roles, public.money_quotes, public.notification_preferences, public.app_settings from anon;
grant select, insert, update, delete on public.accounts, public.profiles, public.notification_preferences to authenticated;
grant select on public.user_roles, public.money_quotes, public.app_settings to authenticated;
grant insert, update, delete on public.user_roles, public.money_quotes, public.app_settings to authenticated;

-- Public avatar objects are readable, while users may only write inside their UUID folder.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880;
drop policy if exists "Avatar images are publicly readable" on storage.objects;
drop policy if exists "Users upload own avatar" on storage.objects;
drop policy if exists "Users update own avatar" on storage.objects;
drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Avatar images are publicly readable" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own avatar" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Starter quote library.
insert into public.money_quotes(text, author, category, active)
select * from (values
  ('Small savings today can create big opportunities tomorrow.', 'Cashbook', 'Saving', true),
  ('A budget is telling your money where to go instead of wondering where it went.', 'Dave Ramsey', 'Budgeting', true),
  ('Do not save what is left after spending; spend what is left after saving.', 'Warren Buffett', 'Saving', true),
  ('Every expense you record is a decision you can improve tomorrow.', 'Cashbook', 'Mindset', true)
) as starter(text, author, category, active)
where not exists (select 1 from public.money_quotes);

-- Add Realtime replication once.
do $$
declare table_name text;
begin
  foreach table_name in array array['accounts','profiles','money_quotes','notification_preferences','app_settings'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

-- IMPORTANT: bootstrap the first administrator manually with their Auth UUID:
-- insert into public.user_roles(user_id, role) values ('YOUR-AUTH-USER-UUID', 'admin');
