-- Course content (Stage 3, step 3.2).
--
-- lessons            belong to a COURSE, so they carry over to the next
--                    term's class: title, notes, and an unlisted YouTube
--                    video stored as its ID only.
-- materials          Google Drive files for a course (stored as ID and kind),
--                    optionally attached to one of its lessons.
-- lecture_schedules  a programme's timetable for a term, as a Drive file.
--
-- Raw links are never stored: the app keeps the IDs that lib/links.ts parses
-- and rebuilds links itself. Students reach Drive files only through
-- /materials/[id] and /schedules/[id], which check access first.
--
-- Who may do what: students read the content of courses they are registered
-- on (any term); lecturers read and write the content of courses they teach;
-- admins everything. Schedules are public for published programmes (they
-- appear on the programme pages) and written by admins.

create type public.drive_kind as enum ('file', 'document', 'presentation', 'spreadsheet');

-- Helper: is the caller registered on any offering of this course? -------------------------

create or replace function private.registered_on_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.registrations r
    join public.course_offerings o on o.id = r.offering_id
    where o.course_id = p_course_id and r.student_id = (select auth.uid())
  );
$$;

revoke execute on function private.registered_on_course(uuid) from public, anon;
grant execute on function private.registered_on_course(uuid) to authenticated;

-- Lessons --------------------------------------------------------------------------------

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null
    constraint lessons_title_length check (char_length(btrim(title)) between 1 and 200),
  body text not null default ''
    constraint lessons_body_length check (char_length(body) <= 5000),
  youtube_id text
    constraint lessons_youtube_id_format check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  position integer not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- For materials' composite foreign key: a material's lesson is in the same course.
  constraint lessons_id_course_key unique (id, course_id)
);

comment on table public.lessons is
  'A lesson of a course (carries over terms): title, notes and an optional unlisted YouTube video ID.';

create index lessons_course_idx on public.lessons (course_id, position);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- Materials ------------------------------------------------------------------------------

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid,
  title text not null
    constraint materials_title_length check (char_length(btrim(title)) between 1 and 200),
  drive_kind public.drive_kind not null,
  drive_file_id text not null
    constraint materials_drive_file_id_format check (drive_file_id ~ '^[A-Za-z0-9_-]{20,100}$'),
  position integer not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_lesson_fkey foreign key (lesson_id, course_id)
    references public.lessons (id, course_id) on delete set null (lesson_id)
);

comment on table public.materials is
  'A Google Drive file for a course (ID and kind only), optionally attached to one of its lessons.';

create index materials_course_idx on public.materials (course_id, position);
create index materials_lesson_idx on public.materials (lesson_id);

create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- New lessons and materials go last ---------------------------------------------------------

create or replace function public.content_next_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.position = 0 then
    if tg_table_name = 'lessons' then
      select coalesce(max(position), 0) + 1 into new.position
      from public.lessons where course_id = new.course_id;
    else
      select coalesce(max(position), 0) + 1 into new.position
      from public.materials where course_id = new.course_id;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.content_next_position() from public, anon, authenticated;

create trigger lessons_next_position
  before insert on public.lessons
  for each row execute function public.content_next_position();

create trigger materials_next_position
  before insert on public.materials
  for each row execute function public.content_next_position();

-- Lecture schedules ---------------------------------------------------------------------------

create table public.lecture_schedules (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete restrict,
  title text not null
    constraint lecture_schedules_title_length check (char_length(btrim(title)) between 1 and 200),
  drive_kind public.drive_kind not null,
  drive_file_id text not null
    constraint lecture_schedules_drive_file_id_format check (drive_file_id ~ '^[A-Za-z0-9_-]{20,100}$'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.lecture_schedules is
  'A programme''s lecture timetable for a term, as a Google Drive file (ID and kind only).';

create index lecture_schedules_programme_idx on public.lecture_schedules (programme_id, term_id);

create trigger lecture_schedules_set_updated_at
  before update on public.lecture_schedules
  for each row execute function public.set_updated_at();

-- Access control -------------------------------------------------------------------------------

alter table public.lessons enable row level security;
alter table public.materials enable row level security;
alter table public.lecture_schedules enable row level security;

revoke all on public.lessons, public.materials, public.lecture_schedules from anon, authenticated;
grant select, insert, update, delete on public.lessons, public.materials to authenticated;
grant select on public.lecture_schedules to anon;
grant select, insert, update, delete on public.lecture_schedules to authenticated;
grant select, insert, update, delete on public.lessons, public.materials, public.lecture_schedules
  to service_role;

-- Lessons
create policy "Read lessons of courses you teach, take or administer"
  on public.lessons for select to authenticated
  using (
    (select public.is_admin())
    or private.teaches_course(course_id)
    or private.registered_on_course(course_id)
  );

create policy "Lecturers and admins add lessons"
  on public.lessons for insert to authenticated
  with check ((select public.is_admin()) or private.teaches_course(course_id));

create policy "Lecturers and admins edit lessons"
  on public.lessons for update to authenticated
  using ((select public.is_admin()) or private.teaches_course(course_id))
  with check ((select public.is_admin()) or private.teaches_course(course_id));

create policy "Lecturers and admins delete lessons"
  on public.lessons for delete to authenticated
  using ((select public.is_admin()) or private.teaches_course(course_id));

-- Materials
create policy "Read materials of courses you teach, take or administer"
  on public.materials for select to authenticated
  using (
    (select public.is_admin())
    or private.teaches_course(course_id)
    or private.registered_on_course(course_id)
  );

create policy "Lecturers and admins add materials"
  on public.materials for insert to authenticated
  with check ((select public.is_admin()) or private.teaches_course(course_id));

create policy "Lecturers and admins edit materials"
  on public.materials for update to authenticated
  using ((select public.is_admin()) or private.teaches_course(course_id))
  with check ((select public.is_admin()) or private.teaches_course(course_id));

create policy "Lecturers and admins delete materials"
  on public.materials for delete to authenticated
  using ((select public.is_admin()) or private.teaches_course(course_id));

-- Lecture schedules
create policy "Schedules of published programmes are public"
  on public.lecture_schedules for select to anon, authenticated
  using (
    exists (
      select 1 from public.programmes p
      where p.id = lecture_schedules.programme_id and p.status = 'published'
    )
  );

create policy "Admins read all schedules"
  on public.lecture_schedules for select to authenticated
  using ((select public.is_admin()));

create policy "Admins add schedules"
  on public.lecture_schedules for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins edit schedules"
  on public.lecture_schedules for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete schedules"
  on public.lecture_schedules for delete to authenticated
  using ((select public.is_admin()));
