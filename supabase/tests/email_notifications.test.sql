-- Tests for account_emails() and result_notices (email notifications).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- Fixtures ------------------------------------------------------------------------------

insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-0000000000f1', 'test-notice-cert', 'Test Notice Certificate', 'certificate', '1 year', 'published');

insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-0000000000f1', '2032/2033', 'Test notice term');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'notice-student@example.test', '{"full_name": "Student F"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'notice-applicant@example.test', '{"full_name": "Applicant F"}'),
  ('00000000-0000-0000-0000-0000000000f9', 'notice-admin@example.test', '{"full_name": "Admin F"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000f9';
update public.profiles set role = 'student' where id = '00000000-0000-0000-0000-0000000000f1';

insert into public.students (id, matric_no, programme_id, entry_term_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'TEST/NOTICE/001',
   '10000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1');

select has_function('public', 'account_emails', array['uuid[]'], 'account_emails exists');
select has_table('public', 'result_notices', 'result_notices exists');
-- A (student_id, term_id) primary key would make PostgREST read the table as a
-- students <-> terms link and break every students -> terms embed.
select col_is_pk('public', 'result_notices', 'id', 'result_notices has a surrogate primary key');

-- Anonymous ---------------------------------------------------------------------------

set local role anon;
select throws_ok(
  $$ select * from public.account_emails(array['00000000-0000-0000-0000-0000000000f1']::uuid[]) $$,
  '42501', null, 'anon cannot look up account emails'
);
select throws_ok(
  $$ select * from public.result_notices $$,
  '42501', null, 'anon cannot read result notices'
);
reset role;

-- Student and applicant -----------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}', true);
select throws_ok(
  $$ select * from public.account_emails(array['00000000-0000-0000-0000-0000000000f2']::uuid[]) $$,
  '42501', 'Only admins can look up account emails', 'a student cannot look up account emails'
);
select throws_ok(
  $$ insert into public.result_notices (student_id, term_id)
     values ('00000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1') $$,
  '42501', null, 'a student cannot record a result notice'
);

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}', true);
select throws_ok(
  $$ select * from public.account_emails(array['00000000-0000-0000-0000-0000000000f2']::uuid[]) $$,
  '42501', 'Only admins can look up account emails', 'an applicant cannot look up account emails, even their own'
);
reset role;

-- Admin -------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000f9", "role": "authenticated"}', true);

select results_eq(
  $$ select user_id, email from public.account_emails(array[
       '00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000000f2',
       '00000000-0000-0000-0000-0000000000ff']::uuid[]) order by email $$,
  $$ values ('00000000-0000-0000-0000-0000000000f2'::uuid, 'notice-applicant@example.test'::text),
            ('00000000-0000-0000-0000-0000000000f1'::uuid, 'notice-student@example.test'::text) $$,
  'an admin gets the emails of known accounts; unknown ids are skipped'
);

select lives_ok(
  $$ insert into public.result_notices (student_id, term_id)
     values ('00000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1') $$,
  'an admin records a result notice'
);

select is(
  (select sent_by from public.result_notices
   where student_id = '00000000-0000-0000-0000-0000000000f1'),
  '00000000-0000-0000-0000-0000000000f9'::uuid,
  'the notice records which admin sent it'
);

select throws_ok(
  $$ insert into public.result_notices (student_id, term_id)
     values ('00000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1') $$,
  '23505', null, 'a student gets one notice per term'
);

select throws_ok(
  $$ delete from public.result_notices $$,
  '42501', null, 'notices cannot be deleted through the API'
);
reset role;

-- Students cannot see notices ---------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}', true);
select is_empty(
  $$ select * from public.result_notices $$,
  'a student cannot read result notices, even their own'
);
reset role;

select * from finish();
rollback;
