-- Tests for student records: admin uploads and change requests (step 3.5).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- Fixtures: students S1 and S2 (no application), applicant A with a draft and
-- one document, an admin.
insert into public.programmes (id, slug, title, level, duration, status) values
  ('10000000-0000-0000-0000-0000000000f1', 'test-records', 'Test Records', 'certificate', '1 year', 'draft');
insert into public.terms (id, session, name) values
  ('20000000-0000-0000-0000-0000000000f1', '2038/2039', 'Test records term');
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000006a1', 'sr-s1@example.test', '{"full_name": "Student One"}'),
  ('00000000-0000-0000-0000-0000000006a2', 'sr-s2@example.test', '{"full_name": "Student Two"}'),
  ('00000000-0000-0000-0000-0000000006a3', 'sr-applicant@example.test', '{"full_name": "Applicant"}'),
  ('00000000-0000-0000-0000-0000000006a9', 'sr-admin@example.test', '{"full_name": "Admin"}');
update public.profiles set role = 'student'
  where id in ('00000000-0000-0000-0000-0000000006a1', '00000000-0000-0000-0000-0000000006a2');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000006a9';
insert into public.students (id, matric_no, programme_id, entry_term_id) values
  ('00000000-0000-0000-0000-0000000006a1', 'SR/001', '10000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000006a2', 'SR/002', '10000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000f1');
insert into public.applications (id, applicant_id) values
  ('30000000-0000-0000-0000-0000000006a3', '00000000-0000-0000-0000-0000000006a3');
insert into public.documents (id, owner_id, application_id, kind, storage_path, file_name, size_bytes, mime) values
  ('90000000-0000-0000-0000-0000000006a3', '00000000-0000-0000-0000-0000000006a3',
   '30000000-0000-0000-0000-0000000006a3', 'transcript',
   '00000000-0000-0000-0000-0000000006a3/30000000-0000-0000-0000-0000000006a3/t.pdf', 't.pdf', 100, 'application/pdf');

select has_table('public', 'change_requests', 'change_requests exists');
select policies_are('public', 'change_requests', array[
  'Students read their own change requests', 'Admins read change requests',
  'Students ask for a change to their own record'
], 'change_requests has only the expected policies');

-- Admin uploads ------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000006a9", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '00000000-0000-0000-0000-0000000006a1/records/letter.pdf') $$,
  'an admin uploads a file to a student''s records folder'
);
select lives_ok(
  $$ insert into public.documents (owner_id, kind, storage_path, file_name, size_bytes, mime)
     values ('00000000-0000-0000-0000-0000000006a1', 'other',
             '00000000-0000-0000-0000-0000000006a1/records/letter.pdf', 'letter.pdf', 100, 'application/pdf') $$,
  'and records it on the student''s file'
);
select results_eq(
  $$ select uploaded_by from public.documents where file_name = 'letter.pdf' $$,
  $$ values ('00000000-0000-0000-0000-0000000006a9'::uuid) $$,
  'the upload is stamped with the admin'
);
select throws_ok(
  $$ insert into public.documents (owner_id, kind, storage_path, file_name, size_bytes, mime)
     values ('00000000-0000-0000-0000-0000000006a1', 'other',
             '00000000-0000-0000-0000-0000000006a1/elsewhere/x.pdf', 'x.pdf', 100, 'application/pdf') $$,
  '23514', null, 'a file''s document must sit in the student''s records folder'
);
select throws_ok(
  $$ insert into public.documents (owner_id, kind, storage_path, file_name, size_bytes, mime)
     values ('00000000-0000-0000-0000-0000000006a3', 'other',
             '00000000-0000-0000-0000-0000000006a3/records/x.pdf', 'x.pdf', 100, 'application/pdf') $$,
  '42501', null, 'only students have a file to add documents to'
);
select is_empty(
  $$ delete from public.documents where id = '90000000-0000-0000-0000-0000000006a3' returning id $$,
  'an admin cannot remove an applicant''s document'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000006a1", "role": "authenticated"}', true);
select results_eq(
  $$ select file_name from public.documents where owner_id = '00000000-0000-0000-0000-0000000006a1' $$,
  $$ values ('letter.pdf'::text) $$,
  'a student sees documents on their own file'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '00000000-0000-0000-0000-0000000006a1/records/mine.pdf') $$,
  '42501', null, 'a student cannot upload to their records folder'
);
select throws_ok(
  $$ insert into public.documents (owner_id, kind, storage_path, file_name, size_bytes, mime)
     values ('00000000-0000-0000-0000-0000000006a1', 'other',
             '00000000-0000-0000-0000-0000000006a1/records/mine.pdf', 'mine.pdf', 100, 'application/pdf') $$,
  '42501', null, 'or add documents to their file'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000006a9", "role": "authenticated"}', true);
select lives_ok(
  $$ delete from public.documents where file_name = 'letter.pdf' $$,
  'an admin removes a document from a student''s file'
);
reset role;

-- Change requests ----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000006a1", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.change_requests (body) values ('My date of birth should be 14 March 1995.') $$,
  'a student asks for a change to their record'
);
select throws_ok(
  $$ insert into public.change_requests (body) values ('Too short') $$,
  '23514', null, 'a request says what is wrong (at least 10 characters)'
);
select throws_ok(
  $$ insert into public.change_requests (body, status) values ('Mark this resolved please.', 'resolved') $$,
  '42501', null, 'a student cannot resolve their own request'
);
insert into public.change_requests (body) values
  ('My middle name is spelt Chukwuemeka.'), ('My phone number has changed to 0803.');
select throws_ok(
  $$ insert into public.change_requests (body) values ('A fourth request while three wait.') $$,
  '55000', null, 'at most three requests wait at once'
);
select throws_ok(
  $$ select public.resolve_change_request(
       (select id from public.change_requests limit 1), 'Done.') $$,
  '42501', null, 'a student cannot resolve a request'
);

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000006a2", "role": "authenticated"}', true);
select is_empty($$ select * from public.change_requests $$, 'a student sees only their own requests');

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000006a3", "role": "authenticated"}', true);
select throws_ok(
  $$ insert into public.change_requests (body) values ('I am not a student yet, but...') $$,
  '42501', null, 'only students make change requests'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000006a9", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.resolve_change_request(
       (select id from public.change_requests where body like 'My date%'), '  ') $$,
  '23514', null, 'resolving needs a note'
);
select is(
  (select status::text from public.resolve_change_request(
     (select id from public.change_requests where body like 'My date%'),
     'Corrected from the birth certificate.')),
  'resolved',
  'an admin resolves a request with a note'
);
select results_eq(
  $$ select kind::text, body from public.record_notes
     where student_id = '00000000-0000-0000-0000-0000000006a1' $$,
  $$ values ('change_request'::text,
             E'Request: My date of birth should be 14 March 1995.\nResolution: Corrected from the birth certificate.') $$,
  'the request and its resolution go on the student''s file'
);
select throws_ok(
  $$ select public.resolve_change_request(
       (select id from public.change_requests where body like 'My date%'), 'Again.') $$,
  '55000', null, 'a request is resolved once'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000006a1", "role": "authenticated"}', true);
select results_eq(
  $$ select status::text, resolution from public.change_requests where body like 'My date%' $$,
  $$ values ('resolved'::text, 'Corrected from the birth certificate.'::text) $$,
  'the student sees the outcome'
);
select lives_ok(
  $$ insert into public.change_requests (body) values ('Now there is room for another one.') $$,
  'a resolved request no longer counts towards the three'
);
reset role;

select * from finish();
rollback;
