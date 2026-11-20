-- Tests for the grade workflow: submit for approval, return to lecturer (step 3.3).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Fixtures: one course offered with lecturer L1 (L2 teaches nothing here);
-- students S1, S2 and S3 are registered on it.
insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-0000000000d1', 'test-workflow', 'Test Workflow', 'certificate', '1 year', 'draft');
insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-0000000000d1', '2037/2038', 'Test workflow term');
insert into public.courses (id, programme_id, code, title, credit_units, year, semester) values
  ('40000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-0000000000d1', 'WFL 101', 'Course W', 3, 1, 1);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'wf-l1@example.test', '{"full_name": "Lecturer One"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'wf-l2@example.test', '{"full_name": "Lecturer Two"}'),
  ('00000000-0000-0000-0000-0000000000d5', 'wf-s1@example.test', '{"full_name": "Student One"}'),
  ('00000000-0000-0000-0000-0000000000d6', 'wf-s2@example.test', '{"full_name": "Student Two"}'),
  ('00000000-0000-0000-0000-0000000000d7', 'wf-s3@example.test', '{"full_name": "Student Three"}'),
  ('00000000-0000-0000-0000-0000000000d9', 'wf-admin@example.test', '{"full_name": "Admin"}');
update public.profiles set role = 'lecturer'
  where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
update public.profiles set role = 'student'
  where id in ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d6',
               '00000000-0000-0000-0000-0000000000d7');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d9';
insert into public.students (id, matric_no, programme_id, entry_term_id) values
  ('00000000-0000-0000-0000-0000000000d5', 'WFL/001', '10000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000d6', 'WFL/002', '10000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000d7', 'WFL/003', '10000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000d1');
insert into public.course_offerings (id, course_id, term_id, lecturer_id) values
  ('50000000-0000-0000-0000-0000000000d1', '40000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1');
insert into public.registrations (id, student_id, offering_id) values
  ('60000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d5', '50000000-0000-0000-0000-0000000000d1'),
  ('60000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d6', '50000000-0000-0000-0000-0000000000d1'),
  ('60000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d7', '50000000-0000-0000-0000-0000000000d1');

select has_table('public', 'grade_returns', 'grade_returns exists');
select policies_are('public', 'grade_returns', array[
  'Admins read grade returns', 'Lecturers read their courses'' grade returns'
], 'grade_returns has only the expected policies');

-- Lecturer submits ------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.grades (registration_id, ca_score, status)
     values ('60000000-0000-0000-0000-0000000000d1', 30, 'submitted') $$,
  '23514', null, 'a grade missing a score cannot be submitted'
);
select lives_ok(
  $$ insert into public.grades (registration_id, ca_score, exam_score, status) values
     ('60000000-0000-0000-0000-0000000000d1', 30, 50, 'submitted'),
     ('60000000-0000-0000-0000-0000000000d2', 20, 40, 'submitted'),
     ('60000000-0000-0000-0000-0000000000d3', 25, 45, 'submitted') $$,
  'a lecturer submits complete grades for approval'
);
select throws_ok(
  $$ select public.return_grades('50000000-0000-0000-0000-0000000000d1', 'Check them') $$,
  '42501', null, 'a lecturer cannot return grades'
);
reset role;

-- Admin publishes one and returns the rest ----------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d9", "role": "authenticated"}', true);

update public.grades set status = 'published'
  where registration_id = '60000000-0000-0000-0000-0000000000d3';

select throws_ok(
  $$ select public.return_grades('50000000-0000-0000-0000-0000000000d1', '   ') $$,
  '23514', null, 'returning grades needs a note'
);
select is(
  public.return_grades('50000000-0000-0000-0000-0000000000d1', 'WFL/002''s exam looks low.'),
  2,
  'an admin returns the course''s submitted grades'
);
select results_eq(
  $$ select status::text from public.grades g
     join public.registrations r on r.id = g.registration_id
     where r.offering_id = '50000000-0000-0000-0000-0000000000d1' order by r.id $$,
  $$ values ('draft'::text), ('draft'), ('published') $$,
  'submitted grades go back to draft; the published one is untouched'
);
select results_eq(
  $$ select note, grades_returned, returned_by from public.grade_returns
     where offering_id = '50000000-0000-0000-0000-0000000000d1' $$,
  $$ values ('WFL/002''s exam looks low.'::text, 2, '00000000-0000-0000-0000-0000000000d9'::uuid) $$,
  'the return is kept with its note, count and admin'
);
select throws_ok(
  $$ select public.return_grades('50000000-0000-0000-0000-0000000000d1', 'Again') $$,
  '55000', null, 'there is nothing to return once nothing is submitted'
);
select throws_ok(
  $$ insert into public.grade_returns (offering_id, note, grades_returned)
     values ('50000000-0000-0000-0000-0000000000d1', 'Forged', 1) $$,
  '42501', null, 'nobody writes grade_returns directly, not even admins'
);
reset role;

-- Who reads the note ------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);
select results_eq(
  $$ select note from public.grade_returns $$,
  $$ values ('WFL/002''s exam looks low.'::text) $$,
  'the course''s lecturer reads the note'
);
select lives_ok(
  $$ update public.grades set exam_score = 45
     where registration_id = '60000000-0000-0000-0000-0000000000d2' $$,
  'and can change the returned grade again'
);

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}', true);
select is_empty($$ select * from public.grade_returns $$, 'another lecturer does not');

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d6", "role": "authenticated"}', true);
select is_empty($$ select * from public.grade_returns $$, 'nor does a student');
reset role;

set local role anon;
select throws_ok($$ select * from public.grade_returns $$, '42501', null, 'anon cannot read grade returns');
reset role;

select * from finish();
rollback;
