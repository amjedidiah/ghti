-- RLS, grants, submission and storage tests for terms, applications and
-- documents (Stage 1, step 1.3; the paper form's questions from step 3.5).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

-- Fixtures ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test', '{"full_name": "Applicant A"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.test', '{"full_name": "Applicant B"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'student@example.test', '{"full_name": "Student"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin@example.test', '{"full_name": "Admin"}');

update public.profiles set role = 'student' where id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d1';

insert into public.programmes (id, slug, title, level, duration, status) values
  ('00000000-0000-0000-0000-0000000000a9', 'test-apply-programme', 'Test Programme', 'diploma', '2 years', 'published');

insert into public.terms (id, session, name, accepting_applications) values
  ('00000000-0000-0000-0000-0000000000e1', '2099/2100', 'Test open intake', true),
  ('00000000-0000-0000-0000-0000000000e2', '2099/2100', 'Test closed intake', false);

-- What submit_application() reports as missing (its error DETAIL), or '' once
-- it submits. Runs as the caller.
create function pg_temp.missing(p_application_id uuid) returns text
language plpgsql as $$
declare
  detail text;
begin
  perform public.submit_application(p_application_id);
  return '';
exception when check_violation then
  get stacked diagnostics detail = pg_exception_detail;
  return detail;
end;
$$;

-- Structure ---------------------------------------------------------------------------

select has_table('public', 'terms', 'terms table exists');
select has_table('public', 'applications', 'applications table exists');
select has_table('public', 'documents', 'documents table exists');

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.terms'::regclass, 'public.applications'::regclass, 'public.documents'::regclass)),
  'RLS is enabled on terms, applications and documents'
);

select policies_are('public', 'applications', array[
  'Applicants read their own applications',
  'Admins read all applications',
  'Applicants start their own application',
  'Applicants edit their own draft'
], 'applications has only the expected policies');

select policies_are('public', 'documents', array[
  'Owners read their own documents',
  'Admins read all documents',
  'Applicants add documents to their own draft',
  'Applicants remove documents from their own draft'
], 'documents has only the expected policies');

select is(
  (select public from storage.buckets where id = 'documents'),
  false,
  'the documents bucket is private'
);

-- Anonymous visitors ---------------------------------------------------------------------

set local role anon;

select ok(
  (select count(*) from public.terms where session = '2099/2100') = 2,
  'anon can read terms (intakes)'
);

select throws_ok($$ select * from public.applications $$, '42501', null,
  'anon cannot read applications');

reset role;

-- Applicant A -----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.terms (session, name) values ('2099/2100', 'Sneaky') $$,
  '42501', null, 'an applicant cannot create terms'
);

select lives_ok(
  $$ insert into public.applications (id) values ('00000000-0000-0000-0000-0000000000f1') $$,
  'an applicant can start their own draft'
);

select throws_ok(
  $$ insert into public.applications (id) values ('00000000-0000-0000-0000-0000000000f2') $$,
  '23505', null, 'an applicant cannot have two open applications'
);

select throws_ok(
  $$ insert into public.applications (applicant_id)
     values ('00000000-0000-0000-0000-0000000000b1') $$,
  '42501', null, 'an applicant cannot start an application for someone else'
);

select throws_ok(
  $$ insert into public.applications (status) values ('admitted') $$,
  '42501', null, 'an applicant cannot set the status when starting'
);

select lives_ok(
  $$ update public.applications set surname = 'Obi', first_name = 'Ada'
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'an applicant can edit their own draft'
);

select throws_ok(
  $$ update public.applications set status = 'admitted'
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  '42501', null, 'an applicant cannot change the status directly'
);

select throws_ok(
  $$ update public.applications set decision_note = 'self-approved'
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  '42501', null, 'an applicant cannot write review fields'
);

select throws_ok(
  $$ insert into public.documents (application_id, kind, storage_path, file_name, size_bytes, mime)
     values ('00000000-0000-0000-0000-0000000000f1', 'transcript',
             '00000000-0000-0000-0000-0000000000b1/00000000-0000-0000-0000-0000000000f1/x.pdf',
             'x.pdf', 100, 'application/pdf') $$,
  '23514', null, 'a document path must be in the owner''s own folder'
);

select throws_ok(
  $$ select public.submit_application('00000000-0000-0000-0000-0000000000f1') $$,
  '23514', 'Application incomplete', 'an incomplete application cannot be submitted'
);

select is(
  pg_temp.missing('00000000-0000-0000-0000-0000000000f1'),
  'programme_id,intake_term_id,date_of_birth,gender,nationality,marital_status,phone,email,address,'
    || 'permanent_address,next_of_kin_name,next_of_kin_relationship,next_of_kin_phone,born_again,'
    || 'church,pastor_name,pastor_phone,education,referees,transcript,photo,pledge,consent',
  'submitting reports every missing answer of the paper form, in step order'
);

select throws_ok(
  $$ update public.applications set referees = '[{}, {}, {}]'
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  '23514', null, 'an application holds at most two referees'
);

-- Storage: upload into own draft folder, not anyone else's.
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000f1/transcript.pdf') $$,
  'an applicant can upload into their own draft folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '00000000-0000-0000-0000-0000000000b1/00000000-0000-0000-0000-0000000000f1/evil.pdf') $$,
  '42501', null, 'an applicant cannot upload into someone else''s folder'
);

select lives_ok(
  $$ insert into public.documents (application_id, kind, storage_path, file_name, size_bytes, mime)
     values ('00000000-0000-0000-0000-0000000000f1', 'transcript',
             '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000f1/transcript.pdf',
             'transcript.pdf', 1000, 'application/pdf') $$,
  'an applicant can record a document on their own draft'
);

