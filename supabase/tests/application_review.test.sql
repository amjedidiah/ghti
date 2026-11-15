-- Tests for admin review and the document view log (Stage 1, step 1.4).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- Fixtures: an applicant with a submitted application and a document, a second
-- applicant with a draft, and an admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test', '{"full_name": "Applicant A"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.test', '{"full_name": "Applicant B"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin@example.test', '{"full_name": "Admin"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d1';

insert into public.applications (id, applicant_id, status, submitted_at) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'submitted', now()),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'draft', null);

insert into public.documents (id, owner_id, application_id, kind, storage_path, file_name, size_bytes, mime)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000000f1', 'transcript',
        '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000f1/t.pdf',
        't.pdf', 100, 'application/pdf');

select has_table('public', 'document_views', 'document_views table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.document_views'::regclass),
  'RLS is enabled on document_views'
);

-- Applicant A cannot review or decide, even their own application ------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.start_review('00000000-0000-0000-0000-0000000000f1') $$,
  '42501', 'Only admins can review applications', 'an applicant cannot start a review'
);

select throws_ok(
  $$ select public.decide_application('00000000-0000-0000-0000-0000000000f1', 'admitted', null) $$,
  '42501', 'Only admins can decide applications', 'an applicant cannot admit themselves'
);

select throws_ok(
  $$ insert into public.document_views (document_id) values ('00000000-0000-0000-0000-0000000000c1') $$,
  '42501', null, 'an applicant cannot write to the view log'
);

select is(
  (select count(*) from public.document_views),
  0::bigint,
  'an applicant cannot read the view log'
);

reset role;

-- Admin ---------------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.start_review('00000000-0000-0000-0000-0000000000f2') $$,
  '55000', 'Application is not waiting for review', 'a draft cannot be put under review'
);

select is(
  (select status::text from public.start_review('00000000-0000-0000-0000-0000000000f1')),
  'under_review',
  'an admin can put a submitted application under review'
);

select throws_ok(
  $$ select public.decide_application('00000000-0000-0000-0000-0000000000f1', 'withdrawn', 'x') $$,
  '22023', 'Decision must be admitted or rejected', 'only admit or reject are decisions'
);

select throws_ok(
  $$ select public.decide_application('00000000-0000-0000-0000-0000000000f1', 'rejected', '   ') $$,
  '23514', 'A note is required when rejecting', 'rejecting needs a note'
);

select throws_ok(
  $$ select public.decide_application('00000000-0000-0000-0000-0000000000f2', 'admitted', null) $$,
  '55000', 'Application is not waiting for a decision', 'a draft cannot be decided'
);

select is(
  (select status::text from public.decide_application(
     '00000000-0000-0000-0000-0000000000f1', 'admitted', '  Welcome to GHTI.  ')),
  'admitted',
  'an admin can admit an application under review'
);

select throws_ok(
  $$ select public.decide_application('00000000-0000-0000-0000-0000000000f1', 'rejected', 'Changed my mind') $$,
  '55000', 'Application is not waiting for a decision', 'a decided application cannot be decided again'
);

select lives_ok(
  $$ insert into public.document_views (document_id) values ('00000000-0000-0000-0000-0000000000c1') $$,
  'an admin can log a document view'
);

select throws_ok(
  $$ insert into public.document_views (document_id, viewer_id)
     values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'an admin cannot log a view in someone else''s name'
);

reset role;

select results_eq(
  $$ select decision_note, reviewed_by::text, decided_at is not null
     from public.applications where id = '00000000-0000-0000-0000-0000000000f1' $$,
  $$ values ('Welcome to GHTI.'::text, '00000000-0000-0000-0000-0000000000d1'::text, true) $$,
  'the decision records the trimmed note, the reviewer and the time'
);

select is(
  (select viewer_id::text from public.document_views where document_id = '00000000-0000-0000-0000-0000000000c1'),
  '00000000-0000-0000-0000-0000000000d1',
  'the view log records the admin who opened the document'
);

select * from finish();

rollback;
