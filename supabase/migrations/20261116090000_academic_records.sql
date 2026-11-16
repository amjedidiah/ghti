-- Academic structure and student records (Stage 2, steps 2.1 and 2.2).
--
-- students           one row per admitted applicant, keyed by their profile
-- courses            the courses of a programme, by year and semester
-- course_offerings   a course taught in a given term (lecturer optional until Stage 3)
-- registrations      a student taking an offering
-- grading_scale      score bands: letter and grade point (client input #17)
--
-- Students read only their own record, registrations, offerings and courses.
-- The public reads the courses of published programmes (programme pages).
-- Admins do everything. Lecturer policies arrive in Stage 3.
-- Deletes are restricted wherever a record hangs off a row, so academic history
-- cannot vanish by accident.

-- Students -------------------------------------------------------------------------

create type public.student_status as enum ('active', 'deferred', 'withdrawn', 'graduated');

create table public.students (
  id uuid primary key references public.profiles (id) on delete restrict,
  matric_no text not null
    constraint students_matric_no_key unique
    constraint students_matric_no_format check (matric_no ~ '^[A-Z0-9][A-Z0-9/\-]{0,39}$'),
  programme_id uuid not null references public.programmes (id) on delete restrict,
  entry_term_id uuid not null references public.terms (id) on delete restrict,
  application_id uuid
    constraint students_application_id_key unique
    references public.applications (id) on delete set null,
  status public.student_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.students is
  'Admitted applicants. Same account as the application; id is the profile id. Biodata stays on the application.';
comment on column public.students.matric_no is
  'Upper case letters, digits, "/" and "-", e.g. GHTI/2026/DIP/001. Final format: client input #18.';
comment on column public.students.application_id is
  'The application this student was admitted from, when there is one.';

create index students_programme_idx on public.students (programme_id);
create index students_entry_term_idx on public.students (entry_term_id);

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- Courses --------------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete restrict,
  code text not null
    constraint courses_code_format check (code ~ '^[A-Z0-9][A-Z0-9 ./\-]{1,19}$'),
  title text not null
    constraint courses_title_length check (char_length(title) between 1 and 200),
  credit_units smallint not null
    constraint courses_credit_units_range check (credit_units between 0 and 30),
  year smallint not null
    constraint courses_year_range check (year between 1 and 8),
  semester smallint not null
    constraint courses_semester_range check (semester between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_programme_code_key unique (programme_id, code)
);

comment on table public.courses is
  'Courses of a programme. Listed on programme pages by year and semester (client input #16).';
comment on column public.courses.code is
  'Upper case, e.g. "BIB 101". Unique within a programme.';

create index courses_listing_idx on public.courses (programme_id, year, semester, code);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- Course offerings -----------------------------------------------------------------

create table public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  term_id uuid not null references public.terms (id) on delete restrict,
  lecturer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offerings_course_term_key unique (course_id, term_id)
);

comment on table public.course_offerings is
  'A course taught in a given term. The lecturer is optional until Stage 3.';

create index course_offerings_term_idx on public.course_offerings (term_id);
create index course_offerings_lecturer_idx on public.course_offerings (lecturer_id);

create trigger course_offerings_set_updated_at
  before update on public.course_offerings
  for each row execute function public.set_updated_at();

-- Registrations --------------------------------------------------------------------

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  offering_id uuid not null references public.course_offerings (id) on delete restrict,
  registered_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint registrations_student_offering_key unique (student_id, offering_id)
);

comment on table public.registrations is
  'A student taking a course offering. Admins register students (in bulk) each term.';

create index registrations_offering_idx on public.registrations (offering_id);

-- Grading scale --------------------------------------------------------------------
-- One row per band, keyed by its lowest score: a total gets the band with the
-- highest min_score at or below it. Lower bounds only, so decimal totals such
-- as 69.5 can never fall between two bands.

