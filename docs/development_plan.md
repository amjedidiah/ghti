# Development Plan

Website, admissions portal and student records system for **GHTI**, a CRM institution offering Certificate, Diploma and Degree programmes. It sits alongside the other CRM subdomains (`hymns.`, `cwl.`, `protection.crm-world.org.ng`).

This plan is designed for an **AI-Assisted Workflow** (Cursor IDE + Claude, or any other tools).  
The AI handles the boilerplate and styling, while humans act as the **Architect and Reviewer**.

This is an **app**: applications, logins, four roles, academic records and grades.  
Most of the work is data modelling and access control, so the data model and auth come first and visuals second.

## Scope (from the preliminary spec, section 2 "Website & Portal Features")

| #   | Spec item                                                                                                        | What it means here                                                            | Phase    |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| 1   | **Homepage & Faith Pillar:** welcome banner, institutional vision, history, GHTI Statement of Faith              | Public pages, content managed by admins                                       | 3        |
| 2   | **Academics & Programme Layout:** Certificate, Diploma and Degree programmes with downloadable lecture schedules | Programme pages built from the database; schedules as Drive links             | 3        |
| 3   | **Online Admissions Portal:** application form with biodata and digital transcript upload                        | Applicant accounts, multi-step form, private document upload, review workflow | 4        |
| 4   | **Student Track Record System:** secure portal for records, grades and academic histories                        | Student portal (read-only records) + grade workflow with an audit trail       | 5, 6     |
| 5   | **Admin Dashboard (and training):** faculty log, update and search student academic files                        | Admin and lecturer portals, record search, notes log, staff training          | 6, 7, 10 |
| 6   | **Contact & Campus Directions:** contact forms, office phone details, addresses                                  | Contact page with form, phone, addresses and a map embed                      | 3        |

Also carried over from the original brief: course materials downloads, links to videos, and certificates.

## Guiding Constraints (agreed with the team)

- **Keep running costs at or near zero until the platform matures.** Every service starts on a free tier; upgrades are triggered by real usage.
- **Videos:** YouTube, as unlisted videos. **Course materials and lecture schedules:** Google Drive. **Database and authentication:** Supabase.
- **Content is uploaded manually** to YouTube or Drive, and the links are pasted into the portal. The lecturer and admin portals must make this easy and validate the links.
- **Uniform look with the other subdomains.** Reuse the shared CRM header and footer from `cwl` and `protection` for marketing pages
- **Simplicity and ease of use first**, the same priority as the hymns web app.

### One exception: applicant documents

The spec's transcript upload can't follow the "Drive for files" rule.

Transcripts are private personal records uploaded by the public, not course content pasted in by staff.  
Uploading them straight into a Drive the ministry owns would need a service account, a shared drive and extra code, and Drive links are easy to over-share.

**Recommendation:** a **private Supabase Storage bucket**, used only for applicant and student documents.

- The free tier includes 1 GB. At a 5 MB cap per file (phone photos are compressed in the browser first, so most files are well under 2 MB), that covers several hundred applicants.
- Access is enforced by the same RLS rules as the database. Admins open files through short-lived signed URLs, so nothing is ever public.

## Open Questions

These change scope. Defaults below are what the plan assumes until answered.

| #   | Question                                                                                                      | Assumed default                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | What is GHTI's full name? Is there a section 1 (or more) of the spec I haven't seen?                          | Plan built from section 2 only                                                                                    |
| 2   | Fees: is there an application fee or tuition to be paid online?                                               | **No online payments in v1.** Admins can mark fees as paid manually                                               |
| 3   | Grading: which scale (e.g. 5-point CGPA), and is a score split into continuous assessment + exam?             | Configurable scale table; CA + exam scores                                                                        |
| 4   | Which biodata fields? Is there an existing paper application form?                                            | Common fields (see Phase 4); confirm against their form                                                           |
| 5   | Who enters grades: lecturers, the registrar, or both?                                                         | **Lecturers enter, registrar approves and publishes**                                                             |
| 6   | Is teaching in person, online, or both?                                                                       | **Hybrid.** In-person classes; the portal also carries recorded lectures and materials                            |
| 7   | Certificates: are official certificates and transcripts printed by the school, or downloaded from the portal? | School prints official ones; portal provides an **unofficial transcript** and a public **verify** page for awards |
| 8   | Subdomain?                                                                                                    | `ghti.crm-world.org.ng`                                                                                           |
| 9   | Rough number of applicants and students in year one, and the launch date?                                     | Under 1,000 students                                                                                              |

