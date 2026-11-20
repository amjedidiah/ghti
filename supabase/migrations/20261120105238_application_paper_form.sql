-- The online application asks what GHTI's paper "Application for Admission"
-- asks (Stage 3, step 3.5; client input #4, received 20 Nov 2026).
--
-- New: title, marital status, permanent home address, more about the next of
-- kin, work, faith and church (with the pastor's contacts), two referees, and
-- the pledge to abide by GHTI's rules. Education entries gain the address and
-- the years attended. Dropped, as the paper form does not ask for them (data
-- minimisation): state of origin; "CRM branch" becomes the church question.
-- Applications were not open yet, so only test drafts are reshaped here.

create type public.marital_status as enum ('unmarried', 'married', 'divorced', 'separated', 'widowed');

-- Documents: the pastor's signed endorsement and proof of the application fee
-- (both optional). "transcript" stays the stored value for certificates and
-- results; only its label changes.
alter type public.document_kind add value if not exists 'endorsement';
alter type public.document_kind add value if not exists 'payment_proof';

-- New columns -----------------------------------------------------------------------------

alter table public.applications
  add column title text
    constraint applications_title_length check (char_length(title) <= 30),
  add column marital_status public.marital_status,
  add column permanent_address text
    constraint applications_permanent_address_length check (char_length(permanent_address) <= 500),
  add column next_of_kin_email text
    constraint applications_next_of_kin_email_length check (char_length(next_of_kin_email) <= 254),
  add column next_of_kin_occupation text
    constraint applications_next_of_kin_occupation_length
    check (char_length(next_of_kin_occupation) <= 200),
  add column next_of_kin_address text
    constraint applications_next_of_kin_address_length check (char_length(next_of_kin_address) <= 500),
  add column occupation text
    constraint applications_occupation_length check (char_length(occupation) <= 200),
  add column employer text
    constraint applications_employer_length check (char_length(employer) <= 1000),
  add column nature_of_work text
    constraint applications_nature_of_work_length check (char_length(nature_of_work) <= 1000),
  add column born_again boolean,
  add column born_again_when text
    constraint applications_born_again_when_length check (char_length(born_again_when) <= 100),
  add column church_membership text
    constraint applications_church_membership_length check (char_length(church_membership) <= 100),
  add column church_duties text
    constraint applications_church_duties_length check (char_length(church_duties) <= 1000),
  add column pastor_name text
    constraint applications_pastor_name_length check (char_length(pastor_name) <= 200),
  add column pastor_phone text
    constraint applications_pastor_phone_length check (char_length(pastor_phone) <= 32),
  -- Two referees: [{ "name", "address", "occupation", "email", "phone" }]
  add column referees jsonb not null default '[]'::jsonb
    constraint applications_referees_shape
    check (jsonb_typeof(referees) = 'array' and jsonb_array_length(referees) <= 2),
  add column pledge_given_at timestamptz;

-- "CRM branch or church" becomes "Name and location of your church".
alter table public.applications rename column crm_branch to church;
alter table public.applications drop constraint applications_crm_branch_length;
alter table public.applications
  add constraint applications_church_length check (char_length(church) <= 300);

-- Reshape existing data ------------------------------------------------------------------

-- The single referee becomes the first of two.
update public.applications
set referees = jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
  'name', referee_name,
  'occupation', referee_position,
  'phone', referee_phone,
  'email', referee_email
)))
where coalesce(referee_name, referee_position, referee_phone, referee_email) is not null;

-- Education: { institution, qualification, year } -> { institution, address, from, to, certificate }.
update public.applications a
set education = coalesce((
  select jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'institution', e.value ->> 'institution',
      'to', e.value -> 'year',
      'certificate', e.value ->> 'qualification'
    ))
    order by e.ordinality
  )
  from jsonb_array_elements(a.education) with ordinality as e (value, ordinality)
  where jsonb_typeof(e.value) = 'object'
), '[]'::jsonb)
where jsonb_array_length(a.education) > 0;

alter table public.applications
  drop column referee_name,
  drop column referee_position,
  drop column referee_phone,
  drop column referee_email,
  drop column state_of_origin;

-- Grants: applicants write only their own answers ------------------------------------------

