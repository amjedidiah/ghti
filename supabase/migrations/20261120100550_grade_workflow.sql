-- Grade workflow (Stage 3, step 3.3): lecturers enter scores and submit them
-- for approval; admins publish them, or return them to the lecturer with a
-- note.
--
-- Lecturers already write draft and submitted grades for their own classes
-- (20261120051306_lecturer_access.sql), and can change only drafts, so a
-- submitted grade is locked for them until an admin publishes or returns it.
--
-- grade_returns  each time an admin sends a course's submitted grades back:
--                the note, how many grades and who. Written only by
--                return_grades(); read by admins and the course's lecturer.

-- A grade is submitted for approval only when it has both scores, as it is
-- published only then.
alter table public.grades
  add constraint grades_submitted_complete check (
    status <> 'submitted' or (ca_score is not null and exam_score is not null)
  );

create table public.grade_returns (
  id bigint generated always as identity primary key,
  offering_id uuid not null references public.course_offerings (id) on delete cascade,
  note text not null
    constraint grade_returns_note_length check (char_length(note) between 1 and 1000),
  grades_returned integer not null constraint grade_returns_count check (grades_returned > 0),
  returned_by uuid references public.profiles (id) on delete set null,
  returned_at timestamptz not null default now()
);

comment on table public.grade_returns is
  'Each time an admin returned a course''s submitted grades to its lecturer, with the note. Written only by return_grades().';

create index grade_returns_offering_idx on public.grade_returns (offering_id, returned_at desc);

alter table public.grade_returns enable row level security;

revoke all on public.grade_returns from anon, authenticated;
grant select on public.grade_returns to authenticated;
grant select on public.grade_returns to service_role;

create policy "Admins read grade returns"
  on public.grade_returns for select to authenticated
  using ((select public.is_admin()));

create policy "Lecturers read their courses' grade returns"
  on public.grade_returns for select to authenticated
  using (private.teaches_offering(offering_id));

-- Return a course's submitted grades ----------------------------------------------------

-- SECURITY DEFINER: nobody may write grade_returns directly. Published and
-- draft grades are left alone; only submitted ones go back to draft.
create or replace function public.return_grades(p_offering_id uuid, p_note text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  note text := nullif(trim(coalesce(p_note, '')), '');
  returned integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can return grades' using errcode = '42501';
  end if;
  if note is null then
    raise exception 'Say what the lecturer should look at' using errcode = '23514';
  end if;
  if char_length(note) > 1000 then
    raise exception 'Keep the note under 1,000 characters' using errcode = '22001';
  end if;

  update public.grades g
  set status = 'draft'
  from public.registrations r
  where r.id = g.registration_id
    and r.offering_id = p_offering_id
    and g.status = 'submitted';
  get diagnostics returned = row_count;

  if returned = 0 then
    raise exception 'This course has no submitted grades to return' using errcode = '55000';
  end if;

  insert into public.grade_returns (offering_id, note, grades_returned, returned_by)
  values (p_offering_id, note, returned, (select auth.uid()));
  return returned;
end;
$$;

comment on function public.return_grades(uuid, text) is
  'Admin: send a course''s submitted grades back to draft for its lecturer, with a note (kept in grade_returns). Returns how many.';

revoke execute on function public.return_grades(uuid, text) from public, anon;
grant execute on function public.return_grades(uuid, text) to authenticated;
