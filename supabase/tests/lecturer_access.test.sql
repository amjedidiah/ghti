-- Tests for lecturer access (step 3.1).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

-- Fixtures: a DRAFT programme (so its courses are not public), two courses
-- offered in one term; lecturer L1 teaches A; student S1 takes A, S2 takes B.

insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-0000000000a1', 'test-lect-prog', 'Test Lecturer Programme', 'certificate', '1 year', 'draft');
insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-0000000000a1', '2035/2036', 'Test lecturer term');
insert into public.courses (id, programme_id, code, title, credit_units, year, semester) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'LEC 101', 'Course A', 3, 1, 1),
  ('40000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a1', 'LEC 102', 'Course B', 3, 1, 1);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'lect-one@example.test', '{"full_name": "Lecturer One"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'lect-two@example.test', '{"full_name": "Lecturer Two"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'lect-s1@example.test', '{"full_name": "Student One"}'),
  ('00000000-0000-0000-0000-0000000000e6', 'lect-s2@example.test', '{"full_name": "Student Two"}'),
  ('00000000-0000-0000-0000-0000000000e9', 'lect-admin@example.test', '{"full_name": "Admin"}');
update public.profiles set role = 'lecturer'
  where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
update public.profiles set role = 'student'
  where id in ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e6');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e9';

insert into public.students (id, matric_no, programme_id, entry_term_id) values
  ('00000000-0000-0000-0000-0000000000e5', 'LECT/001', '10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000e6', 'LECT/002', '10000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1');

insert into public.course_offerings (id, course_id, term_id, lecturer_id) values
  ('50000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1'),
  ('50000000-0000-0000-0000-0000000000a2', '40000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e2');

insert into public.registrations (id, student_id, offering_id) values
  ('60000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e5', '50000000-0000-0000-0000-0000000000a1'),
  ('60000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e6', '50000000-0000-0000-0000-0000000000a2');

select has_function('private', 'teaches_offering', array['uuid'], 'teaches_offering exists');
select has_function('public', 'class_list', array['uuid'], 'class_list exists');

-- Lecturer One ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);

select results_eq(
  $$ select id from public.course_offerings where term_id = '20000000-0000-0000-0000-0000000000a1' $$,
  $$ values ('50000000-0000-0000-0000-0000000000a1'::uuid) $$,
  'a lecturer reads the offerings they teach, not others'
);
select results_eq(
  $$ select code from public.courses where programme_id = '10000000-0000-0000-0000-0000000000a1' $$,
  $$ values ('LEC 101'::text) $$,
  'a lecturer reads the courses they teach, even in a draft programme'
);
select results_eq(
  $$ select id from public.registrations
     where offering_id in ('50000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a2') $$,
  $$ values ('60000000-0000-0000-0000-0000000000a1'::uuid) $$,
  'a lecturer reads their own class''s registrations only'
);
select is_empty(
  $$ select * from public.students where matric_no like 'LECT/%' $$,
  'a lecturer cannot read the students table'
);
select is_empty(
  $$ select * from public.profiles where id = '00000000-0000-0000-0000-0000000000e5' $$,
  'a lecturer cannot read a student''s profile'
);
select results_eq(
  $$ select matric_no, full_name from public.class_list('50000000-0000-0000-0000-0000000000a1') $$,
  $$ values ('LECT/001'::text, 'Student One'::text) $$,
  'class_list gives the lecturer each student''s matric number and name'
);
select throws_ok(
  $$ select * from public.class_list('50000000-0000-0000-0000-0000000000a2') $$,
  '42501', null, 'class_list refuses another lecturer''s class'
);

-- Grades
select lives_ok(
  $$ insert into public.grades (registration_id, ca_score, exam_score, status)
     values ('60000000-0000-0000-0000-0000000000a1', 30, 40, 'draft') $$,
  'a lecturer enters a draft grade for their class'
);
select throws_ok(
  $$ insert into public.grades (registration_id, ca_score, exam_score, status)
     values ('60000000-0000-0000-0000-0000000000a2', 30, 40, 'draft') $$,
  '42501', null, 'a lecturer cannot grade another lecturer''s class'
);
select lives_ok(
  $$ update public.grades set status = 'submitted'
     where registration_id = '60000000-0000-0000-0000-0000000000a1' $$,
  'a lecturer submits a draft grade'
);
select is(
  (select status::text from public.grades where registration_id = '60000000-0000-0000-0000-0000000000a1'),
  'submitted',
  'the grade is now submitted'
);
select is_empty(
  $$ update public.grades set ca_score = 10
     where registration_id = '60000000-0000-0000-0000-0000000000a1' returning id $$,
  'a submitted grade cannot be edited by the lecturer'
);
select is_empty(
  $$ delete from public.grades
     where registration_id = '60000000-0000-0000-0000-0000000000a1' returning id $$,
  'a submitted grade cannot be deleted by the lecturer'
);
reset role;

-- Publishing is for admins only
update public.grades set status = 'draft' where registration_id = '60000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);
select throws_ok(
  $$ update public.grades set status = 'published'
     where registration_id = '60000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'a lecturer cannot publish a grade'
);
reset role;

-- Students are unaffected (no recursion between the policies) ----------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e5", "role": "authenticated"}', true);
select results_eq(
  $$ select id from public.course_offerings where term_id = '20000000-0000-0000-0000-0000000000a1' $$,
  $$ values ('50000000-0000-0000-0000-0000000000a1'::uuid) $$,
  'a student still reads the offering they are registered on'
);
select throws_ok(
  $$ select * from public.class_list('50000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'a student cannot read the class list'
);
reset role;

-- Assignment ------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000e9", "role": "authenticated"}', true);
select throws_ok(
  $$ update public.course_offerings set lecturer_id = '00000000-0000-0000-0000-0000000000e5'
     where id = '50000000-0000-0000-0000-0000000000a2' $$,
  '23514', 'Only a lecturer can be assigned to a course', 'only a lecturer can be assigned'
);
select lives_ok(
  $$ update public.course_offerings set lecturer_id = '00000000-0000-0000-0000-0000000000e1'
     where id = '50000000-0000-0000-0000-0000000000a2' $$,
  'an admin assigns a lecturer'
);
select results_eq(
  $$ select matric_no from public.class_list('50000000-0000-0000-0000-0000000000a2') $$,
  $$ values ('LECT/002'::text) $$,
  'an admin reads any class list'
);
select lives_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000e1', 'applicant') $$,
  'an admin removes a lecturer''s staff access'
);
select is_empty(
  $$ select id from public.course_offerings where lecturer_id = '00000000-0000-0000-0000-0000000000e1' $$,
  'and their courses are unassigned'
);
reset role;

select * from finish();
rollback;
