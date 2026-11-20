-- GHTI's own words on the public pages, editable by admins in /admin/content
-- (Stage 3, step 3.5). Replaces lib/content.ts and the contact details that
-- lived in code. One row per piece of text; a missing row means "not given
-- yet", and the page shows a "Waiting for GHTI" placeholder.
--
-- The value's shape per key (text, list of paragraphs, Statement of Faith
-- articles) is checked by the app (lib/site-content.ts); the database keeps
-- to a known list of keys and a JSON string or array.

create table public.site_content (
  key text primary key
    constraint site_content_key_known check (key in (
      'welcome', 'mission', 'history', 'statement_of_faith',
      'contact_address', 'contact_phone', 'contact_email', 'map_query', 'office_hours',
      'data_controller', 'privacy_email', 'application_fee'
    )),
  value jsonb not null
    constraint site_content_value_shape check (jsonb_typeof(value) in ('string', 'array')),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.site_content is
  'Public text GHTI edits in /admin/content (welcome, mission, history, Statement of Faith, contact and privacy details, application fee). Anyone reads; admins write.';

-- Who changed it and when: always the signed-in admin, now.
create or replace function public.site_content_stamp()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.site_content_stamp() from public, anon, authenticated;

create trigger site_content_stamp
  before insert or update on public.site_content
  for each row execute function public.site_content_stamp();

alter table public.site_content enable row level security;

revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
-- update (key, value): an API upsert (insert ... on conflict do update) sets every column it sends.
grant insert (key, value), update (key, value), delete on public.site_content to authenticated;
grant select, insert, update, delete on public.site_content to service_role;

create policy "Anyone reads site content"
  on public.site_content for select to anon, authenticated
  using (true);

create policy "Admins add site content"
  on public.site_content for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins change site content"
  on public.site_content for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins remove site content"
  on public.site_content for delete to authenticated
  using ((select public.is_admin()));

-- The text GHTI has already sent (client input #9, 16 and 20 Nov 2026).
insert into public.site_content (key, value) values
  ('welcome', to_jsonb('We train pastors, church workers, market men and women, born again Christians in every sphere of life. Join us now.'::text)),
  ('mission', to_jsonb('To equip leaders with relevant training to love God and love people to Christ, live a Christ-like life and serve as agents of transformation in the society.'::text));
