-- RLS and constraint tests for the academic structure and student records
-- (Stage 2, steps 2.1 and 2.2): students, courses, course_offerings,
-- registrations, grading_scale.
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(55);

-- Fixtures (inserted as the test superuser; rolled back at the end) -------------

insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-000000000001', 'test-ar-published', 'Test Published', 'certificate', '1 year', 'published'),
  ('10000000-0000-0000-0000-000000000002', 'test-ar-draft', 'Test Draft', 'diploma', '2 years', 'draft');

insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-000000000001', '2030/2031', 'Test term');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'ar-applicant@example.test', '{"full_name": "Applicant"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'ar-admin@example.test', '{"full_name": "Admin"}'),
  ('00000000-0000-0000-0000-0000000000b3', 'ar-student1@example.test', '{"full_name": "Student One"}'),
  ('00000000-0000-0000-0000-0000000000b4', 'ar-student2@example.test', '{"full_name": "Student Two"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set role = 'student'
  where id in ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b4');

insert into public.students (id, matric_no, programme_id, entry_term_id) values
  ('00000000-0000-0000-0000-0000000000b3', 'TEST/AR/001',
   '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000b4', 'TEST/AR/002',
   '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001');

insert into public.courses (id, programme_id, code, title, credit_units, year, semester) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'TST 101', 'Published course', 3, 1, 1),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   'TST 201', 'Draft-programme course', 2, 1, 1);

insert into public.course_offerings (id, course_id, term_id) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001');

insert into public.registrations (student_id, offering_id) values
  ('00000000-0000-0000-0000-0000000000b3', '40000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000b4', '40000000-0000-0000-0000-000000000002');

-- The local seed may already hold a scale; tests use their own bands.
delete from public.grading_scale;
insert into public.grading_scale (min_score, letter, grade_point) values
  (70, 'A', 5), (0, 'F', 0);

-- Structure -------------------------------------------------------------------------

select has_table('public', 'students', 'students table exists');
select has_table('public', 'courses', 'courses table exists');
select has_table('public', 'course_offerings', 'course_offerings table exists');
select has_table('public', 'registrations', 'registrations table exists');
select has_table('public', 'grading_scale', 'grading_scale table exists');

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.students'::regclass, 'public.courses'::regclass,
                 'public.course_offerings'::regclass, 'public.registrations'::regclass,
                 'public.grading_scale'::regclass)),
  'RLS is enabled on all five tables'
);

select policies_are('public', 'students', array[
  'Students read their own record', 'Admins read all students', 'Admins create students',
  'Admins update students', 'Admins delete students'
], 'students has only the expected policies');

select policies_are('public', 'courses', array[
  'Courses of published programmes are public', 'Students read the courses they are registered on',
  'Admins read all courses', 'Admins create courses', 'Admins update courses', 'Admins delete courses',
  'Lecturers read the courses they teach'
], 'courses has only the expected policies');

select policies_are('public', 'course_offerings', array[
  'Students read the offerings they are registered on', 'Admins read all offerings',
  'Admins create offerings', 'Admins update offerings', 'Admins delete offerings',
  'Lecturers read their own offerings'
], 'course_offerings has only the expected policies');

select policies_are('public', 'registrations', array[
  'Students read their own registrations', 'Admins read all registrations',
  'Admins register students', 'Admins remove registrations',
  'Lecturers read their classes'' registrations'
], 'registrations has only the expected policies');

select policies_are('public', 'grading_scale', array[
  'Signed-in users read the grading scale', 'Admins create grading bands',
  'Admins update grading bands', 'Admins delete grading bands'
], 'grading_scale has only the expected policies');

-- Anonymous visitors -------------------------------------------------------------------

set local role anon;

select results_eq(
  $$ select code from public.courses where code like 'TST %' order by code $$,
  $$ values ('TST 101'::text) $$,
  'anon sees courses of published programmes only'
);

