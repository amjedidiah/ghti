-- Tests for the contact form's daily cap (step 2.6).
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_table('public', 'contact_sends', 'contact_sends exists');
select has_function('public', 'claim_contact_send', array['integer'], 'claim_contact_send exists');

-- Start from an empty day.
delete from public.contact_sends;

set local role anon;
select is(public.claim_contact_send(2), true, 'a visitor takes the first slot of the day');
select is(public.claim_contact_send(2), true, 'and the second');
select is(public.claim_contact_send(2), false, 'the third is refused once the limit is reached');
select throws_ok(
  $$ select public.claim_contact_send(0) $$,
  '22023', null, 'a nonsense limit is refused'
);
select throws_ok($$ select * from public.contact_sends $$, '42501', null, 'visitors cannot read the log');
select throws_ok(
  $$ insert into public.contact_sends default values $$,
  '42501', null, 'visitors cannot write the log directly'
);
reset role;

-- Yesterday's sends do not count against today.
update public.contact_sends set created_at = now() - interval '1 day 1 hour';
set local role anon;
select is(public.claim_contact_send(2), true, 'a new day starts with free slots');
reset role;

select * from finish();
rollback;
