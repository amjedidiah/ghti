-- Email notifications (Stage 1 step 1.3, Stage 2 steps 2.2 and 2.3).
--
-- account_emails()  admins look up the sign-in email of the accounts they
--                   write to (decision, welcome and results emails). The
--                   email lives in auth.users, which API roles cannot read.
-- result_notices    one row per student and term once the "results are
--                   out" email has gone, so nobody gets it twice and a run
--                   cut short by Resend's daily limit can resume.

-- Account emails ----------------------------------------------------------------------

create or replace function public.account_emails(p_user_ids uuid[])
returns table (user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can look up account emails' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text
    from auth.users u
    where u.id = any (p_user_ids) and u.email is not null;
end;
$$;

comment on function public.account_emails(uuid[]) is
  'Admins only: sign-in emails of the given accounts, for transactional emails.';

revoke execute on function public.account_emails(uuid[]) from public, anon;
grant execute on function public.account_emails(uuid[]) to authenticated, service_role;

-- Result notices ---------------------------------------------------------------------

-- A surrogate key on purpose: with (student_id, term_id) as the primary key,
-- PostgREST would read this table as a many-to-many link between students and
-- terms, making every existing students -> terms embed ambiguous.
create table public.result_notices (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  sent_at timestamptz not null default now(),
  sent_by uuid default auth.uid() references public.profiles (id) on delete set null,
  constraint result_notices_student_term_key unique (student_id, term_id)
);

comment on table public.result_notices is
  'The "results are out" email went to this student for this term. One per student and term.';

create index result_notices_term_idx on public.result_notices (term_id);

alter table public.result_notices enable row level security;

revoke all on public.result_notices from anon, authenticated;
grant select, insert on public.result_notices to authenticated;
grant select, insert, update, delete on public.result_notices to service_role;

create policy "Admins read result notices"
  on public.result_notices
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins record result notices"
  on public.result_notices
  for insert
  to authenticated
  with check ((select public.is_admin()));
