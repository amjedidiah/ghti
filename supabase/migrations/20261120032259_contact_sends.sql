-- Daily cap on the contact form (Stage 2, step 2.6).
--
-- Each contact message sends two emails, and Resend's free tier allows 100 a
-- day, shared with the sign-up and sign-in emails applicants depend on. Vercel
-- Hobby allows only one rate-limit rule (per IP, shared with the auth forms),
-- so this caps the form's total per UTC day whatever the source. Rows hold a
-- timestamp only: no name, address or IP.

create table public.contact_sends (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

comment on table public.contact_sends is
  'One row per contact-form message sent, for the daily cap. No personal data.';

create index contact_sends_created_idx on public.contact_sends (created_at);

alter table public.contact_sends enable row level security;

-- Reached only through claim_contact_send().
revoke all on public.contact_sends from anon, authenticated;
grant select, insert, delete on public.contact_sends to service_role;

create or replace function public.claim_contact_send(p_daily_limit integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  sent_today integer;
begin
  if p_daily_limit is null or p_daily_limit < 1 or p_daily_limit > 1000 then
    raise exception 'The daily limit must be between 1 and 1000' using errcode = '22023';
  end if;

  -- One claim at a time, so two messages cannot both take the last slot.
  perform pg_advisory_xact_lock(hashtext('public.contact_sends'));

  select count(*) into sent_today
  from public.contact_sends
  where created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';

  if sent_today >= p_daily_limit then
    return false;
  end if;

  insert into public.contact_sends default values;
  -- Old days are never needed again.
  delete from public.contact_sends where created_at < now() - interval '7 days';
  return true;
end;
$$;

comment on function public.claim_contact_send(integer) is
  'Take one of today''s contact-form slots; false when the daily limit is reached.';

revoke execute on function public.claim_contact_send(integer) from public;
grant execute on function public.claim_contact_send(integer) to anon, authenticated, service_role;
