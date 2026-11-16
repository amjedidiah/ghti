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
