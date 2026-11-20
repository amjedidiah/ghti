-- Student records (Stage 3, step 3.5).
--
-- 1. Admins upload documents to a student's file (a certificate brought to
--    the office, a letter). They live in the same private bucket, under
--    {student_id}/records/{uuid}.{ext}, with no application. Admins may remove
--    only these; application documents stay as the applicant sent them.
-- 2. Students ask for a correction to their record ("Request a change").
--    Admins resolve each request with a note, which also goes on the file.

-- Documents uploaded by admins --------------------------------------------------------------

-- Who uploaded a document: the applicant for their own, an admin for a file.
-- Never granted to the API: it always comes from the default.
alter table public.documents
  add column uploaded_by uuid default auth.uid() references public.profiles (id) on delete set null;

comment on column public.documents.uploaded_by is
  'Who uploaded it (from auth.uid()). Earlier applicant uploads are null.';

-- Application documents: {owner}/{application}/...; documents on a student's
-- file (no application): {owner}/records/...
alter table public.documents drop constraint documents_path_matches_owner;
alter table public.documents add constraint documents_path_matches_owner check (
  split_part(storage_path, '/', 1) = owner_id::text
  and split_part(storage_path, '/', 2) = coalesce(application_id::text, 'records')
);

comment on table public.documents is
  'Applicant and student documents in the private `documents` bucket: {owner_id}/{application_id}/{uuid}.{ext} for applications, {owner_id}/records/{uuid}.{ext} for documents admins add to a student''s file.';

create policy "Admins add documents to a student's file"
  on public.documents for insert to authenticated
  with check (
    (select public.is_admin())
    and application_id is null
    and exists (select 1 from public.students s where s.id = owner_id)
  );

create policy "Admins remove documents from a student's file"
  on public.documents for delete to authenticated
  using ((select public.is_admin()) and application_id is null);

create policy "Admins upload to students' files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] = 'records'
    and (select public.is_admin())
  );

create policy "Admins remove uploads from students' files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] = 'records'
    and (select public.is_admin())
  );

-- Change requests ---------------------------------------------------------------------------

create type public.change_request_status as enum ('open', 'resolved');

-- Resolving a request writes a note of this kind on the student's file.
alter type public.record_note_kind add value if not exists 'change_request';

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.students (id) on delete restrict,
  body text not null
    constraint change_requests_body_length check (char_length(btrim(body)) between 10 and 1000),
  status public.change_request_status not null default 'open',
  resolution text
    constraint change_requests_resolution_length check (char_length(resolution) <= 800),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint change_requests_resolved_complete check (
    (status = 'open' and resolved_at is null and resolution is null)
    or (status = 'resolved' and resolved_at is not null and resolution is not null)
  )
);

comment on table public.change_requests is
  'Students'' requests to correct their record. Students add and read their own; admins resolve them with resolve_change_request().';

create index change_requests_student_idx on public.change_requests (student_id, created_at desc);
create index change_requests_open_idx on public.change_requests (created_at) where status = 'open';

-- At most three open requests per student, so the office is not flooded.
create or replace function public.change_requests_limit_open()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    select count(*) from public.change_requests
    where student_id = new.student_id and status = 'open'
  ) >= 3 then
    raise exception 'You already have 3 requests waiting. The registrar will deal with them first.'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke execute on function public.change_requests_limit_open() from public, anon, authenticated;

create trigger change_requests_limit_open
  before insert on public.change_requests
  for each row execute function public.change_requests_limit_open();

alter table public.change_requests enable row level security;

revoke all on public.change_requests from anon, authenticated;
grant select, insert (body) on public.change_requests to authenticated;
grant select, insert, update, delete on public.change_requests to service_role;

create policy "Students read their own change requests"
  on public.change_requests for select to authenticated
  using (student_id = (select auth.uid()));

create policy "Admins read change requests"
  on public.change_requests for select to authenticated
  using ((select public.is_admin()));

create policy "Students ask for a change to their own record"
  on public.change_requests for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'open'
    and (select public.current_app_role()) = 'student'
  );

-- Resolving --------------------------------------------------------------------------------

-- SECURITY DEFINER: nobody updates change_requests directly. The request and
-- the resolution go on the student's file in the same transaction.
create or replace function public.resolve_change_request(p_request_id uuid, p_note text)
returns public.change_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  note text := nullif(btrim(coalesce(p_note, '')), '');
  request public.change_requests;
begin
  if not public.is_admin() then
    raise exception 'Only admins can resolve change requests' using errcode = '42501';
  end if;
  if note is null then
    raise exception 'Say what was done' using errcode = '23514';
  end if;
  if char_length(note) > 800 then
    raise exception 'Keep the note under 800 characters' using errcode = '22001';
  end if;

  select * into request from public.change_requests where id = p_request_id for update;
  if not found then
    raise exception 'Unknown change request' using errcode = 'P0002';
  end if;
  if request.status <> 'open' then
    raise exception 'This request has already been resolved' using errcode = '55000';
  end if;

  update public.change_requests
  set status = 'resolved', resolution = note, resolved_by = (select auth.uid()), resolved_at = now()
  where id = p_request_id
  returning * into request;

  insert into public.record_notes (student_id, author_id, kind, body)
  values (
    request.student_id,
    (select auth.uid()),
    'change_request',
    'Request: ' || btrim(request.body) || E'\n' || 'Resolution: ' || note
  );

  return request;
end;
$$;

comment on function public.resolve_change_request(uuid, text) is
  'Admin: resolve a student''s change request with a note; the request and the note go on the student''s file (record_notes).';

revoke execute on function public.resolve_change_request(uuid, text) from public, anon;
grant execute on function public.resolve_change_request(uuid, text) to authenticated;
