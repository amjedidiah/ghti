-- Tests for course content: lessons, materials, lecture schedules (step 3.2).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

-- Fixtures: published programme P with courses A and B; draft programme Q.
-- Lecturer L teaches A; student S1 takes A; student S2 takes nothing.
insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-0000000000c1', 'test-content-p', 'Test Content P', 'certificate', '1 year', 'published'),
  ('10000000-0000-0000-0000-0000000000c2', 'test-content-q', 'Test Content Q', 'diploma', '2 years', 'draft');
insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-0000000000c1', '2036/2037', 'Test content term');
insert into public.courses (id, programme_id, code, title, credit_units, year, semester) values
  ('40000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c1', 'CON 101', 'Course A', 3, 1, 1),
  ('40000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-0000000000c1', 'CON 102', 'Course B', 3, 1, 1);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'con-lect@example.test', '{"full_name": "Lecturer L"}'),
  ('00000000-0000-0000-0000-0000000000c5', 'con-s1@example.test', '{"full_name": "Student One"}'),
  ('00000000-0000-0000-0000-0000000000c6', 'con-s2@example.test', '{"full_name": "Student Two"}'),
  ('00000000-0000-0000-0000-0000000000c9', 'con-admin@example.test', '{"full_name": "Admin"}');
update public.profiles set role = 'lecturer' where id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set role = 'student'
  where id in ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c9';
insert into public.students (id, matric_no, programme_id, entry_term_id) values
  ('00000000-0000-0000-0000-0000000000c5', 'CON/001', '10000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c6', 'CON/002', '10000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1');
insert into public.course_offerings (id, course_id, term_id, lecturer_id) values
  ('50000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1');
insert into public.registrations (student_id, offering_id) values
  ('00000000-0000-0000-0000-0000000000c5', '50000000-0000-0000-0000-0000000000c1');

select has_table('public', 'lessons', 'lessons exists');
select has_table('public', 'materials', 'materials exists');
select has_table('public', 'lecture_schedules', 'lecture_schedules exists');

-- Lecturer ---------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.lessons (id, course_id, title, youtube_id)
     values ('70000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c1', 'Week 1', 'dQw4w9WgXcQ') $$,
  'a lecturer adds a lesson to a course they teach'
);
select lives_ok(
  $$ insert into public.lessons (course_id, title) values ('40000000-0000-0000-0000-0000000000c1', 'Week 2') $$,
  'and another'
);
select results_eq(
  $$ select title, position from public.lessons
     where course_id = '40000000-0000-0000-0000-0000000000c1' order by position $$,
  $$ values ('Week 1'::text, 1), ('Week 2', 2) $$,
  'new lessons go last'
);
select throws_ok(
  $$ insert into public.lessons (course_id, title) values ('40000000-0000-0000-0000-0000000000c2', 'Not mine') $$,
  '42501', null, 'a lecturer cannot add a lesson to a course they do not teach'
);
select throws_ok(
  $$ insert into public.lessons (course_id, title, youtube_id)
     values ('40000000-0000-0000-0000-0000000000c1', 'Bad', 'https://youtu.be/x') $$,
  '23514', null, 'only a YouTube video ID is stored, never a link'
);
select lives_ok(
  $$ insert into public.materials (id, course_id, lesson_id, title, drive_kind, drive_file_id)
     values ('80000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-0000000000c1',
             '70000000-0000-0000-0000-0000000000c1', 'Slides', 'presentation',
             '1AbCdEfGhIjKlMnOpQrStUvWxYz012345') $$,
  'a lecturer adds a material attached to a lesson'
);
select throws_ok(
  $$ insert into public.materials (course_id, title, drive_kind, drive_file_id)
     values ('40000000-0000-0000-0000-0000000000c1', 'Bad', 'file', 'https://drive.google.com/x') $$,
  '23514', null, 'only a Drive file ID is stored, never a link'
);
reset role;

-- A material's lesson must be in the same course.
select throws_ok(
  $$ insert into public.materials (course_id, lesson_id, title, drive_kind, drive_file_id)
     values ('40000000-0000-0000-0000-0000000000c2', '70000000-0000-0000-0000-0000000000c1', 'Wrong course',
             'file', '1AbCdEfGhIjKlMnOpQrStUvWxYz012345') $$,
  '23503', null, 'a material cannot point at another course''s lesson'
);

-- Students --------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c5", "role": "authenticated"}', true);
select results_eq(
  $$ select count(*)::int from public.lessons where course_id = '40000000-0000-0000-0000-0000000000c1' $$,
  $$ values (2) $$,
  'a registered student reads the course''s lessons'
);
select results_eq(
  $$ select title from public.materials where course_id = '40000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('Slides'::text) $$,
  'and its materials'
);
select throws_ok(
  $$ insert into public.lessons (course_id, title) values ('40000000-0000-0000-0000-0000000000c1', 'Mine') $$,
  '42501', null, 'a student cannot add a lesson'
);

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c6", "role": "authenticated"}', true);
select is_empty(
  $$ select * from public.lessons where course_id = '40000000-0000-0000-0000-0000000000c1' $$,
  'a student who is not registered sees no lessons'
);
select is_empty(
  $$ select * from public.materials where course_id = '40000000-0000-0000-0000-0000000000c1' $$,
  'or materials'
);
reset role;

set local role anon;
select throws_ok($$ select * from public.lessons $$, '42501', null, 'anon cannot read lessons');
reset role;

-- Deleting a lesson keeps its materials, unattached ----------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);
delete from public.lessons where id = '70000000-0000-0000-0000-0000000000c1';
select results_eq(
  $$ select lesson_id is null from public.materials where id = '80000000-0000-0000-0000-0000000000c1' $$,
  $$ values (true) $$,
  'deleting a lesson keeps its materials as course materials'
);
select throws_ok(
  $$ insert into public.lecture_schedules (programme_id, term_id, title, drive_kind, drive_file_id)
     values ('10000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1', 'Timetable',
             'document', '1AbCdEfGhIjKlMnOpQrStUvWxYz012345') $$,
  '42501', null, 'a lecturer cannot add a lecture schedule'
);
reset role;

-- Schedules --------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c9", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.lecture_schedules (programme_id, term_id, title, drive_kind, drive_file_id) values
     ('10000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1', 'P timetable',
      'document', '1AbCdEfGhIjKlMnOpQrStUvWxYz012345'),
     ('10000000-0000-0000-0000-0000000000c2', '20000000-0000-0000-0000-0000000000c1', 'Q timetable',
      'document', '1AbCdEfGhIjKlMnOpQrStUvWxYz012345') $$,
  'an admin adds lecture schedules'
);
reset role;

set local role anon;
select results_eq(
  $$ select title from public.lecture_schedules
     where term_id = '20000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('P timetable'::text) $$,
  'schedules of published programmes are public; drafts stay hidden'
);
reset role;

select * from finish();
rollback;
