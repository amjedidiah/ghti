-- Tests for the CSV export log (step 3.5).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'export-student@example.test', '{"full_name": "Student C"}'),
  ('00000000-0000-0000-0000-0000000000c9', 'export-admin@example.test', '{"full_name": "Admin C"}'),
  ('00000000-0000-0000-0000-0000000000c8', 'export-admin2@example.test', '{"full_name": "Admin D"}');
update public.profiles set role = 'admin'
  where id in ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c8');

select has_table('public', 'export_log', 'export_log exists');

set local role anon;
select throws_ok($$ select * from public.export_log $$, '42501', null, 'anon cannot read the log');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);
select throws_ok(
  $$ insert into public.export_log (kind, row_count) values ('students', 1) $$,
  '42501', null, 'a non-admin cannot write to the log'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c9", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.export_log (kind, filters, row_count)
     values ('results', '{"termId": "x", "includeDrafts": false}', 12) $$,
  'an admin logs an export'
);
select is(
  (select exported_by from public.export_log where filters ->> 'termId' = 'x'),
  '00000000-0000-0000-0000-0000000000c9'::uuid,
  'the log records who exported'
);
select throws_ok(
  $$ insert into public.export_log (kind, row_count, exported_by)
     values ('students', 1, '00000000-0000-0000-0000-0000000000c8') $$,
  '42501', null, 'an admin cannot log an export in another admin''s name'
);
select throws_ok(
  $$ insert into public.export_log (kind, filters, row_count) values ('students', '[1]', 1) $$,
  '23514', null, 'filters must be an object'
);
select throws_ok(
  $$ update public.export_log set row_count = 0 $$,
  '42501', null, 'the log cannot be edited'
);
select throws_ok($$ delete from public.export_log $$, '42501', null, 'the log cannot be deleted');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);
select is_empty($$ select * from public.export_log $$, 'a non-admin cannot read the log');
reset role;

select * from finish();
rollback;
