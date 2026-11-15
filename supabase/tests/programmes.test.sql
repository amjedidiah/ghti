-- RLS and constraint tests for public.programmes (Stage 1, step 1.1).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- Fixtures (inserted as the test superuser; rolled back at the end).
insert into public.programmes (slug, title, level, duration, status) values
  ('test-published-cert', 'Test Published Certificate', 'certificate', '1 year', 'published'),
  ('test-draft-diploma', 'Test Draft Diploma', 'diploma', '2 years', 'draft'),
  ('test-archived-degree', 'Test Archived Degree', 'degree', '4 years', 'archived');

-- Structure -------------------------------------------------------------------

select has_table('public', 'programmes', 'programmes table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.programmes'::regclass),
  'RLS is enabled on programmes'
);

select policies_are(
  'public', 'programmes',
  array['Published programmes are public'],
  'programmes has only the expected policies'
);

-- Anonymous visitors ----------------------------------------------------------

set local role anon;

select results_eq(
  $$ select slug from public.programmes where slug like 'test-%' order by slug $$,
  $$ values ('test-published-cert'::text) $$,
  'anon sees published programmes only'
);

select throws_ok(
  $$ insert into public.programmes (slug, title, level, duration)
     values ('test-anon-insert', 'X', 'certificate', '1 year') $$,
  '42501', null, 'anon cannot insert programmes'
);

select throws_ok(
  $$ update public.programmes set title = 'Changed' $$,
  '42501', null, 'anon cannot update programmes'
);

select throws_ok(
  $$ delete from public.programmes $$,
  '42501', null, 'anon cannot delete programmes'
);

reset role;

-- Signed-in users (no admin role exists yet) ------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}',
  true
);

select results_eq(
  $$ select slug from public.programmes where slug like 'test-%' order by slug $$,
  $$ values ('test-published-cert'::text) $$,
  'signed-in users see published programmes only'
);

select throws_ok(
  $$ insert into public.programmes (slug, title, level, duration)
     values ('test-user-insert', 'X', 'certificate', '1 year') $$,
  '42501', null, 'signed-in users cannot insert programmes'
);

select throws_ok(
  $$ update public.programmes set title = 'Changed' $$,
  '42501', null, 'signed-in users cannot update programmes'
);

select throws_ok(
  $$ delete from public.programmes $$,
  '42501', null, 'signed-in users cannot delete programmes'
);

reset role;

-- Constraints and triggers ------------------------------------------------------

select throws_ok(
  $$ insert into public.programmes (slug, title, level, duration)
     values ('Not A Slug', 'X', 'certificate', '1 year') $$,
  '23514', null, 'slug must be lowercase kebab-case'
);

update public.programmes
  set updated_at = '2000-01-01'
  where slug = 'test-published-cert';

select is(
  (select updated_at from public.programmes where slug = 'test-published-cert'),
  now(),
  'updated_at is set by trigger on update'
);

select * from finish();

rollback;
