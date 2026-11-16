-- RLS and constraint tests for public.programmes (steps 1.1 and 1.2).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- Fixtures (inserted as the test superuser; rolled back at the end).
insert into public.programmes (slug, title, level, duration, status) values
  ('test-published-cert', 'Test Published Certificate', 'certificate', '1 year', 'published'),
  ('test-draft-diploma', 'Test Draft Diploma', 'diploma', '2 years', 'draft'),
  ('test-archived-pgd', 'Test Archived PGD', 'postgraduate_diploma', '4 years', 'archived');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'applicant@example.test', '{"full_name": "Applicant"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.test', '{"full_name": "Admin"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a2';

-- Structure -------------------------------------------------------------------

select has_table('public', 'programmes', 'programmes table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.programmes'::regclass),
  'RLS is enabled on programmes'
);

select policies_are(
  'public', 'programmes',
  array[
    'Published programmes are public',
    'Admins read all programmes',
    'Admins create programmes',
    'Admins update programmes',
    'Admins delete programmes'
  ],
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

-- Signed-in non-admin (applicant) -------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);

select results_eq(
  $$ select slug from public.programmes where slug like 'test-%' order by slug $$,
  $$ values ('test-published-cert'::text) $$,
  'an applicant sees published programmes only'
);

select throws_ok(
  $$ insert into public.programmes (slug, title, level, duration)
     values ('test-user-insert', 'X', 'certificate', '1 year') $$,
  '42501', null, 'an applicant cannot insert programmes'
);

-- RLS filters these to zero rows: no error and no effect (checked below as superuser).
update public.programmes set title = 'Changed' where slug like 'test-%';
delete from public.programmes where slug like 'test-%';

reset role;

select is(
  (select count(*) from public.programmes where slug like 'test-%' and title <> 'Changed'),
  3::bigint,
  'an applicant can neither update nor delete programmes'
);

-- Admin ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}', true);

select results_eq(
  $$ select slug from public.programmes where slug like 'test-%' order by slug $$,
  $$ values ('test-archived-pgd'::text), ('test-draft-diploma'), ('test-published-cert') $$,
  'an admin sees programmes in every status'
);

select lives_ok(
  $$ insert into public.programmes (slug, title, level, duration)
     values ('test-admin-insert', 'Admin Insert', 'certificate', '1 year') $$,
  'an admin can insert programmes'
);

update public.programmes set status = 'published' where slug = 'test-draft-diploma';
delete from public.programmes where slug = 'test-archived-pgd';

reset role;

select is(
  (select status::text from public.programmes where slug = 'test-draft-diploma'),
  'published',
  'an admin can update programmes'
);

select is(
  (select count(*) from public.programmes where slug = 'test-archived-pgd'),
  0::bigint,
  'an admin can delete programmes'
);

-- Constraints and triggers ------------------------------------------------------

select is(
  (select title from public.programmes where slug = 'test-published-cert'),
  'Test Published Certificate',
  'the applicant''s update did not change anything'
);

select throws_ok(
  $$ insert into public.programmes (slug, title, level, duration)
     values ('Not A Slug', 'X', 'certificate', '1 year') $$,
  '23514', null, 'slug must be lowercase kebab-case'
);

select throws_ok(
  $$ insert into public.programmes (slug, title, level, duration)
     values ('test-empty-title', '', 'certificate', '1 year') $$,
  '23514', null, 'title cannot be empty'
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
