-- From applicant to student (Stage 2, step 2.2).
--
-- enrol_student() turns an admitted application into a student record on the
-- same account, in one transaction: it creates the students row (matric
-- number, programme, entry term, link to the application) and changes the
-- profile's role to `student`. Only admins may call it.

create or replace function public.enrol_student(
  p_application_id uuid,
  p_matric_no text,
  p_entry_term_id uuid default null
)
returns public.students
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
  matric text := upper(trim(coalesce(p_matric_no, '')));
  term_id uuid;
  student public.students;
begin
  if not public.is_admin() then
    raise exception 'Only admins can enrol students' using errcode = '42501';
  end if;

  select * into app
  from public.applications
  where id = p_application_id
  for update;

  if not found or app.status <> 'admitted' then
    raise exception 'Only admitted applications can be enrolled' using errcode = '55000';
  end if;

  if app.programme_id is null then
    raise exception 'The application has no programme' using errcode = '55000';
  end if;

  if exists (select 1 from public.students s where s.id = app.applicant_id) then
    raise exception 'This applicant is already a student' using errcode = '55000';
  end if;

  -- The entry term defaults to the intake the applicant chose.
  term_id := coalesce(p_entry_term_id, app.intake_term_id);
  if term_id is null then
    raise exception 'Choose an entry term' using errcode = '23502';
  end if;

  insert into public.students (id, matric_no, programme_id, entry_term_id, application_id)
  values (app.applicant_id, matric, app.programme_id, term_id, app.id)
  returning * into student;

  -- Definer context: guard_profile_role only checks API roles, and the caller
  -- was checked above.
  update public.profiles set role = 'student' where id = app.applicant_id;

  return student;
end;
$$;

comment on function public.enrol_student(uuid, text, uuid) is
  'Admin: make an admitted applicant a student (matric number, entry term) and change their role to student, in one transaction.';

revoke execute on function public.enrol_student(uuid, text, uuid) from public, anon;
grant execute on function public.enrol_student(uuid, text, uuid) to authenticated;