create table public.grading_scale (
  id uuid primary key default gen_random_uuid(),
  min_score numeric(5, 2) not null
    constraint grading_scale_min_score_key unique
    constraint grading_scale_min_score_range check (min_score between 0 and 100),
  letter text not null
    constraint grading_scale_letter_key unique
    constraint grading_scale_letter_format check (letter ~ '^[A-Z][+-]?$'),
  grade_point numeric(3, 2) not null
    constraint grading_scale_grade_point_range check (grade_point between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.grading_scale is
  'Score bands. A total gets the band with the highest min_score at or below it. Must include a band at 0. Client input #17.';

create trigger grading_scale_set_updated_at
  before update on public.grading_scale
  for each row execute function public.set_updated_at();

-- Access control: grants -------------------------------------------------------------
-- This Supabase version grants API roles nothing on new tables; grant only what
-- the policies below can use, service_role included.

alter table public.students enable row level security;
alter table public.courses enable row level security;
alter table public.course_offerings enable row level security;
alter table public.registrations enable row level security;
alter table public.grading_scale enable row level security;

revoke all on public.students, public.courses, public.course_offerings,
  public.registrations, public.grading_scale from anon, authenticated;

grant select on public.courses to anon;
grant select, insert, update, delete on public.students, public.courses,
  public.course_offerings, public.grading_scale to authenticated;
grant select, insert, delete on public.registrations to authenticated;
grant select, insert, update, delete on public.students, public.courses,
  public.course_offerings, public.registrations, public.grading_scale to service_role;

-- Access control: students -----------------------------------------------------------

create policy "Students read their own record"
  on public.students for select to authenticated
  using (id = (select auth.uid()));

create policy "Admins read all students"
  on public.students for select to authenticated
  using ((select public.is_admin()));

create policy "Admins create students"
  on public.students for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update students"
  on public.students for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete students"
  on public.students for delete to authenticated
  using ((select public.is_admin()));

-- Access control: courses ------------------------------------------------------------

create policy "Courses of published programmes are public"
  on public.courses for select to anon, authenticated
  using (
    exists (
      select 1 from public.programmes p
      where p.id = courses.programme_id and p.status = 'published'
    )
  );

create policy "Students read the courses they are registered on"
  on public.courses for select to authenticated
  using (
    exists (
      select 1
      from public.course_offerings o
      join public.registrations r on r.offering_id = o.id
      where o.course_id = courses.id and r.student_id = (select auth.uid())
    )
  );

create policy "Admins read all courses"
  on public.courses for select to authenticated
  using ((select public.is_admin()));

create policy "Admins create courses"
  on public.courses for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update courses"
  on public.courses for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete courses"
  on public.courses for delete to authenticated
  using ((select public.is_admin()));

-- Access control: course offerings ---------------------------------------------------

create policy "Students read the offerings they are registered on"
  on public.course_offerings for select to authenticated
  using (
    exists (
      select 1 from public.registrations r
      where r.offering_id = course_offerings.id and r.student_id = (select auth.uid())
    )
  );

create policy "Admins read all offerings"
  on public.course_offerings for select to authenticated
  using ((select public.is_admin()));

create policy "Admins create offerings"
  on public.course_offerings for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update offerings"
  on public.course_offerings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete offerings"
  on public.course_offerings for delete to authenticated
  using ((select public.is_admin()));

-- Access control: registrations ------------------------------------------------------
-- No update: a registration is created or removed, never edited.

create policy "Students read their own registrations"
  on public.registrations for select to authenticated
  using (student_id = (select auth.uid()));

create policy "Admins read all registrations"
  on public.registrations for select to authenticated
  using ((select public.is_admin()));

create policy "Admins register students"
  on public.registrations for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins remove registrations"
  on public.registrations for delete to authenticated
  using ((select public.is_admin()));

-- Access control: grading scale ------------------------------------------------------

create policy "Signed-in users read the grading scale"
  on public.grading_scale for select to authenticated
  using (true);

create policy "Admins create grading bands"
  on public.grading_scale for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update grading bands"
  on public.grading_scale for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete grading bands"
  on public.grading_scale for delete to authenticated
  using ((select public.is_admin()));
