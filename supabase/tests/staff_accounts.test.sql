-- Tests for staff accounts: staff_accounts, account_by_email, set_staff_role (step 3.1).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at, invited_at) values
  ('00000000-0000-0000-0000-0000000000b1', 'staff-admin-a@example.test', '{"full_name": "Admin A"}', now(), null),
  ('00000000-0000-0000-0000-0000000000b2', 'staff-lecturer@example.test', '{"full_name": "Lecturer L"}', null, now()),
  ('00000000-0000-0000-0000-0000000000b3', 'staff-student@example.test', '{"full_name": "Student S"}', now(), null);

-- Keep the test independent of seeded admins: only these accounts are admins here.
update public.profiles set role = 'applicant' where role = 'admin';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set role = 'lecturer' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set role = 'student' where id = '00000000-0000-0000-0000-0000000000b3';

-- Non-admins --------------------------------------------------------------------------

set local role anon;
select throws_ok($$ select * from public.staff_accounts() $$, '42501', null, 'anon cannot list staff');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}', true);
select throws_ok(
  $$ select * from public.staff_accounts() $$,
  '42501', 'Only admins can list staff', 'a lecturer cannot list staff'
);
select throws_ok(
  $$ select * from public.account_by_email('staff-student@example.test') $$,
  '42501', 'Only admins can look up accounts', 'a lecturer cannot look up accounts'
);
select throws_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000b1', 'lecturer') $$,
  '42501', 'Only admins can change staff roles', 'a lecturer cannot change roles'
);
reset role;

-- Admin -----------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);

select results_eq(
  $$ select email, role::text, confirmed_at is not null, invited_at is not null
     from public.staff_accounts() order by email $$,
  $$ values ('staff-admin-a@example.test'::text, 'admin'::text, true, false),
            ('staff-lecturer@example.test', 'lecturer', false, true) $$,
  'staff_accounts lists lecturers and admins with email and invitation state, not students'
);

select results_eq(
  $$ select role::text, confirmed from public.account_by_email('  STAFF-Student@example.test ') $$,
  $$ values ('student'::text, true) $$,
  'account_by_email finds an account whatever the case and spacing'
);
select is_empty(
  $$ select * from public.account_by_email('nobody@example.test') $$,
  'account_by_email returns nothing for an unknown email'
);

select throws_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000b1', 'lecturer') $$,
  '55000', 'You cannot change your own role', 'an admin cannot change their own role'
);
select throws_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000b3', 'lecturer') $$,
  '55000', 'Only staff roles can be changed here', 'a student cannot be made staff here'
);
select throws_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000b2', 'student') $$,
  '22023', null, 'staff cannot be made students here'
);
select throws_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000b2', 'lecturer') $$,
  '55000', 'This person already has that role', 'setting the same role is refused'
);

select is(
  (select role::text from public.set_staff_role('00000000-0000-0000-0000-0000000000b2', 'admin')),
  'admin',
  'an admin makes a lecturer an admin'
);
select is(
  (select role::text from public.set_staff_role('00000000-0000-0000-0000-0000000000b2', 'lecturer')),
  'lecturer',
  'and back to lecturer'
);
reset role;

-- Another admin can demote an admin; then that admin has no admin rights left.
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b2';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}', true);
select is(
  (select role::text from public.set_staff_role('00000000-0000-0000-0000-0000000000b1', 'lecturer')),
  'lecturer',
  'with two admins, one can make the other a lecturer'
);
reset role;

-- Removing staff access.
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set role = 'lecturer' where id = '00000000-0000-0000-0000-0000000000b2';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);
select is(
  (select role::text from public.set_staff_role('00000000-0000-0000-0000-0000000000b2', 'applicant')),
  'applicant',
  'an admin removes a lecturer''s staff access'
);
select is_empty(
  $$ select * from public.staff_accounts() where email = 'staff-lecturer@example.test' $$,
  'they no longer appear among staff'
);
reset role;

select * from finish();
rollback;
