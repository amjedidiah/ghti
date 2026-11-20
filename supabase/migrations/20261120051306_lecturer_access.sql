-- Lecturers: assignment and access (Stage 3, step 3.1).
--
-- A lecturer reads the offerings they are assigned to, those courses, their
-- classes' registrations, and writes draft or submitted grades for them;
-- never published ones (admins approve and publish, step 3.3).
--
-- The student policies on course_offerings read registrations, so a lecturer
-- policy on registrations that read course_offerings back would recurse
-- (42P17). The checks therefore live in SECURITY DEFINER helpers in the
-- `private` schema, which the API does not expose (Supabase RLS guidance).
--
-- Lecturers never read the profiles or students tables: class_list() gives
-- them each student's name and matric number only (data minimisation).

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Helpers -------------------------------------------------------------------------------

create or replace function private.teaches_offering(p_offering_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.course_offerings o
    where o.id = p_offering_id and o.lecturer_id = (select auth.uid())
  );
$$;

create or replace function private.teaches_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.course_offerings o
    where o.course_id = p_course_id and o.lecturer_id = (select auth.uid())
  );
$$;

create or replace function private.teaches_registration(p_registration_id uuid)
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
    where r.id = p_registration_id and o.lecturer_id = (select auth.uid())
  );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.teaches_offering(uuid) to authenticated;
grant execute on function private.teaches_course(uuid) to authenticated;
grant execute on function private.teaches_registration(uuid) to authenticated;

-- Only lecturers can be assigned to an offering -------------------------------------------

create or replace function public.course_offerings_check_lecturer()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.lecturer_id is not null
     and (tg_op = 'INSERT' or new.lecturer_id is distinct from old.lecturer_id)
     and not exists (
       select 1 from public.profiles p where p.id = new.lecturer_id and p.role = 'lecturer'
     ) then
    raise exception 'Only a lecturer can be assigned to a course' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.course_offerings_check_lecturer() from public, anon, authenticated;

create trigger course_offerings_check_lecturer
  before insert or update of lecturer_id on public.course_offerings
  for each row execute function public.course_offerings_check_lecturer();

-- Lecturer policies ------------------------------------------------------------------------

create policy "Lecturers read their own offerings"
  on public.course_offerings for select to authenticated
  using (lecturer_id = (select auth.uid()));

create policy "Lecturers read the courses they teach"
  on public.courses for select to authenticated
  using (private.teaches_course(id));

create policy "Lecturers read their classes' registrations"
  on public.registrations for select to authenticated
  using (private.teaches_offering(offering_id));

create policy "Lecturers read their classes' grades"
  on public.grades for select to authenticated
  using (private.teaches_registration(registration_id));

create policy "Lecturers enter draft or submitted grades"
  on public.grades for insert to authenticated
  with check (
    status in ('draft', 'submitted') and private.teaches_registration(registration_id)
  );

create policy "Lecturers update their draft grades"
  on public.grades for update to authenticated
  using (status = 'draft' and private.teaches_registration(registration_id))
  with check (
    status in ('draft', 'submitted') and private.teaches_registration(registration_id)
  );

create policy "Lecturers delete their draft grades"
  on public.grades for delete to authenticated
  using (status = 'draft' and private.teaches_registration(registration_id));

-- Class list ------------------------------------------------------------------------------

create or replace function public.class_list(p_offering_id uuid)
returns table (
  registration_id uuid,
  matric_no text,
  full_name text,
  grade_status public.grade_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or private.teaches_offering(p_offering_id)) then
    raise exception 'Only the course''s lecturer or an admin can see this class' using errcode = '42501';
  end if;
  return query
    select r.id, s.matric_no, p.full_name, g.status
    from public.registrations r
    join public.students s on s.id = r.student_id
    join public.profiles p on p.id = s.id
    left join public.grades g on g.registration_id = r.id
    where r.offering_id = p_offering_id
    order by s.matric_no;
end;
$$;

comment on function public.class_list(uuid) is
  'The class for an offering (name and matric number only), for its lecturer or an admin.';

revoke execute on function public.class_list(uuid) from public, anon;
grant execute on function public.class_list(uuid) to authenticated;

-- Staff roles: someone who stops being a lecturer is unassigned from their courses --------

create or replace function public.set_staff_role(p_user_id uuid, p_role public.app_role)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_role_ public.app_role;
  admins integer;
  updated public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change staff roles' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'lecturer', 'applicant') then
    raise exception 'Staff can be admins or lecturers, or lose staff access' using errcode = '22023';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role' using errcode = '55000';
  end if;

  -- Lock every admin row, so two admins cannot demote each other at once.
  perform 1 from public.profiles where role = 'admin' for update;
  select role into current_role_ from public.profiles where id = p_user_id for update;
  if current_role_ is null or current_role_ not in ('admin', 'lecturer') then
    raise exception 'Only staff roles can be changed here' using errcode = '55000';
  end if;
  if current_role_ = p_role then
    raise exception 'This person already has that role' using errcode = '55000';
  end if;
  if current_role_ = 'admin' then
    select count(*) into admins from public.profiles where role = 'admin';
    if admins <= 1 then
      raise exception 'GHTI must keep at least one admin' using errcode = '55000';
    end if;
  end if;

  if current_role_ = 'lecturer' then
    update public.course_offerings set lecturer_id = null where lecturer_id = p_user_id;
  end if;

  update public.profiles set role = p_role where id = p_user_id returning * into updated;
  return updated;
end;
$$;
