-- Terms (intakes), applications, applicant documents and the private
-- `documents` storage bucket (Stage 1, step 1.3).
--
-- Applicants create and edit their own application while it is a draft, upload
-- documents into their own folder, and submit through submit_application(),
-- which checks the application is complete. Admins read everything; review
-- decisions arrive in step 1.4.

-- Terms --------------------------------------------------------------------------

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  session text not null
    constraint terms_session_format check (session ~ '^\d{4}/\d{4}$'),
  name text not null
    constraint terms_name_length check (char_length(name) between 1 and 100),
  starts_on date,
  ends_on date,
  accepting_applications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terms_session_name_key unique (session, name),
  constraint terms_dates_order check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

comment on table public.terms is
  'Semesters or terms. A term with accepting_applications = true is an open intake.';

create trigger terms_set_updated_at
  before update on public.terms
  for each row execute function public.set_updated_at();

alter table public.terms enable row level security;

revoke all on public.terms from anon, authenticated;
grant select on public.terms to anon, authenticated;
grant insert, update, delete on public.terms to authenticated;
grant select, insert, update, delete on public.terms to service_role;

create policy "Terms are public"
  on public.terms for select to anon, authenticated
  using (true);

create policy "Admins create terms"
  on public.terms for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update terms"
  on public.terms for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete terms"
  on public.terms for delete to authenticated
  using ((select public.is_admin()));

-- Applications ---------------------------------------------------------------------

create type public.application_status as enum (
  'draft', 'submitted', 'under_review', 'admitted', 'rejected', 'withdrawn'
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  programme_id uuid references public.programmes (id),
  intake_term_id uuid references public.terms (id),

  -- Personal details (field list to confirm against the client's form: client input #4)
  surname text constraint applications_surname_length check (char_length(surname) <= 100),
  first_name text constraint applications_first_name_length check (char_length(first_name) <= 100),
  other_names text constraint applications_other_names_length check (char_length(other_names) <= 200),
  date_of_birth date
    constraint applications_date_of_birth_range
    check (date_of_birth between date '1920-01-01' and current_date),
  gender text constraint applications_gender check (gender in ('male', 'female')),
  phone text constraint applications_phone_length check (char_length(phone) <= 32),
  email text constraint applications_email_length check (char_length(email) <= 254),
  address text constraint applications_address_length check (char_length(address) <= 500),
  state_of_origin text
    constraint applications_state_of_origin_length check (char_length(state_of_origin) <= 100),
  nationality text constraint applications_nationality_length check (char_length(nationality) <= 100),
  crm_branch text constraint applications_crm_branch_length check (char_length(crm_branch) <= 200),

  -- Education: [{ "institution": "...", "qualification": "...", "year": 2020 }]
  education jsonb not null default '[]'::jsonb
    constraint applications_education_shape
    check (jsonb_typeof(education) = 'array' and jsonb_array_length(education) <= 10),

  -- Next of kin and referee
  next_of_kin_name text
    constraint applications_next_of_kin_name_length check (char_length(next_of_kin_name) <= 200),
  next_of_kin_relationship text
    constraint applications_next_of_kin_relationship_length
    check (char_length(next_of_kin_relationship) <= 100),
  next_of_kin_phone text
    constraint applications_next_of_kin_phone_length check (char_length(next_of_kin_phone) <= 32),
  referee_name text
    constraint applications_referee_name_length check (char_length(referee_name) <= 200),
  referee_position text
    constraint applications_referee_position_length check (char_length(referee_position) <= 200),
  referee_phone text
    constraint applications_referee_phone_length check (char_length(referee_phone) <= 32),
  referee_email text
    constraint applications_referee_email_length check (char_length(referee_email) <= 254),

  consent_given_at timestamptz,

  status public.application_status not null default 'draft',
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  decision_note text
    constraint applications_decision_note_length check (char_length(decision_note) <= 2000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.applications is
  'Admission applications. Editable by the applicant only while draft; submitted through submit_application().';

-- One open application per applicant (a rejected or withdrawn applicant may apply again).
create unique index applications_one_open_per_applicant
  on public.applications (applicant_id)
  where status in ('draft', 'submitted', 'under_review', 'admitted');

create index applications_status_idx on public.applications (status, submitted_at);
create index applications_programme_idx on public.applications (programme_id);
create index applications_intake_idx on public.applications (intake_term_id);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

alter table public.applications enable row level security;

-- Applicants may write only their own answers; status and review columns are
-- changed by submit_application() and (step 1.4) admin review functions.
revoke all on public.applications from anon, authenticated;
grant select on public.applications to authenticated;
grant insert (
  id, applicant_id, programme_id, intake_term_id,
  surname, first_name, other_names, date_of_birth, gender, phone, email, address,
  state_of_origin, nationality, crm_branch, education,
  next_of_kin_name, next_of_kin_relationship, next_of_kin_phone,
  referee_name, referee_position, referee_phone, referee_email
) on public.applications to authenticated;
grant update (
  programme_id, intake_term_id,
  surname, first_name, other_names, date_of_birth, gender, phone, email, address,
  state_of_origin, nationality, crm_branch, education,
  next_of_kin_name, next_of_kin_relationship, next_of_kin_phone,
  referee_name, referee_position, referee_phone, referee_email,
  consent_given_at
) on public.applications to authenticated;
grant select, insert, update, delete on public.applications to service_role;

create policy "Applicants read their own applications"
  on public.applications for select to authenticated
  using (applicant_id = (select auth.uid()));

create policy "Admins read all applications"
  on public.applications for select to authenticated
  using ((select public.is_admin()));

create policy "Applicants start their own application"
  on public.applications for insert to authenticated
  with check (
    applicant_id = (select auth.uid())
    and status = 'draft'
    and (select public.current_app_role()) = 'applicant'
  );

create policy "Applicants edit their own draft"
  on public.applications for update to authenticated
  using (applicant_id = (select auth.uid()) and status = 'draft')
  with check (applicant_id = (select auth.uid()) and status = 'draft');

-- Documents ------------------------------------------------------------------------

create type public.document_kind as enum ('transcript', 'id_card', 'photo', 'other');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  kind public.document_kind not null,
  storage_path text not null unique,
  file_name text not null
    constraint documents_file_name_length check (char_length(file_name) between 1 and 200),
  size_bytes integer not null
    constraint documents_size_limit check (size_bytes between 1 and 5242880),
  mime text not null
    constraint documents_mime_allowed check (mime in ('application/pdf', 'image/jpeg', 'image/png')),
  created_at timestamptz not null default now(),
  constraint documents_path_matches_owner check (
    split_part(storage_path, '/', 1) = owner_id::text
    and split_part(storage_path, '/', 2) = coalesce(application_id::text, '')
  )
);

comment on table public.documents is
  'Applicant and student documents. Files live in the private `documents` bucket at {owner_id}/{application_id}/{uuid}.{ext}.';

create index documents_application_idx on public.documents (application_id);
create index documents_owner_idx on public.documents (owner_id);

alter table public.documents enable row level security;

revoke all on public.documents from anon, authenticated;
grant select, delete on public.documents to authenticated;
grant insert (owner_id, application_id, kind, storage_path, file_name, size_bytes, mime)
  on public.documents to authenticated;
grant select, insert, update, delete on public.documents to service_role;

create policy "Owners read their own documents"
  on public.documents for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Admins read all documents"
  on public.documents for select to authenticated
  using ((select public.is_admin()));

create policy "Applicants add documents to their own draft"
  on public.documents for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and a.applicant_id = (select auth.uid())
        and a.status = 'draft'
    )
  );

