-- Grades and their audit trail (Stage 2, step 2.3).
--
-- grades         one row per registration: CA and exam scores; the total,
--                letter and grade point are worked out by trigger from the
--                grading scale and stored, so a later change to the scale
--                never silently rewrites an old result.
-- grade_changes  every change to a published grade, with who, when and why.
--                Written only by trigger; never edited.
--
-- Students read only their own PUBLISHED grades. Admins do everything, but a
-- published grade changes only with a reason (change_published_grade) and can
-- never be deleted. Lecturer policies arrive in Stage 3.
-- The CA/exam split is set in the app (lib/grades.ts) until GHTI confirms it
-- (client input #17); the database only requires CA + exam <= 100.

create type public.grade_status as enum ('draft', 'submitted', 'published');

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null
    constraint grades_registration_id_key unique
    references public.registrations (id) on delete restrict,
  ca_score numeric(5, 2)
    constraint grades_ca_score_range check (ca_score between 0 and 100),
  exam_score numeric(5, 2)
    constraint grades_exam_score_range check (exam_score between 0 and 100),
  total numeric(5, 2),
  letter text,
  grade_point numeric(3, 2),
  status public.grade_status not null default 'draft',
  entered_by uuid default auth.uid() references public.profiles (id) on delete set null,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grades_total_max check (coalesce(ca_score, 0) + coalesce(exam_score, 0) <= 100),
  constraint grades_published_complete check (
    status <> 'published' or (ca_score is not null and exam_score is not null)
  )
);

comment on table public.grades is
  'One grade per registration. Total, letter and grade point are set by trigger from the grading scale. Students see published grades only.';
comment on column public.grades.letter is
  'Snapshot from grading_scale when the scores were saved; a later scale change does not alter it.';

create trigger grades_set_updated_at
  before update on public.grades
  for each row execute function public.set_updated_at();

create table public.grade_changes (
  id bigint generated always as identity primary key,
  grade_id uuid not null references public.grades (id) on delete restrict,
  old_values jsonb not null,
  new_values jsonb not null,
  reason text not null
    constraint grade_changes_reason_length check (char_length(reason) between 1 and 500),
  changed_by uuid default auth.uid() references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

comment on table public.grade_changes is
  'Audit trail: every change to a published grade. Written only by trigger; never edited.';

create index grade_changes_grade_idx on public.grade_changes (grade_id, changed_at desc);

-- Triggers ---------------------------------------------------------------------------

-- Work out total, letter and grade point; stamp publication.
create or replace function public.grades_compute()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  band record;
begin
  if tg_op = 'UPDATE' and new.registration_id is distinct from old.registration_id then
    raise exception 'A grade cannot move to another registration' using errcode = '42501';
  end if;

  if new.ca_score is null and new.exam_score is null then
    new.total := null;
    new.letter := null;
    new.grade_point := null;
  elsif tg_op = 'INSERT'
     or new.ca_score is distinct from old.ca_score
     or new.exam_score is distinct from old.exam_score
     or new.letter is null then
    new.total := coalesce(new.ca_score, 0) + coalesce(new.exam_score, 0);
    select g.letter, g.grade_point into band
    from public.grading_scale g
    where g.min_score <= new.total
    order by g.min_score desc
    limit 1;
    new.letter := band.letter;
    new.grade_point := band.grade_point;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
    new.published_by := auth.uid();
  elsif new.status <> 'published' then
    new.published_at := null;
    new.published_by := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.grades_compute() from public, anon, authenticated;

create trigger grades_compute
  before insert or update on public.grades
  for each row execute function public.grades_compute();

-- A published grade changes only with a reason, set by change_published_grade.
create or replace function public.grades_guard_published()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'published' then
      raise exception 'A published grade cannot be deleted' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.status = 'published'
     and nullif(current_setting('ghti.grade_change_reason', true), '') is null then
    raise exception 'Changing a published grade needs a reason' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.grades_guard_published() from public, anon, authenticated;

create trigger grades_guard_published
  before update or delete on public.grades
  for each row execute function public.grades_guard_published();

-- Every change to a published grade goes to grade_changes. SECURITY DEFINER:
-- nobody may write to the log directly.
create or replace function public.grades_log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'published' and (
    new.ca_score is distinct from old.ca_score
    or new.exam_score is distinct from old.exam_score
    or new.status is distinct from old.status
  ) then
    insert into public.grade_changes (grade_id, old_values, new_values, reason, changed_by)
    values (
      new.id,
      jsonb_build_object('ca_score', old.ca_score, 'exam_score', old.exam_score,
                         'total', old.total, 'letter', old.letter, 'status', old.status),
      jsonb_build_object('ca_score', new.ca_score, 'exam_score', new.exam_score,
                         'total', new.total, 'letter', new.letter, 'status', new.status),
      current_setting('ghti.grade_change_reason', true),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.grades_log_change() from public, anon, authenticated;

create trigger grades_log_change
  after update on public.grades
  for each row execute function public.grades_log_change();

-- Change a published grade --------------------------------------------------------------

create or replace function public.change_published_grade(
  p_grade_id uuid,
  p_ca_score numeric,
  p_exam_score numeric,
  p_status public.grade_status,
  p_reason text
)
returns public.grades
language plpgsql
security invoker
set search_path = ''
as $$
declare
  reason text := nullif(trim(coalesce(p_reason, '')), '');
  grade public.grades;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change published grades' using errcode = '42501';
  end if;
  if reason is null then
    raise exception 'Give a reason for the change' using errcode = '23514';
  end if;
  if char_length(reason) > 500 then
    raise exception 'Keep the reason under 500 characters' using errcode = '22001';
  end if;

  perform set_config('ghti.grade_change_reason', reason, true);

  update public.grades
  set ca_score = p_ca_score, exam_score = p_exam_score, status = p_status
  where id = p_grade_id and status = 'published'
  returning * into grade;

  if not found then
    raise exception 'That grade is not published' using errcode = '55000';
  end if;

  perform set_config('ghti.grade_change_reason', '', true);
  return grade;
end;
$$;

comment on function public.change_published_grade(uuid, numeric, numeric, public.grade_status, text) is
  'Admin: change a published grade (scores, or unpublish) with a reason; the change is logged in grade_changes.';

revoke execute on function public.change_published_grade(uuid, numeric, numeric, public.grade_status, text)
  from public, anon;
grant execute on function public.change_published_grade(uuid, numeric, numeric, public.grade_status, text)
  to authenticated;

-- Access control -------------------------------------------------------------------------

alter table public.grades enable row level security;
alter table public.grade_changes enable row level security;

revoke all on public.grades, public.grade_changes from anon, authenticated;
grant select, delete on public.grades to authenticated;
grant insert (id, registration_id, ca_score, exam_score, status) on public.grades to authenticated;
grant update (ca_score, exam_score, status) on public.grades to authenticated;
grant select on public.grade_changes to authenticated;
grant select, insert, update, delete on public.grades to service_role;
grant select on public.grade_changes to service_role;

create policy "Students read their own published grades"
  on public.grades for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.registrations r
      where r.id = grades.registration_id and r.student_id = (select auth.uid())
    )
  );

create policy "Admins read all grades"
  on public.grades for select to authenticated
  using ((select public.is_admin()));

create policy "Admins enter grades"
  on public.grades for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update grades"
  on public.grades for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete unpublished grades"
  on public.grades for delete to authenticated
  using ((select public.is_admin()) and status <> 'published');

create policy "Admins read the grade change log"
  on public.grade_changes for select to authenticated
  using ((select public.is_admin()));