select throws_ok($$ select * from public.students $$, '42501', null, 'anon cannot read students');
select throws_ok($$ select * from public.course_offerings $$, '42501', null, 'anon cannot read offerings');
select throws_ok($$ select * from public.registrations $$, '42501', null, 'anon cannot read registrations');
select throws_ok($$ select * from public.grading_scale $$, '42501', null, 'anon cannot read the grading scale');
select throws_ok(
  $$ insert into public.courses (programme_id, code, title, credit_units, year, semester)
     values ('10000000-0000-0000-0000-000000000001', 'ANON 101', 'X', 1, 1, 1) $$,
  '42501', null, 'anon cannot create courses'
);

reset role;

-- Applicant (signed in, not a student) ---------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);

select results_eq(
  $$ select code from public.courses where code like 'TST %' order by code $$,
  $$ values ('TST 101'::text) $$,
  'an applicant sees courses of published programmes only'
);
select is_empty($$ select * from public.students $$, 'an applicant sees no student records');
select is_empty($$ select * from public.course_offerings $$, 'an applicant sees no offerings');
select is_empty($$ select * from public.registrations $$, 'an applicant sees no registrations');
select results_eq(
  $$ select letter from public.grading_scale order by min_score desc $$,
  $$ values ('A'::text), ('F'::text) $$,
  'an applicant can read the grading scale'
);
select throws_ok(
  $$ insert into public.courses (programme_id, code, title, credit_units, year, semester)
     values ('10000000-0000-0000-0000-000000000001', 'APP 101', 'X', 1, 1, 1) $$,
  '42501', null, 'an applicant cannot create courses'
);
select throws_ok(
  $$ insert into public.students (id, matric_no, programme_id, entry_term_id)
     values ('00000000-0000-0000-0000-0000000000b1', 'SELF/001',
             '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'an applicant cannot make themselves a student'
);
select throws_ok(
  $$ insert into public.grading_scale (min_score, letter, grade_point) values (50, 'C', 3) $$,
  '42501', null, 'an applicant cannot change the grading scale'
);

reset role;

-- Student one (registered on the published-programme course) ------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated"}', true);

select results_eq(
  $$ select matric_no from public.students $$,
  $$ values ('TEST/AR/001'::text) $$,
  'a student reads only their own record'
);
select is_empty(
  $$ update public.students set status = 'graduated' returning id $$,
  'a student cannot update their own record'
);
select results_eq(
  $$ select offering_id from public.registrations $$,
  $$ values ('40000000-0000-0000-0000-000000000001'::uuid) $$,
  'a student reads only their own registrations'
);
select results_eq(
  $$ select id from public.course_offerings $$,
  $$ values ('40000000-0000-0000-0000-000000000001'::uuid) $$,
  'a student reads only the offerings they are registered on'
);
select results_eq(
  $$ select code from public.courses where code like 'TST %' order by code $$,
  $$ values ('TST 101'::text) $$,
  'a student does not see another programme''s unpublished courses'
);
select throws_ok(
  $$ insert into public.registrations (student_id, offering_id)
     values ('00000000-0000-0000-0000-0000000000b3', '40000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'a student cannot register themselves'
);
select is_empty(
  $$ delete from public.registrations returning id $$,
  'a student cannot remove their registrations'
);
select is_empty(
  $$ update public.course_offerings set lecturer_id = '00000000-0000-0000-0000-0000000000b3' returning id $$,
  'a student cannot change offerings'
);

reset role;

-- Student two (registered on a course of a draft programme) --------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b4", "role": "authenticated"}', true);

select results_eq(
  $$ select code from public.courses where code like 'TST %' order by code $$,
  $$ values ('TST 101'::text), ('TST 201'::text) $$,
  'a student sees the courses they are registered on, even in an unpublished programme'
);
select results_eq(
  $$ select matric_no from public.students $$,
  $$ values ('TEST/AR/002'::text) $$,
  'the second student also reads only their own record'
);

reset role;

-- Admin ----------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}', true);

select results_eq(
  $$ select matric_no from public.students where matric_no like 'TEST/AR/%' order by matric_no $$,
  $$ values ('TEST/AR/001'::text), ('TEST/AR/002'::text) $$,
  'an admin reads all students'
);
select results_eq(
  $$ select code from public.courses where code like 'TST %' order by code $$,
  $$ values ('TST 101'::text), ('TST 201'::text) $$,
  'an admin reads all courses'
);
select is(
  (select count(*)::int from public.registrations r
   join public.course_offerings o on o.id = r.offering_id
   where o.term_id = '20000000-0000-0000-0000-000000000001'),
  2,
  'an admin reads all registrations'
);
select lives_ok(
  $$ insert into public.courses (id, programme_id, code, title, credit_units, year, semester)
     values ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
             'TST 102', 'Admin course', 2, 1, 2) $$,
  'an admin creates a course'
);
select lives_ok(
  $$ insert into public.course_offerings (id, course_id, term_id)
     values ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
             '20000000-0000-0000-0000-000000000001') $$,
  'an admin creates an offering'
);
select lives_ok(
  $$ insert into public.registrations (student_id, offering_id)
     values ('00000000-0000-0000-0000-0000000000b3', '40000000-0000-0000-0000-000000000003') $$,
  'an admin registers a student'
);
select is(
  (select registered_by from public.registrations
   where offering_id = '40000000-0000-0000-0000-000000000003'),
  '00000000-0000-0000-0000-0000000000b2'::uuid,
  'a registration records which admin made it'
);
select lives_ok(
  $$ update public.students set status = 'deferred' where matric_no = 'TEST/AR/002' $$,
  'an admin updates a student''s status'
);
select lives_ok(
  $$ insert into public.grading_scale (min_score, letter, grade_point) values (60, 'B', 4) $$,
  'an admin adds a grading band'
);
select lives_ok(
  $$ delete from public.registrations where offering_id = '40000000-0000-0000-0000-000000000003' $$,
  'an admin removes a registration'
);

