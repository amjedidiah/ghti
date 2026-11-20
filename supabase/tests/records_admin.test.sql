-- Tests for records admin: record_notes, set_student_status, search_students (step 2.5).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

-- Fixtures ------------------------------------------------------------------------------

insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-0000000000d1', 'test-records-cert', 'Test Records Certificate', 'certificate', '1 year', 'published'),
  ('10000000-0000-0000-0000-0000000000d2', 'test-records-dip', 'Test Records Diploma', 'diploma', '2 years', 'published');

insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-0000000000d1', '2033/2034', 'Test records term A'),
  ('20000000-0000-0000-0000-0000000000d2', '2034/2035', 'Test records term B');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'rec-1@example.test', '{"full_name": "Zainab Recordtest"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'rec-2@example.test', '{"full_name": "Yusuf Recordtest"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'rec-3@example.test', '{"full_name": "Xavier 50%_Recordtest"}'),
  ('00000000-0000-0000-0000-0000000000d8', 'rec-applicant@example.test', '{"full_name": "Applicant Recordtest"}'),
  ('00000000-0000-0000-0000-0000000000d9', 'rec-admin@example.test', '{"full_name": "Admin Recordtest"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d9';
update public.profiles set role = 'student'
  where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2',
               '00000000-0000-0000-0000-0000000000d3');

insert into public.students (id, matric_no, programme_id, entry_term_id, status) values
  ('00000000-0000-0000-0000-0000000000d1', 'RECTEST/CERT/001',
   '10000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000d1', 'active'),
  ('00000000-0000-0000-0000-0000000000d2', 'RECTEST/DIP/002',
   '10000000-0000-0000-0000-0000000000d2', '20000000-0000-0000-0000-0000000000d2', 'deferred'),
  ('00000000-0000-0000-0000-0000000000d3', 'RECTEST/CERT/003',
   '10000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000d2', 'active');

select has_table('public', 'record_notes', 'record_notes exists');
select has_function('public', 'set_student_status', array['uuid', 'student_status', 'text'], 'set_student_status exists');
select has_function('public', 'search_students',
  array['text', 'uuid', 'uuid', 'student_status', 'text', 'integer', 'integer'], 'search_students exists');
select has_index('public', 'profiles', 'profiles_full_name_trgm_idx', 'names have a trigram index');
select has_index('public', 'students', 'students_matric_no_trgm_idx', 'matric numbers have a trigram index');

-- Anonymous ---------------------------------------------------------------------------

set local role anon;
select throws_ok($$ select * from public.record_notes $$, '42501', null, 'anon cannot read notes');
select throws_ok($$ select * from public.search_students('Recordtest') $$, '42501', null, 'anon cannot search students');
select throws_ok(
  $$ select public.set_student_status('00000000-0000-0000-0000-0000000000d1', 'withdrawn') $$,
  '42501', null, 'anon cannot change a status'
);
reset role;

-- Student -------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);
select throws_ok(
  $$ select * from public.search_students('Recordtest') $$,
  '42501', 'Only admins can search students', 'a student cannot search students'
);
select throws_ok(
  $$ select public.set_student_status('00000000-0000-0000-0000-0000000000d1', 'graduated') $$,
  '42501', 'Only admins can change a student''s status', 'a student cannot change their own status'
);
select throws_ok(
  $$ insert into public.record_notes (student_id, body)
     values ('00000000-0000-0000-0000-0000000000d1', 'I was here') $$,
  '42501', null, 'a student cannot write a note on their file'
);
reset role;

-- Admin: notes ------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d9", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.record_notes (student_id, body)
     values ('00000000-0000-0000-0000-0000000000d1', 'Paid the hostel deposit.') $$,
  'an admin writes a note'
);
select is(
  (select author_id from public.record_notes where body = 'Paid the hostel deposit.'),
  '00000000-0000-0000-0000-0000000000d9'::uuid,
  'the note records its author'
);
select throws_ok(
  $$ insert into public.record_notes (student_id, body, author_id)
     values ('00000000-0000-0000-0000-0000000000d1', 'Forged', '00000000-0000-0000-0000-0000000000d8') $$,
  '42501', null, 'an admin cannot write a note in someone else''s name'
);
select throws_ok(
  $$ insert into public.record_notes (student_id, body)
     values ('00000000-0000-0000-0000-0000000000d1', '   ') $$,
  '23514', null, 'an empty note is refused'
);
select throws_ok(
  $$ update public.record_notes set body = 'Changed' $$,
  '42501', null, 'notes cannot be edited'
);
select throws_ok(
  $$ delete from public.record_notes $$,
  '42501', null, 'notes cannot be deleted'
);

-- Admin: status --------------------------------------------------------------------------------

select is(
  (select status::text from public.set_student_status(
     '00000000-0000-0000-0000-0000000000d1', 'deferred', '  Family reasons.  ')),
  'deferred',
  'an admin changes a student''s status'
);
select is(
  (select body from public.record_notes
   where student_id = '00000000-0000-0000-0000-0000000000d1' and kind = 'status_change'),
  'Status changed from Active to Deferred. Family reasons.',
  'the change is logged on the file, with the reason'
);
select throws_ok(
  $$ select public.set_student_status('00000000-0000-0000-0000-0000000000d1', 'deferred') $$,
  '55000', 'The student already has this status', 'setting the same status again is refused'
);
select throws_ok(
  $$ select public.set_student_status('00000000-0000-0000-0000-0000000000ff', 'deferred') $$,
  'P0002', 'Unknown student', 'an unknown student is refused'
);

-- Admin: search -------------------------------------------------------------------------------------

select results_eq(
  $$ select matric_no from public.search_students('recordtest') $$,
  $$ values ('RECTEST/CERT/003'::text), ('RECTEST/DIP/002'), ('RECTEST/CERT/001') $$,
  'search by part of a name, any case, sorted by name'
);
select results_eq(
  $$ select matric_no from public.search_students('rectest/cert', p_sort => 'matric') $$,
  $$ values ('RECTEST/CERT/001'::text), ('RECTEST/CERT/003') $$,
  'search by part of a matric number, sorted by matric number'
);
select results_eq(
  $$ select matric_no from public.search_students('Recordtest',
       p_programme_id => '10000000-0000-0000-0000-0000000000d1',
       p_entry_term_id => '20000000-0000-0000-0000-0000000000d2') $$,
  $$ values ('RECTEST/CERT/003'::text) $$,
  'filter by programme and entry term'
);
select results_eq(
  $$ select matric_no, total_count from public.search_students('Recordtest', p_status => 'deferred', p_limit => 1) $$,
  $$ values ('RECTEST/DIP/002'::text, 2::bigint) $$,
  'filter by status; paging keeps the total count'
);
select results_eq(
  $$ select matric_no from public.search_students('50%_') $$,
  $$ values ('RECTEST/CERT/003'::text) $$,
  '"%" and "_" in a search match themselves, not everything'
);
reset role;

select * from finish();
rollback;
