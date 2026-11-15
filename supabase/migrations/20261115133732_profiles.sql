-- Profiles and roles (Stage 1, step 1.2).
-- One profile per auth user, created by trigger on sign-up with role
-- `applicant`. Users read and edit their own profile; only admins read all
-- profiles and change roles. Also gives admins full access to programmes.

create type public.app_role as enum ('applicant', 'student', 'lecturer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default ''
    constraint profiles_full_name_length check (char_length(full_name) <= 200),
  phone text
    constraint profiles_phone_length check (char_length(phone) <= 32),
  role public.app_role not null default 'applicant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. Role drives access everywhere; only admins change it.';

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers ----------------------------------------------------------------
-- SECURITY DEFINER so policies can read the caller's role without recursing
-- into profiles' own RLS. They only ever look at the caller's row.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

comment on function public.current_app_role() is
  'Role of the signed-in user, or null when signed out.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = (select auth.uid())),
    false
  );
$$;

comment on function public.is_admin() is
  'True when the signed-in user is an admin.';

revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- New users get a profile ---------------------------------------------------------
-- The role is ALWAYS `applicant`: never read it from user metadata, which the
-- user controls. Staff are promoted by an admin afterwards.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 200)
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins change roles ------------------------------------------------------
-- Column grants cannot tell an admin from an applicant (both are the
-- `authenticated` database role), so a trigger guards the role column.
-- Server-side tooling (service_role, postgres) may change roles, e.g. to
-- create the first admin.
-- SECURITY INVOKER on purpose: inside a definer function current_user is the
-- owner, so the caller check below would never match.

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('authenticated', 'anon') then
    -- Nested so is_admin() only runs for API users (AND does not short-circuit reliably).
    if not public.is_admin() then
      raise exception 'Only admins can change roles'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_profile_role() from public, anon, authenticated;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Access control: profiles ---------------------------------------------------------

alter table public.profiles enable row level security;

-- This Supabase version grants API roles nothing on new tables, so every table
-- grants explicitly, service_role included (server tooling with the secret key).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, role) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create policy "Users read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Admins read all profiles"
  on public.profiles
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "Users update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Admins update any profile"
  on public.profiles
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Access control: programmes (admins) ----------------------------------------------

grant insert, update, delete on public.programmes to authenticated;
-- Missed in the programmes migration (already applied to the cloud project).
grant select, insert, update, delete on public.programmes to service_role;

create policy "Admins read all programmes"
  on public.programmes
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins create programmes"
  on public.programmes
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins update programmes"
  on public.programmes
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete programmes"
  on public.programmes
  for delete
  to authenticated
  using ((select public.is_admin()));