-- Constraints (still as admin) -----------------------------------------------------------

select throws_ok(
  $$ insert into public.courses (programme_id, code, title, credit_units, year, semester)
     values ('10000000-0000-0000-0000-000000000001', 'TST 101', 'Duplicate', 1, 1, 1) $$,
  '23505', null, 'a course code is unique within a programme'
);
select lives_ok(
  $$ insert into public.courses (programme_id, code, title, credit_units, year, semester)
     values ('10000000-0000-0000-0000-000000000002', 'TST 101', 'Same code, other programme', 1, 1, 1) $$,
  'the same course code is allowed in another programme'
);
select throws_ok(
  $$ insert into public.courses (programme_id, code, title, credit_units, year, semester)
     values ('10000000-0000-0000-0000-000000000001', 'tst 103', 'Lower case', 1, 1, 1) $$,
  '23514', null, 'course codes must be upper case'
);
select throws_ok(
  $$ insert into public.courses (programme_id, code, title, credit_units, year, semester)
     values ('10000000-0000-0000-0000-000000000001', 'TST 104', 'Bad units', -1, 1, 1) $$,
  '23514', null, 'credit units cannot be negative'
);
select throws_ok(
  $$ insert into public.course_offerings (course_id, term_id)
     values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001') $$,
  '23505', null, 'a course is offered at most once per term'
);
select throws_ok(
  $$ insert into public.registrations (student_id, offering_id)
     values ('00000000-0000-0000-0000-0000000000b3', '40000000-0000-0000-0000-000000000001') $$,
  '23505', null, 'a student registers on an offering only once'
);
select throws_ok(
  $$ update public.students set matric_no = 'TEST/AR/001' where matric_no = 'TEST/AR/002' $$,
  '23505', null, 'matric numbers are unique'
);
select throws_ok(
  $$ insert into public.grading_scale (min_score, letter, grade_point) values (70, 'X', 3) $$,
  '23505', null, 'two grading bands cannot start at the same score'
);
select throws_ok(
  $$ delete from public.courses where id = '30000000-0000-0000-0000-000000000001' $$,
  '23503', null, 'a course with offerings cannot be deleted'
);
select throws_ok(
  $$ delete from public.students where matric_no = 'TEST/AR/001' $$,
  '23503', null, 'a student with registrations cannot be deleted'
);

reset role;

select * from finish();
rollback;
