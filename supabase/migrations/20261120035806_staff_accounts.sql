-- Staff accounts (Stage 3, step 3.1).
--
-- Staff (lecturers, admins) are invited by an admin, never self-registered.
-- The invitation itself goes through the Auth admin API (secret key, server
-- only); these functions give admins what they need around it:
--
-- staff_accounts()   every lecturer and admin, with sign-in email and whether
--                    they have accepted their invitation.
-- account_by_email() is there already an account for this email, and what is
--                    it? (So an applicant's or student's email is never turned
--                    into a staff account by mistake.)
-- set_staff_role()   move a staff member between lecturer and admin, or remove
--                    their staff access. Never your own role; never the last
--                    admin.

create or replace function public.staff_accounts()
returns table (
  id uuid,
  full_name text,
  role public.app_role,
  email text,
  invited_at timestamptz,
  confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can list staff' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, p.role, u.email::text, u.invited_at, u.email_confirmed_at,
           u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role in ('admin', 'lecturer')
    order by p.role, p.full_name;
end;
$$;

comment on function public.staff_accounts() is
  'Admins only: lecturers and admins with email and invitation state.';

create or replace function public.account_by_email(p_email text)
returns table (id uuid, role public.app_role, confirmed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can look up accounts' using errcode = '42501';
  end if;
  return query
    select u.id, p.role, u.email_confirmed_at is not null
    from auth.users u
    join public.profiles p on p.id = u.id
    where lower(u.email) = lower(btrim(p_email));
end;
$$;

comment on function public.account_by_email(text) is
  'Admins only: the account (id, role, confirmed) for an email, if any.';

create or replace function public.set_staff_role(p_user_id uuid, p_role public.app_role)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_role_ public.app_role;
  admins integer;
  updated public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change staff roles' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'lecturer', 'applicant') then
    raise exception 'Staff can be admins or lecturers, or lose staff access' using errcode = '22023';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role' using errcode = '55000';
  end if;

  -- Lock every admin row, so two admins cannot demote each other at once.
  perform 1 from public.profiles where role = 'admin' for update;
  select role into current_role_ from public.profiles where id = p_user_id for update;
  if current_role_ is null or current_role_ not in ('admin', 'lecturer') then
    raise exception 'Only staff roles can be changed here' using errcode = '55000';
  end if;
  if current_role_ = p_role then
    raise exception 'This person already has that role' using errcode = '55000';
  end if;
  if current_role_ = 'admin' then
    select count(*) into admins from public.profiles where role = 'admin';
    if admins <= 1 then
      raise exception 'GHTI must keep at least one admin' using errcode = '55000';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user_id returning * into updated;
  return updated;
end;
$$;

comment on function public.set_staff_role(uuid, public.app_role) is
  'Admins only: lecturer <-> admin, or remove staff access (applicant). Not your own role; never the last admin.';

revoke execute on function public.staff_accounts() from public, anon;
revoke execute on function public.account_by_email(text) from public, anon;
revoke execute on function public.set_staff_role(uuid, public.app_role) from public, anon;
grant execute on function public.staff_accounts() to authenticated;
grant execute on function public.account_by_email(text) to authenticated;
grant execute on function public.set_staff_role(uuid, public.app_role) to authenticated;
