-- Tests for site content (step 3.5). Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000005c1', 'sc-admin@example.test', '{"full_name": "Admin"}'),
  ('00000000-0000-0000-0000-0000000005c2', 'sc-student@example.test', '{"full_name": "Student"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000005c1';
update public.profiles set role = 'student' where id = '00000000-0000-0000-0000-0000000005c2';

select has_table('public', 'site_content', 'site_content exists');
select policies_are('public', 'site_content', array[
  'Anyone reads site content', 'Admins add site content', 'Admins change site content',
  'Admins remove site content'
], 'site_content has only the expected policies');

-- Anyone reads ------------------------------------------------------------------------------

set local role anon;
select results_eq(
  $$ select value #>> '{}' from public.site_content where key = 'mission' $$,
  $$ values ('To equip leaders with relevant training to love God and love people to Christ, live a Christ-like life and serve as agents of transformation in the society.'::text) $$,
  'anyone reads the text GHTI has sent'
);
select throws_ok(
  $$ insert into public.site_content (key, value) values ('history', '["x"]') $$,
  '42501', null, 'anon cannot write'
);
reset role;

-- A student cannot write ---------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000005c2", "role": "authenticated"}', true);
select throws_ok(
  $$ insert into public.site_content (key, value) values ('history', '["x"]') $$,
  '42501', null, 'a student cannot add site content'
);
select is_empty(
  $$ update public.site_content set value = '"Hacked"' where key = 'mission' returning key $$,
  'a student cannot change site content'
);
reset role;

-- Admins write ---------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000005c1", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.site_content (key, value)
     values ('history', '["Founded as a fake college.", "Grew a lot."]')
     on conflict (key) do update set key = excluded.key, value = excluded.value $$,
  'an admin adds a piece of text'
);
select lives_ok(
  $$ insert into public.site_content (key, value) values ('mission', '"A new mission."')
     on conflict (key) do update set key = excluded.key, value = excluded.value $$,
  'and saves over existing text the way the API upserts'
);
select results_eq(
  $$ select updated_by from public.site_content where key = 'history' $$,
  $$ values ('00000000-0000-0000-0000-0000000005c1'::uuid) $$,
  'the change is stamped with the admin who made it'
);
select throws_ok(
  $$ insert into public.site_content (key, value) values ('anything_else', '"x"') $$,
  '23514', null, 'only known keys can be stored'
);
select throws_ok(
  $$ insert into public.site_content (key, value) values ('office_hours', '{"a": 1}') $$,
  '23514', null, 'a value is a string or a list'
);
select throws_ok(
  $$ update public.site_content set updated_by = '00000000-0000-0000-0000-0000000005c2' where key = 'history' $$,
  '42501', null, 'nobody sets who made a change'
);
select lives_ok(
  $$ delete from public.site_content where key = 'history' $$,
  'an admin clears a piece of text (the page shows a placeholder again)'
);
reset role;

select * from finish();
rollback;
