-- RLS, trigger and role-guard tests for public.profiles (Stage 1, step 1.2).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures: three users created as the test superuser. The sign-up trigger
-- creates their profiles. Rolled back at the end.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'applicant-a@example.test', '{"full_name": "Applicant A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'applicant-b@example.test', '{"full_name": "Applicant B", "role": "admin"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.test', '{"full_name": "Admin"}');

-- Promote the admin as server-side tooling would (current_user = postgres).
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

-- Structure ---------------------------------------------------------------------

select has_table('public', 'profiles', 'profiles table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);

select policies_are(
  'public', 'profiles',
  array[
    'Users read their own profile',
    'Admins read all profiles',
    'Users update their own profile',
    'Admins update any profile'
  ],
  'profiles has only the expected policies'
);

-- Sign-up trigger -----------------------------------------------------------------

select results_eq(
  $$ select full_name, role::text from public.profiles
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('Applicant A'::text, 'applicant'::text) $$,
  'sign-up creates a profile with the full name and role applicant'
);

select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'applicant',
  'a role in sign-up metadata is ignored'
);

-- Anonymous visitors --------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null, 'anon cannot read profiles'
);

reset role;

-- Applicant A ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select is(
  (select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-0000000000%'),
  1::bigint,
  'an applicant sees only their own profile'
);

select is(public.current_app_role()::text, 'applicant', 'current_app_role() is applicant');
select is(public.is_admin(), false, 'is_admin() is false for an applicant');

select lives_ok(
  $$ update public.profiles set full_name = 'Applicant A Renamed'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  'an applicant can update their own name'
);

update public.profiles set full_name = 'Hacked'
  where id = '00000000-0000-0000-0000-00000000000b';

select throws_ok(
  $$ update public.profiles set role = 'admin'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', 'Only admins can change roles', 'an applicant cannot change their own role'
);

select throws_ok(
  $$ insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000ff') $$,
  '42501', null, 'an applicant cannot insert profiles'
);

select throws_ok(
  $$ delete from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'an applicant cannot delete profiles'
);

reset role;

select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'Applicant B',
  'an applicant cannot update someone else''s profile'
);

select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Applicant A Renamed',
  'the applicant''s own update was saved'
);

-- Admin ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000ad", "role": "authenticated"}', true);

select is(public.is_admin(), true, 'is_admin() is true for an admin');

select is(
  (select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-0000000000%'),
  3::bigint,
  'an admin sees all profiles'
);

select lives_ok(
  $$ update public.profiles set role = 'student'
     where id = '00000000-0000-0000-0000-00000000000b' $$,
  'an admin can change someone''s role'
);

reset role;

select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'student',
  'the admin''s role change was saved'
);

-- Server-side tooling (secret key -> service_role) ---------------------------------

set local role service_role;

select lives_ok(
  $$ update public.profiles set role = 'lecturer'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  'service_role (server tooling) can change roles, e.g. to create the first admin'
);

reset role;

select * from finish();

rollback;
