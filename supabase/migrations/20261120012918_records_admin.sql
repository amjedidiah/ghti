-- Records admin (Stage 2, step 2.5).
--
-- record_notes          the "log" in the spec: dated notes on a student's
--                       file. Admins only; append-only (a correction is a new
--                       note), so the history can be trusted.
-- set_student_status()  change a student's status and log it in one go.
-- search_students()     the /admin/students search: name or matric number,
--                       programme, entry term, status, sort, paging. Trigram
--                       indexes keep "contains" searches fast.

create extension if not exists pg_trgm with schema extensions;

create index profiles_full_name_trgm_idx
  on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index students_matric_no_trgm_idx
  on public.students using gin (matric_no extensions.gin_trgm_ops);

-- Record notes ----------------------------------------------------------------------

create type public.record_note_kind as enum ('note', 'status_change');

create table public.record_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  kind public.record_note_kind not null default 'note',
  body text not null
    constraint record_notes_body_length check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.record_notes is
  'Dated notes on a student''s file (the "log"). Admins only. Never edited or deleted.';

create index record_notes_student_idx on public.record_notes (student_id, created_at desc);

alter table public.record_notes enable row level security;

revoke all on public.record_notes from anon, authenticated;
grant select, insert on public.record_notes to authenticated;
grant select, insert, update, delete on public.record_notes to service_role;

create policy "Admins read record notes"
  on public.record_notes
  for select
  to authenticated
  using ((select public.is_admin()));

-- Admins write notes in their own name only.
create policy "Admins write record notes"
  on public.record_notes
  for insert
  to authenticated
  with check ((select public.is_admin()) and author_id = (select auth.uid()));

-- Status changes ---------------------------------------------------------------------

create or replace function public.set_student_status(
  p_student_id uuid,
  p_status public.student_status,
  p_note text default ''
)
returns public.students
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous public.student_status;
  updated public.students;
  labels constant jsonb := '{"active": "Active", "deferred": "Deferred", "withdrawn": "Withdrawn", "graduated": "Graduated"}';
  reason text := btrim(coalesce(p_note, ''));
begin
  if not public.is_admin() then
    raise exception 'Only admins can change a student''s status' using errcode = '42501';
  end if;

  select status into previous from public.students where id = p_student_id for update;
  if not found then
    raise exception 'Unknown student' using errcode = 'P0002';
  end if;
  if previous = p_status then
    raise exception 'The student already has this status' using errcode = '55000';
  end if;

  update public.students set status = p_status where id = p_student_id returning * into updated;

  insert into public.record_notes (student_id, kind, body)
  values (
    p_student_id,
    'status_change',
    format('Status changed from %s to %s.', labels ->> previous::text, labels ->> p_status::text)
      || case when reason <> '' then ' ' || reason else '' end
  );

  return updated;
end;
$$;

comment on function public.set_student_status(uuid, public.student_status, text) is
  'Admins only: change a student''s status and log it on their file, in one transaction.';

revoke execute on function public.set_student_status(uuid, public.student_status, text) from public, anon;
grant execute on function public.set_student_status(uuid, public.student_status, text) to authenticated;

-- Search -------------------------------------------------------------------------------

create or replace function public.search_students(
  p_query text default '',
  p_programme_id uuid default null,
  p_entry_term_id uuid default null,
  p_status public.student_status default null,
  p_sort text default 'name',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  matric_no text,
  full_name text,
  status public.student_status,
  programme_title text,
  entry_term_session text,
  entry_term_name text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  -- Escape LIKE wildcards so a typed "%" or "_" matches itself.
  needle text := replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_');
begin
  if not public.is_admin() then
    raise exception 'Only admins can search students' using errcode = '42501';
  end if;

  return query
    select
      s.id,
      s.matric_no,
      p.full_name,
      s.status,
      pr.title,
      t.session,
      t.name,
      s.created_at,
      count(*) over ()
    from public.students s
    join public.profiles p on p.id = s.id
    join public.programmes pr on pr.id = s.programme_id
    join public.terms t on t.id = s.entry_term_id
    where (needle = ''
           or p.full_name ilike '%' || needle || '%'
           or s.matric_no ilike '%' || needle || '%')
      and (p_programme_id is null or s.programme_id = p_programme_id)
      and (p_entry_term_id is null or s.entry_term_id = p_entry_term_id)
      and (p_status is null or s.status = p_status)
    order by
      case when p_sort = 'matric' then s.matric_no end,
      case when p_sort = 'newest' then s.created_at end desc,
      p.full_name,
      s.matric_no
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.search_students(text, uuid, uuid, public.student_status, text, integer, integer) is
  'Admins only: search students by name or matric number, with filters, sort (name, matric, newest) and paging.';

revoke execute on function public.search_students(text, uuid, uuid, public.student_status, text, integer, integer) from public, anon;
grant execute on function public.search_students(text, uuid, uuid, public.student_status, text, integer, integer) to authenticated;
