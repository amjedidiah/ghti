-- Local development seed. ALL DATA HERE IS FAKE except the three published
-- programme titles (client input #7, 16 Nov 2026); their durations,
-- descriptions and requirements are placeholders until GHTI supplies them.
-- Never put real applicant or student data in this file.

insert into public.programmes (slug, title, level, duration, description, requirements, status, position) values
  (
    'certificate-in-theology',
    'Certificate in Theology',
    'certificate',
    '1 year (2 semesters)',
    'A foundation in the Scriptures, Christian doctrine and the life of prayer, for believers who want to grow in their faith and serve in their local church.',
    'Secondary school certificate (or equivalent). A letter of recommendation from your pastor or CRM branch leader.',
    'published',
    1
  ),
  (
    'ordinary-diploma-in-theology',
    'Ordinary Diploma in Theology',
    'diploma',
    '2 years (4 semesters)',
    'Deeper study of the Old and New Testaments, church history, pastoral care and preaching, preparing students for ministry leadership.',
    'Five credits at O level including English, or a GHTI Certificate. A letter of recommendation from your pastor or CRM branch leader.',
    'published',
    1
  ),
  (
    'post-graduate-diploma-in-theology',
    'Post Graduate Diploma in Theology',
    'postgraduate_diploma',
    '1 year (2 semesters)',
    'Theological training for graduates of other disciplines: biblical studies, systematic theology, missions and supervised ministry practice.',
    'A first degree or HND in any discipline. A letter of recommendation and an interview.',
    'published',
    1
  ),
  (
    'diploma-in-christian-counselling',
    'Diploma in Christian Counselling',
    'diploma',
    '2 years (4 semesters)',
    'Not yet published: visible to admins only once admin access lands.',
    'To be confirmed.',
    'draft',
    2
  );

-- An open intake (FAKE dates: real intakes and key dates come from the client, input #6).
insert into public.terms (session, name, starts_on, ends_on, accepting_applications) values
  ('2026/2027', 'Second semester', '2027-02-01', '2027-06-30', true),
  ('2026/2027', 'First semester', '2026-09-14', '2027-01-29', false);

-- A grading scale (FAKE: a common Nigerian 5-point scale until GHTI confirms
-- theirs, client input #17). A total gets the band with the highest min_score
-- at or below it.
insert into public.grading_scale (min_score, letter, grade_point) values
  (70, 'A', 5), (60, 'B', 4), (50, 'C', 3), (45, 'D', 2), (40, 'E', 1), (0, 'F', 0);

-- Courses (FAKE codes and titles until GHTI sends the course list, client
-- input #16), and first-semester offerings of the year-one courses.
insert into public.courses (programme_id, code, title, credit_units, year, semester)
select p.id, c.code, c.title, c.credit_units, c.year, c.semester
from public.programmes p
join (values
  ('certificate-in-theology', 'BIB 101', 'Introduction to the Bible', 3, 1, 1),
  ('certificate-in-theology', 'THE 101', 'Foundations of Christian Doctrine', 3, 1, 1),
  ('certificate-in-theology', 'PRA 102', 'Prayer and the Spiritual Life', 2, 1, 2),
  ('ordinary-diploma-in-theology', 'OTS 201', 'Old Testament Survey', 3, 1, 1),
  ('ordinary-diploma-in-theology', 'NTS 202', 'New Testament Survey', 3, 1, 2),
  ('ordinary-diploma-in-theology', 'PAS 301', 'Pastoral Care and Counselling', 3, 2, 1),
  ('post-graduate-diploma-in-theology', 'SYS 701', 'Systematic Theology', 4, 1, 1),
  ('post-graduate-diploma-in-theology', 'HER 702', 'Biblical Hermeneutics', 3, 1, 2)
) as c (slug, code, title, credit_units, year, semester) on c.slug = p.slug;

insert into public.course_offerings (course_id, term_id)
select c.id, t.id
from public.courses c
cross join public.terms t
where c.year = 1 and c.semester = 1
  and t.session = '2026/2027' and t.name = 'First semester';

-- Local accounts (FAKE, local only; never in the cloud). Passwords are for
-- the local Docker stack and are printed in AGENTS.md.
--   admin:      local-admin@example.test / local-admin-pass-123
--   applicants: amaka.admitted@example.test, tunde.submitted@example.test
--               (password local-applicant-pass-123)
--   students:   chidi.student@example.test, ngozi.student@example.test
--               (password local-student-pass-123)
--   lecturer:   lecturer@example.test / local-lecturer-pass-123
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt(u.password, extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
from (values
  ('00000000-0000-0000-0000-00000000ad01'::uuid, 'local-admin@example.test', 'local-admin-pass-123', 'Local Admin'),
  ('00000000-0000-0000-0000-00000000a701'::uuid, 'amaka.admitted@example.test', 'local-applicant-pass-123', 'Amaka Okafor'),
  ('00000000-0000-0000-0000-00000000a702'::uuid, 'tunde.submitted@example.test', 'local-applicant-pass-123', 'Tunde Bello'),
  ('00000000-0000-0000-0000-0000000005a1'::uuid, 'chidi.student@example.test', 'local-student-pass-123', 'Chidi Eze'),
  ('00000000-0000-0000-0000-0000000005a2'::uuid, 'ngozi.student@example.test', 'local-student-pass-123', 'Ngozi Adeyemi'),
  ('00000000-0000-0000-0000-00000000ec01'::uuid, 'lecturer@example.test', 'local-lecturer-pass-123', 'Rev. Local Lecturer')
) as u (id, email, password, full_name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like '%@example.test';

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000ad01';
update public.profiles set role = 'lecturer' where id = '00000000-0000-0000-0000-00000000ec01';

-- Two applications: one admitted (ready to enrol as a student), one submitted.
insert into public.applications (
  applicant_id, programme_id, intake_term_id, status, surname, first_name, email, submitted_at, decided_at, decision_note
)
select a.applicant_id, p.id, t.id, a.status::public.application_status, a.surname, a.first_name, a.email,
  now() - interval '3 days', case when a.status = 'admitted' then now() - interval '1 day' end,
  case when a.status = 'admitted' then 'Welcome to GHTI.' end
from (values
  ('00000000-0000-0000-0000-00000000a701'::uuid, 'admitted', 'Okafor', 'Amaka', 'amaka.admitted@example.test'),
  ('00000000-0000-0000-0000-00000000a702'::uuid, 'submitted', 'Bello', 'Tunde', 'tunde.submitted@example.test')
) as a (applicant_id, status, surname, first_name, email)
cross join public.programmes p
cross join public.terms t
where p.slug = 'certificate-in-theology' and t.session = '2026/2027' and t.name = 'Second semester';

-- Two enrolled students on the Certificate, starting in the first semester
-- (FAKE matric numbers until GHTI's format arrives, client input #18).
update public.profiles set role = 'student'
where id in ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000005a2');

insert into public.students (id, matric_no, programme_id, entry_term_id)
select s.id, s.matric_no, p.id, t.id
from (values
  ('00000000-0000-0000-0000-0000000005a1'::uuid, 'GHTI/2026/CERT/101'),
  ('00000000-0000-0000-0000-0000000005a2'::uuid, 'GHTI/2026/CERT/102')
) as s (id, matric_no)
cross join public.programmes p
cross join public.terms t
where p.slug = 'certificate-in-theology' and t.session = '2026/2027' and t.name = 'First semester';

-- Both students take the Certificate's first-semester courses (FAKE).
insert into public.registrations (student_id, offering_id)
select s.id, o.id
from public.students s
join public.course_offerings o on true
join public.courses c on c.id = o.course_id and c.programme_id = s.programme_id
join public.terms t on t.id = o.term_id
where s.matric_no in ('GHTI/2026/CERT/101', 'GHTI/2026/CERT/102')
  and t.session = '2026/2027' and t.name = 'First semester';

-- Grades (FAKE): both first-semester results published for Chidi; Ngozi has
-- one published and one draft (drafts never reach the portal).
insert into public.grades (registration_id, ca_score, exam_score, status)
select r.id, g.ca, g.exam, g.status::public.grade_status
from (values
  ('GHTI/2026/CERT/101', 'BIB 101', 28.0, 45.0, 'published'),
  ('GHTI/2026/CERT/101', 'THE 101', 30.0, 32.0, 'published'),
  ('GHTI/2026/CERT/102', 'BIB 101', 35.0, 50.0, 'published'),
  ('GHTI/2026/CERT/102', 'THE 101', 20.0, null, 'draft')
) as g (matric_no, code, ca, exam, status)
join public.students s on s.matric_no = g.matric_no
join public.registrations r on r.student_id = s.id
join public.course_offerings o on o.id = r.offering_id
join public.courses c on c.id = o.course_id and c.code = g.code;

-- Notes on the students' files (FAKE), written by the local admin. The
-- "results are out" email has not gone yet, so /admin/grades offers it.
insert into public.record_notes (student_id, author_id, kind, body, created_at)
select s.id, '00000000-0000-0000-0000-00000000ad01', n.kind::public.record_note_kind, n.body, n.at::timestamptz
from (values
  ('GHTI/2026/CERT/101', 'note', 'Brought original WAEC certificate for sighting. Copy matches the upload.', '2026-11-16 10:00+01'),
  ('GHTI/2026/CERT/102', 'note', 'Asked about moving to the Diploma next session. Told to apply when the intake opens.', '2026-11-17 14:30+01')
) as n (matric_no, kind, body, at)
join public.students s on s.matric_no = n.matric_no;

-- The local lecturer (FAKE) teaches BIB 101 in the first semester.
update public.course_offerings o
set lecturer_id = '00000000-0000-0000-0000-00000000ec01'
from public.courses c, public.terms t
where c.id = o.course_id and t.id = o.term_id
  and c.code = 'BIB 101' and t.session = '2026/2027' and t.name = 'First semester';