-- Revoking the table privilege also revokes the old column grants.
revoke insert, update on public.applications from authenticated;
grant insert (
  id, applicant_id, programme_id, intake_term_id,
  title, surname, first_name, other_names, date_of_birth, gender, marital_status, nationality,
  phone, email, address, permanent_address,
  next_of_kin_name, next_of_kin_relationship, next_of_kin_phone,
  next_of_kin_email, next_of_kin_occupation, next_of_kin_address,
  occupation, employer, nature_of_work,
  born_again, born_again_when, church, church_membership, church_duties, pastor_name, pastor_phone,
  education, referees
) on public.applications to authenticated;
grant update (
  programme_id, intake_term_id,
  title, surname, first_name, other_names, date_of_birth, gender, marital_status, nationality,
  phone, email, address, permanent_address,
  next_of_kin_name, next_of_kin_relationship, next_of_kin_phone,
  next_of_kin_email, next_of_kin_occupation, next_of_kin_address,
  occupation, employer, nature_of_work,
  born_again, born_again_when, church, church_membership, church_duties, pastor_name, pastor_phone,
  education, referees,
  consent_given_at, pledge_given_at
) on public.applications to authenticated;

-- Submitting -------------------------------------------------------------------------------

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

  -- Required answers, in the order of the form's steps.
  if coalesce(trim(app.surname), '') = '' then missing := array_append(missing, 'surname'); end if;
  if coalesce(trim(app.first_name), '') = '' then missing := array_append(missing, 'first_name'); end if;
  if app.date_of_birth is null then missing := array_append(missing, 'date_of_birth'); end if;
  if app.gender is null then missing := array_append(missing, 'gender'); end if;
  if coalesce(trim(app.nationality), '') = '' then missing := array_append(missing, 'nationality'); end if;
  if app.marital_status is null then missing := array_append(missing, 'marital_status'); end if;
  if coalesce(trim(app.phone), '') = '' then missing := array_append(missing, 'phone'); end if;
  if coalesce(trim(app.email), '') = '' then missing := array_append(missing, 'email'); end if;
  if coalesce(trim(app.address), '') = '' then missing := array_append(missing, 'address'); end if;
  if coalesce(trim(app.permanent_address), '') = '' then
    missing := array_append(missing, 'permanent_address');
  end if;
  if coalesce(trim(app.next_of_kin_name), '') = '' then missing := array_append(missing, 'next_of_kin_name'); end if;
  if coalesce(trim(app.next_of_kin_relationship), '') = '' then
    missing := array_append(missing, 'next_of_kin_relationship');
  end if;
  if coalesce(trim(app.next_of_kin_phone), '') = '' then missing := array_append(missing, 'next_of_kin_phone'); end if;
  if app.born_again is null then missing := array_append(missing, 'born_again'); end if;
  if coalesce(trim(app.church), '') = '' then missing := array_append(missing, 'church'); end if;
  if coalesce(trim(app.pastor_name), '') = '' then missing := array_append(missing, 'pastor_name'); end if;
  if coalesce(trim(app.pastor_phone), '') = '' then missing := array_append(missing, 'pastor_phone'); end if;

  if not exists (
    select 1 from jsonb_array_elements(app.education) e
    where coalesce(trim(e ->> 'institution'), '') <> '' and coalesce(trim(e ->> 'certificate'), '') <> ''
  ) then
    missing := array_append(missing, 'education');
  end if;
  if (
    select count(*) from jsonb_array_elements(app.referees) r
    where coalesce(trim(r ->> 'name'), '') <> '' and coalesce(trim(r ->> 'phone'), '') <> ''
  ) < 2 then
    missing := array_append(missing, 'referees');
  end if;

  if not exists (
    select 1 from public.documents d where d.application_id = app.id and d.kind = 'transcript'
  ) then
    missing := array_append(missing, 'transcript');
  end if;
  if not exists (
    select 1 from public.documents d where d.application_id = app.id and d.kind = 'photo'
  ) then
    missing := array_append(missing, 'photo');
  end if;

  if app.pledge_given_at is null then missing := array_append(missing, 'pledge'); end if;
  if app.consent_given_at is null then missing := array_append(missing, 'consent'); end if;

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
  'Submit the caller''s draft application after checking it is complete (the paper form''s required answers, two referees, certificates and a photo, the pledge and consent). Raises 23514 with the missing fields in DETAIL.';
