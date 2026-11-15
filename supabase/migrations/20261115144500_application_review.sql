-- Admin review of applications (Stage 1, step 1.4).
--
-- Admins move a submitted application to under_review, then admit or reject
-- it with a note the applicant sees. Every time an admin opens an applicant's
-- document, the view is logged (Nigeria Data Protection Act 2023).

-- Review functions ---------------------------------------------------------------

create or replace function public.start_review(p_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
begin
  if not public.is_admin() then
    raise exception 'Only admins can review applications' using errcode = '42501';
  end if;

  update public.applications
  set status = 'under_review', reviewed_by = (select auth.uid())
  where id = p_application_id and status = 'submitted'
  returning * into app;

  if not found then
    raise exception 'Application is not waiting for review' using errcode = '55000';
  end if;
  return app;
end;
$$;

comment on function public.start_review(uuid) is
  'Admin: mark a submitted application as under review.';

create or replace function public.decide_application(
  p_application_id uuid,
  p_decision public.application_status,
  p_note text
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Only admins can decide applications' using errcode = '42501';
  end if;

  if p_decision not in ('admitted', 'rejected') then
    raise exception 'Decision must be admitted or rejected' using errcode = '22023';
  end if;

  if p_decision = 'rejected' and note is null then
    raise exception 'A note is required when rejecting' using errcode = '23514';
  end if;

  if char_length(note) > 2000 then
    raise exception 'Note is too long' using errcode = '22001';
  end if;

  update public.applications
  set status = p_decision,
      decision_note = note,
      reviewed_by = (select auth.uid()),
      decided_at = now()
  where id = p_application_id and status in ('submitted', 'under_review')
  returning * into app;

  if not found then
    raise exception 'Application is not waiting for a decision' using errcode = '55000';
  end if;
  return app;
end;
$$;

comment on function public.decide_application(uuid, public.application_status, text) is
  'Admin: admit or reject a submitted or under-review application. Rejection needs a note, shown to the applicant.';

revoke execute on function public.start_review(uuid) from public, anon;
revoke execute on function public.decide_application(uuid, public.application_status, text)
  from public, anon;
grant execute on function public.start_review(uuid) to authenticated;
grant execute on function public.decide_application(uuid, public.application_status, text)
  to authenticated;

-- Document view log ------------------------------------------------------------------

create table public.document_views (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete cascade,
  viewer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

comment on table public.document_views is
  'Audit log: one row each time an admin opens an applicant or student document. Never edited.';

create index document_views_document_idx on public.document_views (document_id, viewed_at desc);

alter table public.document_views enable row level security;

revoke all on public.document_views from anon, authenticated;
grant select on public.document_views to authenticated;
grant insert (document_id, viewer_id) on public.document_views to authenticated;
grant select, insert, delete on public.document_views to service_role;

create policy "Admins read the document view log"
  on public.document_views for select to authenticated
  using ((select public.is_admin()));

create policy "Admins log their own document views"
  on public.document_views for insert to authenticated
  with check (viewer_id = (select auth.uid()) and (select public.is_admin()));