### Content needed from the client

- [ ] Welcome banner text and images, vision, history, Statement of Faith.
- [ ] Programme list: level, title, duration, entry requirements, courses per semester.
- [ ] Lecture schedules (PDFs or Docs, to be uploaded to the ministry Drive).
- [ ] Office phone numbers, email, campus address(es), map location.
- [ ] Application form fields and admission requirements.
- [ ] Grading scale and award names.
- [ ] Names and emails of the first admins and lecturers.

## The "AI-First" Implementation Plan

### Phase 0 — Decisions & Setup

> Goal: Lock scope and set the rules before any code is written.

- [ ] Get answers to the Open Questions (at minimum 1, 3, 4, 5 and 8).
- [ ] Create the GitHub repo and give the team access. _(Repo created: `amjedidiah/ghti`; team access pending.)_
- [x] Create Cursor rules and a `CLAUDE.md` file (stack, folder conventions, RLS-first rule, storage rule).
- [x] Create the Supabase project (free tier). Project `ghti`, ref `htbaujxaorlblkixiixx`, `eu-west-2`. Not linked yet; development stays on the local Docker stack.
- [ ] Set up a ministry-owned Google Drive folder for course materials and schedules, and a YouTube channel (or playlist convention) for unlisted lectures. Both belong to the institution, not a person. _(Deferred: later.)_

### Phase 1 — Architecture & The "Source of Truth"

> Goal: Data model, roles and access rules, enforced in the database.

#### 1.1. Roles

| Role                          | Can do                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `applicant`                   | Fill and submit their own application; upload documents; see its status                       |
| `student`                     | See their own record, grades, registrations, course content and awards                        |
| `lecturer`                    | Manage content and enter grades for the course offerings assigned to them; see those students |
| `admin` (registrar / faculty) | Everything: admissions, records, grade approval, programmes, site content, users              |

An applicant who is admitted becomes a `student` on the same account.

#### 1.2. Data Model (Supabase Postgres)

**People and admissions:**

| Table          | Key fields                                                                                                                       | Notes                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `profiles`     | `id` (= auth user), `full_name`, `phone`, `role`                                                                                 | Created by trigger on sign-up, default `applicant`                                            |
| `applications` | `id`, `applicant_id`, `programme_id`, `intake_term_id`, biodata fields, `status`, `reviewed_by`, `decision_note`, `submitted_at` | `status`: `draft` \| `submitted` \| `under_review` \| `admitted` \| `rejected` \| `withdrawn` |
| `documents`    | `id`, `owner_id`, `application_id?`, `kind`, `storage_path`, `size_bytes`, `mime`                                                | `kind`: `transcript` \| `id_card` \| `photo` \| `other`                                       |
| `students`     | `id` (= profile), `matric_no`, `programme_id`, `entry_term_id`, `status`                                                         | `status`: `active` \| `deferred` \| `withdrawn` \| `graduated`                                |
| `record_notes` | `id`, `student_id`, `author_id`, `body`, `created_at`                                                                            | The "log" in the spec: dated notes on a student's file                                        |

**Academics:**

| Table               | Key fields                                                                                            | Notes                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `programmes`        | `id`, `slug`, `title`, `level`, `duration`, `description`, `requirements`, `status`                   | `level`: `certificate` \| `diploma` \| `degree` |
| `terms`             | `id`, `session` (e.g. `2026/2027`), `name`, `starts_on`, `ends_on`                                    | Semesters or terms                              |
| `courses`           | `id`, `programme_id`, `code`, `title`, `credit_units`, `year`, `semester`                             |                                                 |
| `course_offerings`  | `id`, `course_id`, `term_id`, `lecturer_id`                                                           | A course taught in a given term                 |
| `registrations`     | `id`, `student_id`, `offering_id`                                                                     | Student takes an offering                       |
| `grades`            | `registration_id`, `ca_score`, `exam_score`, `total`, `letter`, `grade_point`, `status`, `entered_by` | `status`: `draft` \| `submitted` \| `published` |
| `grade_changes`     | `id`, `grade_id`, `old_values`, `new_values`, `changed_by`, `reason`, `changed_at`                    | Written by trigger; never edited                |
| `grading_scale`     | `min_score`, `max_score`, `letter`, `grade_point`                                                     | Configurable by admins                          |
| `lecture_schedules` | `id`, `programme_id`, `term_id`, `title`, `drive_file_id`                                             | Downloadable schedules (spec item 2)            |

