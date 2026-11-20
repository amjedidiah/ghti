-- Tests for grades and grade_changes (Stage 2, step 2.3).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

-- Fixtures ------------------------------------------------------------------------------

delete from public.grading_scale;
insert into public.grading_scale (min_score, letter, grade_point) values
  (70, 'A', 5), (60, 'B', 4), (50, 'C', 3), (45, 'D', 2), (40, 'E', 1), (0, 'F', 0);

insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-0000000000c1', 'test-grades', 'Test Grades', 'certificate', '1 year', 'published');
insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-0000000000c1', '2032/2033', 'Grades term');
insert into public.courses (id, programme_id, code, title, credit_units, year, semester) values
  ('30000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c1', 'GRD 101', 'Grades course', 3, 1, 1);
insert into public.course_offerings (id, course_id, term_id) values
  ('40000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'grades-s1@example.test', '{"full_name": "Student One"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'grades-s2@example.test', '{"full_name": "Student Two"}'),
  ('00000000-0000-0000-0000-0000000000c9', 'grades-admin@example.test', '{"full_name": "Admin"}');
update public.profiles set role = 'student'
  where id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c9';

insert into public.students (id, matric_no, programme_id, entry_term_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'TEST/GR/001', '10000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c2', 'TEST/GR/002', '10000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1');
insert into public.registrations (id, student_id, offering_id) values
  ('50000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c1'),
  ('50000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c2', '40000000-0000-0000-0000-0000000000c1');

-- Structure --------------------------------------------------------------------------------

select has_table('public', 'grades', 'grades table exists');
select has_table('public', 'grade_changes', 'grade_changes table exists');
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.grades'::regclass, 'public.grade_changes'::regclass)),
  'RLS is enabled on grades and grade_changes'
);
select policies_are('public', 'grades', array[
  'Students read their own published grades', 'Admins read all grades', 'Admins enter grades',
  'Admins update grades', 'Admins delete unpublished grades',
  'Lecturers read their classes'' grades', 'Lecturers enter draft or submitted grades',
  'Lecturers update their draft grades', 'Lecturers delete their draft grades'
], 'grades has only the expected policies');
select policies_are('public', 'grade_changes', array['Admins read the grade change log'],
  'grade_changes has only the expected policy');

-- Admin enters grades ------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c9", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.grades (id, registration_id, ca_score, exam_score)
     values ('60000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-0000000000c1', 28, 41.5) $$,
  'an admin enters a draft grade'
);
select results_eq(
  $$ select total, letter, grade_point, status::text from public.grades
     where id = '60000000-0000-0000-0000-0000000000c1' $$,
  $$ values (69.50::numeric, 'B'::text, 4.00::numeric, 'draft'::text) $$,
  'total, letter and grade point are worked out (69.5 is a B, not between bands)'
);
select is(
  (select entered_by from public.grades where id = '60000000-0000-0000-0000-0000000000c1'),
  '00000000-0000-0000-0000-0000000000c9'::uuid,
  'the grade records who entered it'
);
select lives_ok(
  $$ insert into public.grades (id, registration_id, ca_score, exam_score)
     values ('60000000-0000-0000-0000-0000000000c2', '50000000-0000-0000-0000-0000000000c2', 10, null) $$,
  'a partial grade (CA only) can be saved as a draft'
);
select results_eq(
  $$ select total, letter from public.grades where id = '60000000-0000-0000-0000-0000000000c2' $$,
  $$ values (10.00::numeric, 'F'::text) $$,
  'a partial grade is worked out from what is there'
);
select throws_ok(
  $$ insert into public.grades (registration_id, ca_score) values ('50000000-0000-0000-0000-0000000000c1', 5) $$,
  '23505', null, 'one grade per registration'
);
select throws_ok(
  $$ update public.grades set exam_score = 80 where id = '60000000-0000-0000-0000-0000000000c1' $$,
  '23514', null, 'CA and exam together cannot exceed 100'
);
select throws_ok(
  $$ update public.grades set status = 'published' where id = '60000000-0000-0000-0000-0000000000c2' $$,
  '23514', null, 'a grade without both scores cannot be published'
);
select lives_ok(
  $$ update public.grades set exam_score = 45 where id = '60000000-0000-0000-0000-0000000000c1' $$,
  'an admin corrects a draft grade without a reason'
);
select is(
  (select letter from public.grades where id = '60000000-0000-0000-0000-0000000000c1'),
  'A',
  'the letter follows the corrected score (73 is an A)'
);
select is(
  (select count(*)::int from public.grade_changes), 0,
  'draft changes are not logged'
);