-- The applicant answers everything, but names only one complete referee.
update public.applications set
  programme_id = '00000000-0000-0000-0000-0000000000a9',
  intake_term_id = '00000000-0000-0000-0000-0000000000e1',
  title = 'Mrs', date_of_birth = '2000-01-01', gender = 'female', marital_status = 'married',
  nationality = 'Nigerian', phone = '+2348012345678', email = 'a@example.test',
  address = '1 Test Street', permanent_address = '2 Home Street',
  next_of_kin_name = 'Kin', next_of_kin_relationship = 'Mother', next_of_kin_phone = '+2348000000000',
  occupation = 'Teacher', born_again = true, born_again_when = '2010',
  church = 'Test Church, Owerri', pastor_name = 'Pastor P', pastor_phone = '+2348000000002',
  education = '[{"institution": "Test School", "certificate": "WASSCE", "to": 2018}]',
  referees = '[{"name": "Ref One", "phone": "+2348000000003"}, {"name": "Ref Two"}]',
  pledge_given_at = now(), consent_given_at = now()
where id = '00000000-0000-0000-0000-0000000000f1';

insert into public.documents (application_id, kind, storage_path, file_name, size_bytes, mime)
values ('00000000-0000-0000-0000-0000000000f1', 'photo',
        '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000f1/photo.jpg',
        'photo.jpg', 1000, 'image/jpeg');

select is(
  pg_temp.missing('00000000-0000-0000-0000-0000000000f1'),
  'referees',
  'both referees need a name and a phone number'
);

update public.applications
set referees = '[{"name": "Ref One", "phone": "+2348000000003"}, {"name": "Ref Two", "phone": "+2348000000004"}]'
where id = '00000000-0000-0000-0000-0000000000f1';

select is(
  (select status::text from public.submit_application('00000000-0000-0000-0000-0000000000f1')),
  'submitted',
  'a complete application can be submitted'
);

select throws_ok(
  $$ select public.submit_application('00000000-0000-0000-0000-0000000000f1') $$,
  '55000', 'Application already submitted', 'an application cannot be submitted twice'
);

-- After submission, edits and document changes have no effect.
update public.applications set surname = 'Changed' where id = '00000000-0000-0000-0000-0000000000f1';
delete from public.documents where application_id = '00000000-0000-0000-0000-0000000000f1';

reset role;

select is(
  (select surname from public.applications where id = '00000000-0000-0000-0000-0000000000f1'),
  'Obi',
  'a submitted application can no longer be edited by the applicant'
);

select is(
  (select count(*) from public.documents where application_id = '00000000-0000-0000-0000-0000000000f1'),
  2::bigint,
  'documents on a submitted application can no longer be removed by the applicant'
);

-- Applicant B -----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);

select is(
  (select count(*) from public.applications where id = '00000000-0000-0000-0000-0000000000f1'),
  0::bigint,
  'an applicant cannot see someone else''s application'
);

select is(
  (select count(*) from public.documents where application_id = '00000000-0000-0000-0000-0000000000f1'),
  0::bigint,
  'an applicant cannot see someone else''s documents'
);

select is(
  (select count(*) from storage.objects
   where bucket_id = 'documents' and name like '00000000-0000-0000-0000-0000000000a1/%'),
  0::bigint,
  'an applicant cannot see someone else''s files'
);

select throws_ok(
  $$ select public.submit_application('00000000-0000-0000-0000-0000000000f1') $$,
  'P0002', 'Application not found', 'an applicant cannot submit someone else''s application'
);

select lives_ok(
  $$ insert into public.applications (id, intake_term_id)
     values ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000e2') $$,
  'a second applicant can start their own draft'
);

reset role;

-- Closed intake: B fills everything, but picked a closed intake.
update public.applications set
  programme_id = '00000000-0000-0000-0000-0000000000a9',
  surname = 'B', first_name = 'Bee', date_of_birth = '2000-01-01', gender = 'male',
  phone = '+2348012345679', email = 'b@example.test', address = '2 Test Street',
  nationality = 'Nigerian',
  education = '[{"institution": "Test School", "certificate": "WASSCE", "to": 2018}]',
  next_of_kin_name = 'Kin', next_of_kin_relationship = 'Father', next_of_kin_phone = '+2348000000001',
  consent_given_at = now()
where id = '00000000-0000-0000-0000-0000000000f3';

insert into public.documents (owner_id, application_id, kind, storage_path, file_name, size_bytes, mime)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f3', 'transcript',
        '00000000-0000-0000-0000-0000000000b1/00000000-0000-0000-0000-0000000000f3/t.pdf',
        't.pdf', 1000, 'application/pdf');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);

select throws_like(
  $$ select public.submit_application('00000000-0000-0000-0000-0000000000f3') $$,
  'Application incomplete', 'an application for a closed intake cannot be submitted'
);

reset role;

-- Student (not an applicant) ------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.applications (id) values ('00000000-0000-0000-0000-0000000000f4') $$,
  '42501', null, 'only applicants can start an application'
);

reset role;

-- Admin -----------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);

select is(
  (select count(*) from public.applications
   where id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f3')),
  2::bigint,
  'an admin sees every application'
);

select is(
  (select count(*) from public.documents
   where application_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f3')),
  3::bigint,
  'an admin sees every document'
);

select is(
  (select count(*) from storage.objects
   where bucket_id = 'documents' and name like '00000000-0000-0000-0000-0000000000a1/%'),
  1::bigint,
  'an admin can read applicants'' files'
);

select lives_ok(
  $$ insert into public.terms (session, name) values ('2099/2100', 'Admin term') $$,
  'an admin can create terms'
);

reset role;

select * from finish();

rollback;