**Learning content and awards:**

| Table          | Key fields                                                                                           | Notes                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `lessons`      | `id`, `course_id`, `title`, `body`, `youtube_id`, `position`                                         | Store the **video ID**, not the raw URL              |
| `materials`    | `id`, `course_id`, `lesson_id?`, `title`, `kind`, `drive_file_id`                                    | Slides, PDFs, handouts                               |
| `awards`       | `id` (uuid), `serial`, `student_id`, `programme_id`, `kind`, `issued_at`, `issued_by`, `revoked_at?` | Certificate, Diploma or Degree awarded               |
| `site_content` | `key`, `title`, `body_md`, `updated_by`                                                              | Vision, history, Statement of Faith, contact details |

- [ ] Write SQL migrations in `supabase/migrations/` (versioned in Git, never edited in the dashboard).
- [ ] Generate TypeScript types with `supabase gen types`.
- [ ] Seed script: one programme of each level, a term, two courses, a lecturer, an admin, two students with grades.
- [ ] Trigram index (`pg_trgm`) on student name and `matric_no` for fast admin search.

#### 1.3. Row-Level Security (the real access control)

- [ ] Enable RLS on every table and the storage bucket. No table is reachable without a policy.
- [ ] **Applicants:** read and write only their own application while it is `draft`; read-only after submission.
- [ ] **Students:** read only their own record, registrations and **published** grades; read lessons and materials for courses they are registered on.
- [ ] **Lecturers:** write content and `draft`/`submitted` grades only for their own offerings; cannot touch `published` grades.
- [ ] **Admins:** everything. Only admins publish grades, change roles, admit applicants and issue awards.
- [ ] Policy tests for each role with `supabase test db` before any UI is built.

#### 1.4. Authentication

- [ ] Supabase Auth with **email + password** and **magic link**.
- [ ] Email confirmation on sign-up.
- [ ] Custom SMTP (Resend). Supabase's built-in mailer is rate-limited and not meant for production.
- [ ] Staff accounts (lecturer, admin) are invited by an admin, never self-registered.

#### 1.5. Storage

- [ ] Private bucket `documents`; path `{owner_id}/{application_id}/{uuid}.{ext}`.
- [ ] Allowed types: PDF, JPG, PNG. Maximum 5 MB.
- [ ] Phone photos compressed in the browser before upload.
- [ ] Storage policies: owners can upload and read their own files; admins can read all. Admins view files through signed URLs that expire after 10 minutes.

#### 1.6. Scaffolding the App

- [x] Initialize a Next.js app (App Router) with TypeScript, Tailwind and ESLint. Install `@supabase/ssr`, `@supabase/supabase-js`, `lucide-react`, `clsx`, `tailwind-merge`, `zod`, `react-hook-form`, `libphonenumber-js`.
- [x] Prettier + ESLint setup.
- [ ] `proxy.ts` (middleware) refreshes the Supabase session and guards `/apply`, `/portal`, `/teach` and `/admin` by role. _(Session refresh done; role guards wait for `profiles.role` in 1.2/1.4.)_

> **Why Next.js, when** `cwl` **and** `protection` **are Vite static sites?** Admissions, records and grades need server-side auth checks, protected routes and file uploads. The shared header and footer are plain React components, so they port across unchanged.

### Phase 2 — The "Visual" Sprint (Shell & Shared Components)

> Goal: Look like part of the CRM family, then build the "Legos".

#### 2.1. Shared CRM Chrome

