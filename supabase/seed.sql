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