create policy "Applicants remove documents from their own draft"
  on public.documents for delete to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and a.applicant_id = (select auth.uid())
        and a.status = 'draft'
    )
  );

-- Submitting -------------------------------------------------------------------------

create or replace function public.submit_application(p_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
  missing text[] := array[]::text[];
begin
  select * into app
  from public.applications
  where id = p_application_id and applicant_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  if app.status <> 'draft' then
    raise exception 'Application already submitted' using errcode = '55000';
  end if;

  if app.programme_id is null or not exists (
    select 1 from public.programmes p where p.id = app.programme_id and p.status = 'published'
  ) then
    missing := array_append(missing, 'programme_id');
  end if;

  if app.intake_term_id is null or not exists (
    select 1 from public.terms t where t.id = app.intake_term_id and t.accepting_applications
  ) then
    missing := array_append(missing, 'intake_term_id');
  end if;

  if coalesce(trim(app.surname), '') = '' then missing := array_append(missing, 'surname'); end if;
  if coalesce(trim(app.first_name), '') = '' then missing := array_append(missing, 'first_name'); end if;
  if app.date_of_birth is null then missing := array_append(missing, 'date_of_birth'); end if;
  if app.gender is null then missing := array_append(missing, 'gender'); end if;
  if coalesce(trim(app.phone), '') = '' then missing := array_append(missing, 'phone'); end if;
  if coalesce(trim(app.email), '') = '' then missing := array_append(missing, 'email'); end if;
  if coalesce(trim(app.address), '') = '' then missing := array_append(missing, 'address'); end if;
  if coalesce(trim(app.state_of_origin), '') = '' then missing := array_append(missing, 'state_of_origin'); end if;
  if coalesce(trim(app.nationality), '') = '' then missing := array_append(missing, 'nationality'); end if;
  if jsonb_array_length(app.education) = 0 then missing := array_append(missing, 'education'); end if;
  if coalesce(trim(app.next_of_kin_name), '') = '' then missing := array_append(missing, 'next_of_kin_name'); end if;
  if coalesce(trim(app.next_of_kin_relationship), '') = '' then
    missing := array_append(missing, 'next_of_kin_relationship');
  end if;
  if coalesce(trim(app.next_of_kin_phone), '') = '' then missing := array_append(missing, 'next_of_kin_phone'); end if;
  if app.consent_given_at is null then missing := array_append(missing, 'consent'); end if;

  if not exists (
    select 1 from public.documents d
    where d.application_id = app.id and d.kind = 'transcript'
  ) then
    missing := array_append(missing, 'transcript');
  end if;

  if cardinality(missing) > 0 then
    raise exception 'Application incomplete'
      using errcode = '23514', detail = array_to_string(missing, ',');
  end if;

  update public.applications
  set status = 'submitted', submitted_at = now()
  where id = app.id
  returning * into app;

  return app;
end;
$$;

comment on function public.submit_application(uuid) is
  'Submit the caller''s draft application after checking it is complete. Raises 23514 with the missing fields in DETAIL.';

revoke execute on function public.submit_application(uuid) from public, anon;
grant execute on function public.submit_application(uuid) to authenticated;

-- Storage: private `documents` bucket ---------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Paths are {owner_id}/{application_id}/{uuid}.{ext}.

create policy "Applicants upload to their own draft folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.applicant_id = (select auth.uid())
        and a.status = 'draft'
    )
  );

create policy "Owners read their own files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Applicants remove files from their own draft"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.applicant_id = (select auth.uid())
        and a.status = 'draft'
    )
  );

create policy "Admins read all files"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (select public.is_admin()));