- [ ] Port `Header` from `cwl`/`protection`: CRM logo, the six nav links to `crm-world.org.ng`, mobile menu. Add a second row (or a right-hand slot) for GHTI's own links: Academics, Admissions, Contact, **Portal sign-in**.
- [ ] Port `Footer`: copyright line linking to `crm-world.org.ng` and the Facebook, Instagram and YouTube links. Add GHTI's address and phone.
- [ ] Brand tokens: CRM navy and gold (as on `protection`), cream ground. Playfair Display (headings) + Inter (body), the same pairing as `cwl`.
- [ ] Semantic colour tokens (`--color-bg`, `--color-text-primary`, `--color-accent`, …) so dark mode can come later without rework.
- [ ] Favicon with GHTI or CRM branding.

#### 2.2. Component Library

- [ ] `ProgrammeCard`: level badge, title, duration, "View programme".
- [ ] `StepForm`: multi-step form with progress indicator and autosave (used by admissions).
- [ ] `FileDrop`: upload with type and size checks, compression, progress and remove.
- [ ] `StatusBadge`: application, student and grade statuses.
- [ ] `DataTable`: sort, filter, search, paginate, CSV export (used across admin and lecturer portals).
- [ ] `GradeTable`: per-term results with GPA and cumulative GPA.
- [ ] `LessonPlayer`: privacy-enhanced YouTube embed (`youtube-nocookie.com`) from `youtube_id`.
- [ ] `MaterialList`: icon by kind, title, "Open" button (goes through `/materials/[id]`, never the raw Drive link).
- [ ] Form fields reused from `cwl/components/FormFields.tsx` where possible.
- [ ] **Quality check:** everything works at 375px. Most applicants and students will be on phones.

### Phase 3 — Public Website (spec items 1, 2, 6)

| #   | Page                 | Route                                                                                     |
| --- | -------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Home                 | `/` (welcome banner, vision, history summary, Statement of Faith teaser)                  |
| 2   | About                | `/about` (vision, full history)                                                           |
| 3   | Statement of Faith   | `/statement-of-faith`                                                                     |
| 4   | Academics            | `/academics` (programmes grouped by Certificate, Diploma, Degree)                         |
| 5   | Programme detail     | `/academics/[slug]` (overview, requirements, courses by year/semester, lecture schedules) |
| 6   | Admissions           | `/admissions` (requirements, how to apply, key dates, "Start application")                |
| 7   | Contact & Directions | `/contact`                                                                                |
| 8   | Verify an award      | `/verify/[id]`                                                                            |
| 9   | Privacy notice       | `/privacy`                                                                                |

- [ ] Vision, history, Statement of Faith and contact details come from `site_content`, editable by admins, so text changes don't need a developer.
- [ ] Programme pages are built from `programmes` and `courses`.
- [ ] Lecture schedules download through `/schedules/[id]` (redirect to Drive).
- [ ] Contact form: Server Action + Zod; sends to the office inbox and a confirmation to the sender.
- [ ] Campus directions: Google Maps embed (no API key needed), plus phone numbers as `tel:` links and a "Get directions" link.
- [ ] Open Graph images and a sitemap.

### Phase 4 — Online Admissions Portal (spec item 3)

| #   | Page               | Route                  |
| --- | ------------------ | ---------------------- |
| 1   | Create account     | `/apply/register`      |
| 2   | Application form   | `/apply` (steps below) |
| 3   | Application status | `/apply/status`        |

