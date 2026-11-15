-- Programmes offered by GHTI (Certificate, Diploma, Degree).
-- Stage 1, step 1.1. Public can read published programmes; nobody can write
-- through the API yet. Admin write policies arrive with `profiles` (step 1.2).

-- Shared helper: keep `updated_at` current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: sets updated_at to now() on update.';

create type public.programme_level as enum ('certificate', 'diploma', 'degree');
create type public.programme_status as enum ('draft', 'published', 'archived');

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint programmes_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null
    constraint programmes_title_length check (char_length(title) between 1 and 200),
  level public.programme_level not null,
  duration text not null
    constraint programmes_duration_length check (char_length(duration) between 1 and 100),
  description text not null default '',
  requirements text not null default '',
  status public.programme_status not null default 'draft',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.programmes is
  'Programmes offered by GHTI. Only published programmes are publicly visible.';
comment on column public.programmes.duration is
  'Human-readable length, e.g. "1 year" or "4 years (8 semesters)".';
comment on column public.programmes.position is
  'Display order within a level; lower comes first.';

create index programmes_listing_idx on public.programmes (status, level, position);

create trigger programmes_set_updated_at
  before update on public.programmes
  for each row execute function public.set_updated_at();

-- Access control -------------------------------------------------------------

alter table public.programmes enable row level security;

-- Defence in depth: the API roles get only the privileges a policy can use.
-- Step 1.2 grants insert/update/delete to `authenticated` alongside the
-- admin-only write policies.
revoke all on public.programmes from anon, authenticated;
grant select on public.programmes to anon, authenticated;

create policy "Published programmes are public"
  on public.programmes
  for select
  to anon, authenticated
  using (status = 'published');
