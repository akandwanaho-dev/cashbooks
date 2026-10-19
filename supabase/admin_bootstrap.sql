-- Run fourth in Supabase SQL Editor, after product_migration.sql.
-- Idempotently assigns and protects the primary Cashbook administrator.

begin;

create or replace function public.assign_cashbook_primary_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'ming.zhu@atomicmail.io' then
    insert into public.user_roles(user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.assign_cashbook_primary_admin() from public;

drop trigger if exists on_auth_user_primary_cashbook_admin on auth.users;
create trigger on_auth_user_primary_cashbook_admin
after insert or update of email on auth.users
for each row execute function public.assign_cashbook_primary_admin();

insert into public.user_roles(user_id, role)
select id, 'admin'
from auth.users
where lower(email) = 'ming.zhu@atomicmail.io'
on conflict (user_id, role) do nothing;

create or replace function public.protect_cashbook_primary_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin'
     and exists (
       select 1 from auth.users
       where id = old.user_id
         and lower(email) = 'ming.zhu@atomicmail.io'
     ) then
    if tg_op = 'DELETE' then
      raise exception 'The primary Cashbook administrator role cannot be removed.'
        using errcode = '42501';
    end if;
    if new.user_id is distinct from old.user_id
       or new.role is distinct from old.role then
      raise exception 'The primary Cashbook administrator role cannot be removed.'
        using errcode = '42501';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.protect_cashbook_primary_admin() from public;

drop trigger if exists protect_cashbook_primary_admin_role on public.user_roles;
create trigger protect_cashbook_primary_admin_role
before update or delete on public.user_roles
for each row execute function public.protect_cashbook_primary_admin();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_roles'
  ) then
    alter publication supabase_realtime add table public.user_roles;
  end if;
end $$;

commit;