- [ ] **Step 1, Programme:** level, programme, intake.
- [ ] **Step 2, Personal details:** full name, date of birth, gender, phone, email, address, state of origin, nationality, CRM branch/church. (Confirm against the client's paper form.)
- [ ] **Step 3, Education:** previous schools and qualifications.
- [ ] **Step 4, Referees / next of kin.**
- [ ] **Step 5, Documents:** transcript (required), ID and passport photo (optional or required, per client).
- [ ] **Step 6, Review & submit:** summary, data-protection consent checkbox, submit.
- [ ] Autosave every step as `draft`; applicants can return later.
- [ ] After submission: read-only view and live status.
- [ ] Emails on submission and on each decision.

### Phase 5 — Student Portal (spec item 4)

| #   | Page             | Route                                                                  |
| --- | ---------------- | ---------------------------------------------------------------------- |
| 1   | Dashboard        | `/portal` (programme, current term, registered courses, announcements) |
| 2   | My record        | `/portal/record` (biodata, matric number, programme, status)           |
| 3   | Results          | `/portal/results` (published grades per term, GPA, CGPA)               |
| 4   | Academic history | `/portal/history` (all terms, unofficial transcript PDF)               |
| 5   | Courses          | `/portal/courses/[offering]` (lessons, videos, materials)              |
| 6   | Schedules        | `/portal/schedules`                                                    |
| 7   | Awards           | `/portal/awards`                                                       |
| 8   | Account          | `/portal/account`                                                      |

- [ ] Students see **published** grades only.
- [ ] Biodata is read-only for students; they request corrections through a "Request a change" form that lands in the admin log.
- [ ] Unofficial transcript generated on demand as a PDF (nothing stored).

### Phase 6 — Lecturer Portal

| #   | Page                 | Route                        |
| --- | -------------------- | ---------------------------- |
| 1   | My courses this term | `/teach`                     |
| 2   | Lessons & materials  | `/teach/[offering]/content`  |
| 3   | Students             | `/teach/[offering]/students` |
| 4   | Grade entry          | `/teach/[offering]/grades`   |

- [ ] **Link fields:** lecturers paste a YouTube or Drive link; the app extracts the ID (`youtu.be/…`, `watch?v=…`, `/live/…`; `drive.google.com/file/d/…`, `open?id=…`, Docs/Slides URLs), rejects anything it can't parse, and shows a preview before saving.
- [ ] Help panel: upload to YouTube as _Unlisted_; upload to the ministry Drive with sharing set to _Anyone with the link → Viewer_.
- [ ] Grade entry: spreadsheet-style table (CA, exam; total and letter calculated from `grading_scale`). Save as draft, then **Submit for approval**.
- [ ] Optional CSV import of scores, with a preview of what will change.

### Phase 7 — Admin Dashboard (spec item 5)

| #   | Page                       | Route                                                                                 |
| --- | -------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Overview                   | `/admin` (applications pending, students by programme, grades awaiting approval)      |
| 2   | Applications               | `/admin/applications` and `/admin/applications/[id]`                                  |
| 3   | Student search             | `/admin/students`                                                                     |
| 4   | Student file               | `/admin/students/[id]` (biodata, documents, registrations, grades, notes log, awards) |
| 5   | Grade approvals            | `/admin/grades`                                                                       |
| 6   | Programmes, courses, terms | `/admin/academics`                                                                    |
| 7   | Offerings & lecturers      | `/admin/offerings`                                                                    |
| 8   | Site content               | `/admin/content` (vision, history, Statement of Faith, contact details, schedules)    |
| 9   | Users & roles              | `/admin/users`                                                                        |
| 10  | Awards                     | `/admin/awards`                                                                       |

- [ ] **Applications:** review biodata and documents side by side; admit (assign matric number and intake) or reject with a note.
- [ ] **Search** by name, matric number, programme, intake, status; results in under a second.
- [ ] **Student file:** everything on one page. Add dated notes (the "log"); update status; upload documents on the student's behalf.
- [ ] **Grades:** approve and publish per offering. Changing a published grade requires a reason and is recorded in `grade_changes`.
- [ ] **Registrations:** register students on a term's offerings in bulk.
- [ ] CSV exports for applications, students, results.

### Phase 8 — Awards, Transcripts & Verification

- [ ] PDFs generated **on demand** with `@react-pdf/renderer`. Nothing stored, so storage cost stays at zero.
- [ ] Award certificate: logo, name, programme, level, date, serial, signatories, QR code linking to `/verify/[id]`.
- [ ] Unofficial transcript: all published grades, GPA per term, CGPA, "Unofficial" watermark.
- [ ] `/verify/[id]` shows valid or revoked, name, award and date. No other personal data.

### Phase 9 — Email Notifications

- [ ] Account confirmation; application submitted; application decision.
- [ ] Welcome to students on admission (matric number, how to sign in).
- [ ] Results published for the term.
- [ ] Staff invitations; lecturer assigned to an offering.
- [ ] Contact form copy to the office and the sender.
- [ ] Templates built with React Email; sent through Resend (free tier: 3,000/month, 100/day).

### Phase 10 — Hardening, Data Protection, Training & Launch

- [ ] **Data protection (Nigeria Data Protection Act 2023):** privacy notice; consent at application; documents of rejected applicants deleted after an agreed period (scheduled job); admin views of documents logged.
- [ ] DNS: point the chosen subdomain at Vercel.
- [ ] Environment variables in Vercel for production and preview.
- [ ] **Supabase keep-alive:** free projects pause after 7 days without activity. A daily Vercel Cron hit to a lightweight query prevents this.
- [ ] **Backups:** the free tier has no downloadable backups. A weekly GitHub Action runs `pg_dump` (database) and copies the storage bucket to ministry-owned storage. With grades and records at stake, this is **not optional**.
- [ ] Rate limiting on sign-up, login, applications and the contact form (Supabase Auth settings + Vercel Firewall rule).
- [ ] Accessibility pass (keyboard, contrast, form errors, captions where available).
- [ ] **Staff training** (the spec's "Admin Dashboard Training"): a one-page handbook each for admins and lecturers, with screenshots, plus a live walkthrough session.
- [ ] Pilot: one intake's applications and one term's results before full launch.

## Known Trade-offs of the Free Setup

| Choice             | Trade-off                                                            | Mitigation                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| YouTube unlisted   | Anyone given the link can watch it and share it.                     | Fine for teaching that is not confidential. A paid host (Bunny Stream, Mux; about $1–5/month at this scale) can come later.                            |
| Google Drive links | Links can be forwarded once a student has them.                      | The portal never shows raw links: `/materials/[id]` checks registration, then redirects. Turn off "Viewers can download" in Drive for view-only files. |
| Manual uploads     | Two steps for lecturers (upload, then paste link).                   | Link parsing, previews and the help panel.                                                                                                             |
| Supabase free tier | Pauses after 7 days idle; 500 MB database; 1 GB storage; no backups. | Keep-alive cron, weekly backups, file size caps. Grades and biodata take very little space.                                                            |
| Vercel Hobby       | Meant for non-commercial use.                                        | Acceptable for a free ministry platform; move to Pro if fees are taken online.                                                                         |

## Cost & Upgrade Triggers

| Service      | Starts on                                       | Upgrade when                                                                                 |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Supabase     | Free                                            | Storage nears 1 GB, the database nears 500 MB, or daily backups are wanted → Pro ($25/month) |
| Vercel       | Hobby (free)                                    | Online fees are taken → Pro ($20/month)                                                      |
| YouTube      | Free                                            | Content must not be shareable → paid video host                                              |
| Google Drive | Free 15 GB (or Google Workspace for Nonprofits) | Space runs out → Workspace storage plan                                                      |
| Resend       | Free (3,000 emails/month)                       | Over 100 emails/day (e.g. results day) → Pro ($20/month)                                     |

## Summary of Tech Stack

| Feature                          | Tool / Library                                | Why?                                                                                         |
| -------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Framework**                    | Next.js (App Router)                          | Server-side auth, protected routes, uploads, PDF generation. Same patterns as Praise Center. |
| **Styling**                      | Tailwind CSS                                  | Matches the other CRM subdomains.                                                            |
| **Icons**                        | Lucide React                                  | Clean, consistent SVG icons.                                                                 |
| **Database + Auth**              | Supabase (Postgres + RLS + Auth)              | Roles enforced in the database. Free tier.                                                   |
| **Applicant documents**          | Supabase Storage (private bucket)             | Same access rules as the database; signed URLs.                                              |
| **Video**                        | YouTube (unlisted), privacy-enhanced embed    | Zero hosting cost.                                                                           |
| **Course materials & schedules** | Google Drive links, served through a redirect | Zero hosting cost.                                                                           |
| **PDFs**                         | `@react-pdf/renderer` + QR code               | Awards and transcripts generated on demand.                                                  |
| **Forms**                        | React Hook Form + Zod + Server Actions        | Type-safe multi-step forms.                                                                  |
| **Email**                        | Resend + React Email                          | Free tier covers launch.                                                                     |
| **Hosting**                      | Vercel                                        | Same as Praise Center.                                                                       |

---

## Post-MVP Ideas

- Online payments for application fees and tuition (Paystack or Flutterwave for Naira).
- Course registration by students themselves, within limits set by admins.
- Attendance for in-person lectures.
- Quizzes and online assignments.
- Announcements from lecturers and the registrar.
- WhatsApp or SMS alerts for admission decisions and results.
- Alumni records and award verification requests from other institutions.
- Dark mode (tokens already in place).