-- Students before publication --------------------------------------------------------------

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);
select is_empty($$ select * from public.grades $$, 'a student cannot see a draft grade');
select throws_ok(
  $$ insert into public.grades (registration_id, ca_score, exam_score)
     values ('50000000-0000-0000-0000-0000000000c1', 40, 60) $$,
  '42501', null, 'a student cannot enter their own grade'
);
select is_empty(
  $$ update public.grades set exam_score = 60 returning id $$,
  'a student cannot change a grade'
);
select is_empty($$ select * from public.grade_changes $$, 'a student cannot read the change log');

-- Publish ------------------------------------------------------------------------------------

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c9", "role": "authenticated"}', true);

select lives_ok(
  $$ update public.grades set status = 'published' where id = '60000000-0000-0000-0000-0000000000c1' $$,
  'an admin publishes a complete grade'
);
select results_eq(
  $$ select published_by, published_at is not null from public.grades
     where id = '60000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('00000000-0000-0000-0000-0000000000c9'::uuid, true) $$,
  'publication records who and when'
);
select throws_ok(
  $$ update public.grades set exam_score = 50 where id = '60000000-0000-0000-0000-0000000000c1' $$,
  '42501', 'Changing a published grade needs a reason',
  'a published grade cannot be changed directly'
);
select is_empty(
  $$ delete from public.grades where id = '60000000-0000-0000-0000-0000000000c1' returning id $$,
  'a published grade cannot be deleted (RLS hides it from delete)'
);
select throws_ok(
  $$ delete from public.registrations where id = '50000000-0000-0000-0000-0000000000c1' $$,
  '23503', null, 'a registration with a grade cannot be removed'
);
select throws_ok(
  $$ select public.change_published_grade('60000000-0000-0000-0000-0000000000c1', 28, 50, 'published', '  ') $$,
  '23514', 'Give a reason for the change', 'a change to a published grade needs a reason'
);
select is(
  (select letter from public.change_published_grade(
     '60000000-0000-0000-0000-0000000000c1', 28, 50, 'published', 'Exam script re-marked')),
  'A',
  'an admin changes a published grade with a reason'
);
select results_eq(
  $$ select reason, changed_by, old_values ->> 'exam_score', new_values ->> 'exam_score'
     from public.grade_changes where grade_id = '60000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('Exam script re-marked'::text, '00000000-0000-0000-0000-0000000000c9'::uuid, '45.00'::text, '50.00'::text) $$,
  'the change is logged with reason, who, and old and new values'
);
select throws_ok(
  $$ update public.grades set exam_score = 49 where id = '60000000-0000-0000-0000-0000000000c1' $$,
  '42501', 'Changing a published grade needs a reason',
  'the reason does not carry over to the next change'
);
select throws_ok(
  $$ select public.change_published_grade('60000000-0000-0000-0000-0000000000c2', 10, 10, 'published', 'x') $$,
  '55000', 'That grade is not published', 'change_published_grade only touches published grades'
);
select throws_ok(
  $$ insert into public.grade_changes (grade_id, old_values, new_values, reason)
     values ('60000000-0000-0000-0000-0000000000c1', '{}', '{}', 'forged') $$,
  '42501', null, 'nobody writes to the change log directly, not even an admin'
);

-- Students after publication ----------------------------------------------------------------

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);
select results_eq(
  $$ select total, letter from public.grades $$,
  $$ values (78.00::numeric, 'A'::text) $$,
  'a student sees their own published grade'
);
select throws_ok(
  $$ select public.change_published_grade('60000000-0000-0000-0000-0000000000c1', 40, 60, 'published', 'please') $$,
  '42501', 'Only admins can change published grades', 'a student cannot change a published grade'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated"}', true);
select is_empty($$ select * from public.grades $$,
  'another student sees neither their draft nor someone else''s published grade');

reset role;

select * from finish();
rollback;
