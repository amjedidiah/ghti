-- Tests for enrol_student: from admitted applicant to student (Stage 2, step 2.2).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures ------------------------------------------------------------------------------

insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-0000000000e1', 'test-enrol-cert', 'Test Enrol Certificate', 'certificate', '1 year', 'published');

insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-0000000000e1', '2031/2032', 'Test intake'),
  ('20000000-0000-0000-0000-0000000000e2', '2031/2032', 'Test later term');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'enrol-a@example.test', '{"full_name": "Admitted A"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'enrol-b@example.test', '{"full_name": "Admitted B"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'enrol-c@example.test', '{"full_name": "Submitted C"}'),
  ('00000000-0000-0000-0000-0000000000e4', 'enrol-d@example.test', '{"full_name": "Admitted D, no intake"}'),
  ('00000000-0000-0000-0000-0000000000e9', 'enrol-admin@example.test', '{"full_name": "Admin"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e9';

insert into public.applications (id, applicant_id, programme_id, intake_term_id, status, submitted_at) values
  ('30000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1',
   '10000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000e1', 'admitted', now()),
  ('30000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e2',
   '10000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000e1', 'admitted', now()),
  ('30000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e3',
   '10000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000e1', 'submitted', now()),
  ('30000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e4',
   '10000000-0000-0000-0000-0000000000e1', null, 'admitted', now());

select has_function('public', 'enrol_student', array['uuid', 'text', 'uuid'], 'enrol_student exists');

-- Anonymous and non-admin callers ----------------------------------------------------------

set local role anon;
select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000e1', 'X/1') $$,
  '42501', null, 'anon cannot call enrol_student'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000e1', 'SELF/001') $$,
  '42501', 'Only admins can enrol students', 'an admitted applicant cannot enrol themselves'
);
select throws_ok(
  $$ update public.profiles set role = 'student' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '42501', 'Only admins can change roles', 'an applicant cannot make themselves a student directly'
);
reset role;

-- Admin ----------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e9", "role": "authenticated"}', true);

select is(
  (select matric_no from public.enrol_student('30000000-0000-0000-0000-0000000000e1', '  test/2031/cert/001 ')),
  'TEST/2031/CERT/001',
  'an admin enrols an admitted applicant; the matric number is trimmed and upper-cased'
);

select results_eq(
  $$ select programme_id, entry_term_id, application_id, status::text
     from public.students where id = '00000000-0000-0000-0000-0000000000e1' $$,
  $$ values ('10000000-0000-0000-0000-0000000000e1'::uuid, '20000000-0000-0000-0000-0000000000e1'::uuid,
             '30000000-0000-0000-0000-0000000000e1'::uuid, 'active'::text) $$,
  'the student gets the application''s programme, its intake as entry term, a link to it, and is active'
);

select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
  'student',
  'the account''s role becomes student'
);

select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000e1', 'TEST/2031/CERT/009') $$,
  '55000', 'This applicant is already a student', 'the same applicant cannot be enrolled twice'
);

select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000e2', 'test/2031/cert/001') $$,
  '23505', null, 'matric numbers are unique (case-insensitively, after upper-casing)'
);

select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000e2', 'BAD MATRIC') $$,
  '23514', null, 'a matric number with spaces is refused'
);

select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000e2', '   ') $$,
  '23514', null, 'an empty matric number is refused'
);

select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000e3', 'TEST/2031/CERT/003') $$,
  '55000', 'Only admitted applications can be enrolled', 'a submitted (not admitted) application cannot be enrolled'
);

select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000ff', 'TEST/2031/CERT/004') $$,
  '55000', 'Only admitted applications can be enrolled', 'an unknown application cannot be enrolled'
);

select throws_ok(
  $$ select public.enrol_student('30000000-0000-0000-0000-0000000000e4', 'TEST/2031/CERT/004') $$,
  '23502', 'Choose an entry term', 'an entry term is required when the application has no intake'
);

select is(
  (select entry_term_id from public.enrol_student(
     '30000000-0000-0000-0000-0000000000e4', 'TEST/2031/CERT/004',
     '20000000-0000-0000-0000-0000000000e2')),
  '20000000-0000-0000-0000-0000000000e2'::uuid,
  'an admin can choose the entry term'
);

select is(
  (select entry_term_id from public.enrol_student(
     '30000000-0000-0000-0000-0000000000e2', 'TEST/2031/CERT/002',
     '20000000-0000-0000-0000-0000000000e2')),
  '20000000-0000-0000-0000-0000000000e2'::uuid,
  'the chosen entry term overrides the intake'
);

select is(
  (select count(*)::int from public.profiles
   where id in ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e4')
     and role = 'student'),
  2,
  'every enrolled account is now a student'
);

select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000e3'),
  'applicant',
  'a failed enrolment leaves the account an applicant'
);

reset role;

-- The new student ------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);

select results_eq(
  $$ select matric_no from public.students $$,
  $$ values ('TEST/2031/CERT/001'::text) $$,
  'the new student reads their own record'
);

select results_eq(
  $$ select status::text from public.applications $$,
  $$ values ('admitted'::text) $$,
  'the new student still reads their own application'
);

reset role;

select * from finish();
rollback;
