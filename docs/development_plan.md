# Development Plan

Website, admissions portal and student records system for **GHTI** (Great Harvest Theological Institute), a CRM institution offering a Certificate, an Ordinary Diploma and a Post Graduate Diploma in Theology. It sits alongside the other CRM subdomains (`hymns.`, `cwl.`, `protection.crm-world.org.ng`).

This plan is designed for an **AI-Assisted Workflow** (Cursor IDE + Claude, or any other tools).  
The AI handles the boilerplate and styling, while humans act as the **Architect and Reviewer**.

This is an **app**: applications, logins, four roles, academic records and grades.  
Most of the work is data modelling and access control, so within every stage the tables and their access rules come first and the screens second.

## Scope (from the preliminary spec, section 2 "Website & Portal Features")

| #   | Spec item                                                                                                        | What it means here                                                             | Stage                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 1   | **Homepage & Faith Pillar:** welcome banner, institutional vision, history, GHTI Statement of Faith              | Public pages, content managed by admins                                        | 1 (pages), 3 (admin editing)                           |
| 2   | **Academics & Programme Layout:** Certificate, Diploma and Degree programmes with downloadable lecture schedules | Programme pages built from the database; schedules as Drive links              | 1 (programmes), 2 (courses), 3 (schedules)             |
| 3   | **Online Admissions Portal:** application form with biodata and digital transcript upload                        | Applicant accounts, application form, private document upload, review workflow | 1 (single-page form), 3 (multi-step autosave)          |
| 4   | **Student Track Record System:** secure portal for records, grades and academic histories                        | Student portal (read-only records) + grade workflow with an audit trail        | 2 (records, results), 3 (lecturer entry and approval)  |
| 5   | **Admin Dashboard (and training):** faculty log, update and search student academic files                        | Admin and lecturer portals, record search, notes log, staff training           | 1 (applications), 2 (records), 3 (lecturers, training) |
| 6   | **Contact & Campus Directions:** contact forms, office phone details, addresses                                  | Contact page with form, phone, addresses and a map embed                       | 1 (details, map), 2 (form)                             |

Also carried over from the original brief: course materials downloads, links to videos, and certificates (all Stage 3).

## Guiding Constraints (agreed with the team)

- **Keep running costs at or near zero until the platform matures.** Every service starts on a free tier; upgrades are triggered by real usage.
- **Videos:** YouTube, as unlisted videos. **Course materials and lecture schedules:** Google Drive. **Database and authentication:** Supabase.
- **Content is uploaded manually** to YouTube or Drive, and the links are pasted into the portal. The lecturer and admin portals must make this easy and validate the links.
- **Uniform look with the other subdomains.** Reuse the CRM brand (navy, gold, typefaces) and footer from `cwl` and `protection`. _(15 Nov 2026: GHTI's own header comes first; the CRM navigation is reduced to the copyright link to crm-world.org.ng.)_
- **Simplicity and ease of use first**, the same priority as the hymns web app.

### One exception: applicant documents

The spec's transcript upload can't follow the "Drive for files" rule.

Transcripts are private personal records uploaded by the public, not course content pasted in by staff.  
Uploading them straight into a Drive the ministry owns would need a service account, a shared drive and extra code, and Drive links are easy to over-share.

**Recommendation:** a **private Supabase Storage bucket**, used only for applicant and student documents.

- The free tier includes 1 GB. At a 5 MB cap per file (phone photos are compressed in the browser first, so most files are well under 2 MB), that covers several hundred applicants.
- Access is enforced by the same RLS rules as the database. Admins open files through short-lived signed URLs, so nothing is ever public.

## Open Questions

These change scope. Defaults below are what the plan assumes until answered. **Needed by** is the stage that cannot finish without the answer.

| #   | Question                                                                                                      | Assumed default                                                                                                   | Needed by |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | What is GHTI's full name? Is there a section 1 (or more) of the spec I haven't seen?                          | Plan built from section 2 only. _Name answered 16 Nov 2026: Great Harvest Theological Institute._                 | Stage 1   |
| 2   | Fees: is there an application fee or tuition to be paid online?                                               | **No online payments in v1.** Admins can mark fees as paid manually                                               | Stage 1   |
| 3   | Grading: which scale (e.g. 5-point CGPA), and is a score split into continuous assessment + exam?             | Configurable scale table; CA + exam scores                                                                        | Stage 2   |
| 4   | Which biodata fields? Is there an existing paper application form?                                            | Common fields (see Stage 1, step 1.3); confirm against their form                                                 | Stage 1   |
| 5   | Who enters grades: lecturers, the registrar, or both?                                                         | **Lecturers enter, registrar approves and publishes**                                                             | Stage 3   |
| 6   | Is teaching in person, online, or both?                                                                       | **Hybrid.** In-person classes; the portal also carries recorded lectures and materials                            | Stage 3   |
| 7   | Certificates: are official certificates and transcripts printed by the school, or downloaded from the portal? | School prints official ones; portal provides an **unofficial transcript** and a public **verify** page for awards | Stage 3   |
| 8   | Subdomain? _Answered 16 Nov 2026: yes, a CRM subdomain; the developer manages the DNS._                       | `ghti.crm-world.org.ng`                                                                                           | Stage 1   |
| 9   | Rough number of applicants and students in year one, and the launch date?                                     | Under 1,000 students                                                                                              | Stage 1   |

### Content needed from the client

Tracked in [client_inputs.md](client_inputs.md): a living list of everything we need from GHTI, grouped by the stage that needs it. Add to it whenever development finds a new need.

## Delivery Approach: Bicycle → Tricycle → Car

We build in **vertical slices**, not layers. Each stage is a complete, working product on a live URL that real people can use, and each one adds capability to the last. The client sees progress from the first week instead of waiting for every layer to be finished.

| Stage         | Name         | What people can do at the end                                                                                                          | Milestone                                          |
| ------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 0             | Setup        | Nothing yet: repo, tooling, local database                                                                                             |                                                    |
| 1 🚲 Bicycle  | Apply online | Visitors browse the site and programmes; applicants sign up, apply and upload a transcript; admins review, admit or reject             | Look-and-feel approval (week 1); first real intake |
| 2 🛺 Tricycle | Records      | Admitted applicants become students with matric numbers; admins enter and publish grades; students see results and GPA; records search | First term's results published online              |
| 3 🚗 Car      | Full system  | Lecturers post videos and materials and enter grades for approval; certificates with QR verification; transcripts; staff trained       | Full launch                                        |

Rules that hold in every stage:

- **A table ships in the stage that first needs it, with its RLS policies and pgTAP tests**, before any screen uses it. No table is ever added "for later".
- **A stage that takes real personal data ships the protections for it** (privacy notice, consent, backups, rate limits). Hardening is not saved for the end.
- **Shared components are built when a stage needs them**, not up front.
- **Every screen works at 375px.** Most applicants and students will be on phones.
- **Every stage ends with a demo and the client's sign-off** before the next begins.

The [Architecture Reference](#architecture-reference) below holds the full data model, access rules and route map; each item is tagged with its stage.

## Stage 0 — Setup

> Goal: Lock the rules and the toolchain before any feature work.

- [ ] Get answers to the Open Questions, in the order of the **Needed by** column (Stage 1 first: 1, 2, 4, 8, 9).
- [ ] Create the GitHub repo and give the team access. _(Repo created: `amjedidiah/ghti`; team access pending.)_
- [x] Create Cursor rules and a `CLAUDE.md` file (stack, folder conventions, RLS-first rule, storage rule).
- [x] Create the Supabase project (free tier). Project `ghti`, ref `htbaujxaorlblkixiixx`, `eu-west-2`. Linked in step 1.1; day-to-day development stays on the local Docker stack.
- [ ] Set up a ministry-owned Google Drive folder for course materials and schedules, and a YouTube channel (or playlist convention) for unlisted lectures. Both belong to the institution, not a person. _(Deferred until Stage 3.)_
- [x] Initialize a Next.js app (App Router) with TypeScript, Tailwind and ESLint. Install `@supabase/ssr`, `@supabase/supabase-js`, `lucide-react`, `clsx`, `tailwind-merge`, `zod`, `react-hook-form`, `libphonenumber-js`.
- [x] Prettier + ESLint setup; `bun run check` (lint, format, typecheck, test, build).
- [x] `supabase init` for the local stack; Supabase clients in `lib/supabase/`; `bun run db:types` generates TypeScript types.
- [x] `proxy.ts` refreshes the Supabase session on every request. (Role guards follow in step 1.2.)

> **Why Next.js, when** `cwl` **and** `protection` **are Vite static sites?** Admissions, records and grades need server-side auth checks, protected routes and file uploads. The shared header and footer are plain React components, so they port across unchanged.

## Stage 1 — 🚲 Bicycle: Apply Online

> Goal: A live public site where people can apply, and admins can decide. Usable for a real intake.

#### 1.1. First ride: the look, on a live URL (target: end of week 1)

- [x] Port `Header` from `cwl`/`protection`: CRM logo, the six nav links to `crm-world.org.ng`, mobile menu. Add a second row (or a right-hand slot) for GHTI's own links: Academics, Admissions, Contact, **Portal sign-in**. _(Revised 15 Nov 2026: GHTI header first, with About added; CRM links reduced to the footer copyright link.)_
- [x] Port `Footer`: copyright line linking to `crm-world.org.ng` and the Facebook, Instagram and YouTube links. Add GHTI's address and phone. _(Slots in `lib/site.ts`; shown once the client supplies them.)_
- [x] Brand tokens: CRM navy and gold (as on `protection`), cream ground. Playfair Display (headings) + Inter (body), the same pairing as `cwl`.
- [x] Semantic colour tokens (`--color-bg`, `--color-text-primary`, `--color-accent`, …) so dark mode can come later without rework.
- [x] Favicon with GHTI or CRM branding. _(CRM favicon for now.)_
- [x] `programmes` table + RLS (public reads `published` programmes; admins write) + pgTAP tests; seed one programme of each level.
- [x] Pages: Home, `/academics` (programmes grouped by level, `ProgrammeCard`), `/academics/[slug]` (overview and requirements). Header links to Admissions, Contact and Sign in go to "Coming soon" pages until their steps land.
- [x] Link the cloud project, push migrations, deploy a Vercel preview with environment variables for preview. _(Vercel project `ghti`, London region; cloud seeded with the fake programmes, to be replaced in step 1.5.)_
- [ ] **Milestone: look-and-feel approval** from the client on the preview link.

#### 1.2. Accounts and roles

- [x] `profiles` table, created by trigger on sign-up with role `applicant`; RLS + pgTAP tests (own profile only; only admins change roles). _(Also admin write access to `programmes`.)_
- [x] Supabase Auth with **email + password** and **magic link**; email confirmation on sign-up. _(Cloud settings applied with `bun run auth:push`; branded templates wait for Resend.)_
- [x] Custom SMTP (Resend). Supabase's built-in mailer is rate-limited and not meant for production. _(Done 16 Nov 2026: domain `ghti.crm-world.org.ng` verified in the developer's existing Resend account (region eu-west-1; DKIM TXT and `send`/`rsend` CNAMEs at QServers; DMARC `p=none` on `crm-world.org.ng`); Supabase sends through `smtp.resend.com` from `GHTI <no-reply@ghti.crm-world.org.ng>` with the branded templates (`bun run auth:push --site-url https://ghti.crm-world.org.ng --smtp --apply`). The API key lives in the developer's keychain (`ghti-resend-api-key`), Supabase's auth config and Vercel (`RESEND_API_KEY`, Production and Preview); not in `.env.local`, where local email goes to Mailpit. Resend free tier: 3,000 emails a month, 100 a day. The Vercel Marketplace install was abandoned: its free plan is not offered to an email that already has a Resend account.)_
- [x] Sign-up, sign-in, sign-out and password reset pages. Sign-up lives at `/apply/register` (applicants only).
- [x] `proxy.ts` guards `/apply` and `/admin` by role (`/portal` and `/teach` follow in Stages 2 and 3).
- [x] First admins created by a one-off script (no staff invitation screen yet; that arrives in step 3.1). _(`bun run admin:create`; real admins once the client sends names and emails.)_

#### 1.3. Apply

- [x] `terms` (intakes), `applications`, `documents` tables + RLS + pgTAP tests. Applicants read and write only their own application while it is `draft`; read-only after submission. _(Submission goes through `submit_application()`, which checks completeness in the database.)_
- [x] Private bucket `documents`; path `{owner_id}/{application_id}/{uuid}.{ext}`. PDF, JPG, PNG; max 5 MB. Storage policies: owners upload and read their own files; admins read all.
- [x] `FileDrop`: type and size checks, browser compression of phone photos, progress, remove. _(`DocumentUpload`: direct browser-to-Storage upload with progress; photos over 1 MB resized to 2000px JPEG.)_
- [x] Form fields reused from `cwl/components/FormFields.tsx` where possible.
- [x] **Single-page application form** in sections: programme and intake; personal details (full name, date of birth, gender, phone, email, address, state of origin, nationality, CRM branch/church; confirm against the client's paper form); education; referees / next of kin; documents (transcript required; ID and passport photo per client); data-protection consent; submit. "Save draft" button so applicants can return later. _(Field list and required documents are placeholders until client inputs #4 and #5.)_
- [x] `/apply/status`: read-only view of the submitted application and its live status (`StatusBadge`).
- [x] Emails (React Email + Resend): application submitted; decision made. _(Done 20 Nov 2026: templates in `emails/`, sent by `lib/email/send.tsx` from Server Actions inside `after()`, so an email never slows or breaks the action. Recipients are the account's sign-in email, looked up by the admin-only `account_emails()`. Without `RESEND_API_KEY`, local emails go to Mailpit (`MAILPIT_URL`). Replies have nowhere to go until GHTI names an admissions address (client input #12, `EMAIL_REPLY_TO`).)_
- [x] `/admissions` page: requirements, how to apply, key dates, "Start application". _(Steps and open intakes are live; requirements and key dates wait for client input #6.)_

#### 1.4. Review

- [x] `/admin/applications`: list with status filter and search by name. _(Name search runs in the browser so names never reach URLs or logs; status filters are in the URL.)_
- [x] `/admin/applications/[id]`: biodata and documents side by side; documents open through signed URLs that expire after 10 minutes; each admin view of a document is logged. _(`document_views` table; documents open only through `/admin/documents/[id]`.)_
- [x] Admit or reject with a note (status only; the admitted applicant becomes a student in step 2.2). _(`start_review()` and `decide_application()`; a rejection needs a note, which the applicant sees.)_

#### 1.5. Ready for real applicants

- [x] Public pages: `/about`, `/statement-of-faith` and `/contact` (phones as `tel:` links, addresses, Google Maps embed with no API key, "Get directions" link). Text lives in the code for now; admins can edit it from step 3.5. _(Built with visible "Waiting for GHTI" placeholders; text in `lib/content.ts` and `lib/site.ts`, client inputs #9 and #10.)_
- [x] `/privacy`: privacy notice (Nigeria Data Protection Act 2023). _(Draft written from what the system does; GHTI to review and supply controller details, #13, and retention period, #19.)_
- [ ] Replace the placeholders in the cloud database: the fake seeded programmes (client input #7) and the placeholder intake "Second semester, 2026/2027" (client input #6). _(Programmes done 16 Nov 2026: the three real titles, updated in place; duration "To be confirmed" and no description or requirements until GHTI supplies them; the fake counselling draft archived. Intake still a placeholder.)_
- [x] Rate limiting on sign-up, login and applications (Supabase Auth settings + Vercel Firewall rule). _(Vercel Firewall rule "Rate limit auth forms": POSTs to `/sign-in`, `/apply/register`, `/forgot-password`, 30 per minute per IP, then 429; verified on production. Hobby includes 3 custom rules (1 used) and 1M rate-limited requests a month, so $0. Limits are generous and Supabase's per-IP auth limits stay at their defaults, because Nigerian mobile networks put many users behind one shared IP (CGNAT).)_
- [x] **Supabase keep-alive:** free projects pause after 7 days without activity. A daily Vercel Cron hit to a lightweight query prevents this. _(`/api/cron/keep-alive`, daily at 05:00 UTC; `CRON_SECRET` set in Vercel production.)_
- [x] **Backups:** the free tier has no downloadable backups. A weekly GitHub Action runs `pg_dump` (database) and copies the storage bucket to ministry-owned storage. With applicant records at stake, this is **not optional**. _(Stopgap until GHTI names ministry storage (client input #26): private repo `amjedidiah/ghti-backups` runs weekly, dumps roles, schema and data, downloads the `documents` bucket with `scripts/backup-storage.ts`, encrypts with age and keeps 5 weekly copies (35 days, within the free 500 MB). The age private key is in the developer's keychain (`ghti-backup-age-key`) and must also be handed to GHTI. File backups need the `SUPABASE_SECRET_KEY` secret set in that repo.)_
- [x] DNS: point the chosen subdomain at Vercel; production environment variables. When the domain changes from `ghti-nine.vercel.app`: update `NEXT_PUBLIC_SITE_URL` in Vercel and rerun `bun run auth:push --site-url https://<new domain> --apply`. _(Done 16 Nov 2026: `ghti.crm-world.org.ng` verified on Vercel (TXT `_vercel`) and pointed with an A record to `216.198.79.1` at QServers; HTTPS live; `NEXT_PUBLIC_SITE_URL` updated and production redeployed; Supabase site URL and redirect allow list updated.)_
- [x] **Quality check:** walk the whole applicant and admin journey at 375px. _(Done 20 Nov 2026 in a 375px browser: register, confirm, apply with errors then complete, submit, review, admit, enrol, grades, results email, student portal, every public page. Fixed: page wrappers with `mx-auto` but no `w-full` shrank to their content inside the flex-column `main`, so the status chips made `/admin/applications` 526px wide. Known, minor: an application-form error stays on screen after the answer is fixed until the field loses focus.)_
- [ ] **Milestone: applications open** for a real (pilot) intake.

## Stage 2 — 🛺 Tricycle: Records

> Goal: Admitted applicants become students, and students see their published results online.

#### 2.1. Academic structure

- [x] `courses`, `course_offerings` (lecturer optional until Stage 3), `registrations`, `grading_scale` tables + RLS + pgTAP tests. _(Migration `20261116090000_academic_records.sql`, tests in `supabase/tests/academic_records.test.sql`. The public reads the courses of published programmes; students read only their own registrations, offerings and courses; admins write. Lecturer policies arrive in Stage 3. Local seed has a fake 5-point scale and fake courses until client inputs #16 and #17.)_
- [x] `/admin/academics`: programmes, courses, terms. `/admin/offerings`: offerings per term. _(Done 16 Nov 2026. `/admin/academics`: create and edit programmes (status, web address, description, entry requirements), add, edit and delete courses (the database keeps courses that have been offered), create and edit terms (open for applications or not); saving refreshes the public programme pages and the application form's intakes at once. `/admin/offerings`: per term, tick the courses that run, by programme, year and semester; a course with registered students stays offered (`lib/offerings.ts`). Lecturers are assigned to offerings in Stage 3.)_
- [x] **Registrations:** register students on a term's offerings in bulk. _(Done 16 Nov 2026: `/admin/offerings/[termId]/register`: choose a programme, tick its active students and this term's courses, and every ticked student is registered on every ticked course; existing registrations are skipped (`lib/registrations.ts`, tested). Each offering has a class list (`/admin/offerings/[termId]/[offeringId]`) with a two-step remove; once grades exist, a registration with grades cannot be removed.)_
- [x] Programme pages list courses by year and semester. _(Done 20 Nov 2026: "Courses" section with each semester's credit units (`groupCoursesByTerm` in `lib/programmes.ts`, tested); hidden while a programme has no courses, as in the cloud until client input #16.)_

#### 2.2. From applicant to student

- [x] `students` table + RLS + pgTAP tests (students read only their own record). _(Built with step 2.1, since registrations need it. Students cannot edit their record; `application_id` links back to the application they were admitted from.)_
- [x] Admit assigns a matric number and entry term, and changes the role to `student` on the same account. _(Done 16 Nov 2026: `enrol_student()` (admin only, one transaction, pgTAP-tested) runs from a "Student record" panel on admitted applications. The entry term defaults to the applicant's intake. Matric numbers are free text (upper case, letters, digits, "/" and "-") until GHTI confirms its format, client input #18.)_
- [x] Welcome email on admission (matric number, how to sign in). _(Sent on enrolment, 20 Nov 2026.)_
- [x] `proxy.ts` guards `/portal`. _(Students only; `/portal` shows the student's own record. Courses, results and history arrive in step 2.4.)_

#### 2.3. Grades

- [x] `grades` and `grade_changes` tables + RLS + pgTAP tests. Students see `published` grades only. Changing a published grade requires a reason and is written to `grade_changes` by a trigger. _(Done 16 Nov 2026, `20261116140000_grades.sql`: total, letter and grade point are worked out by trigger and stored (a later scale change never rewrites old results); a published grade changes only through `change_published_grade()` with a reason, is logged with old and new values, and can never be deleted; a registration with a grade cannot be removed. 34 pgTAP tests.)_
- [x] `lib/grades.ts`: score → letter → grade point, GPA and CGPA, with Bun tests. _(Plus `GRADE_SPLIT`, CA 40 / exam 60, the plan's default until client input #17; `lib/grade-sheet.ts` plans each sheet save.)_
- [x] `/admin/grades`: admins enter CA and exam scores per offering and publish. (Lecturer entry with admin approval arrives in step 3.3.) _(Done 16 Nov 2026: per term, each course's progress (graded, published); the grade sheet previews total and letter as you type, saves drafts, publishes complete grades, and asks for a reason before changing a published one. Unpublishing is possible in the database (`change_published_grade` with status `draft`) but has no button yet.)_
- [x] "Results published" email to students. _(Done 20 Nov 2026: an "Email students" button per term on `/admin/grades`, not an automatic send, because Resend's free tier allows 100 emails a day, shared with sign-in emails. One email per student per term (`result_notices`), up to 80 a click (`lib/result-notices.ts`, tested); a run cut short by the daily limit carries on next time. The email carries no grades.)_

#### 2.4. Student portal

- [x] `/portal` dashboard, `/portal/record`, `/portal/results` (`GradeTable`: per-term results, GPA, CGPA), `/portal/history`, `/portal/account`. _(Done 16 Nov 2026. Overview: record, CGPA and latest GPA, the latest term's courses. Results: every term, oldest last, with term GPA and CGPA from published grades only (`lib/results.ts`, tested); unpublished courses show "Awaiting result". History: applied, admitted, enrolled, then each term. Account: name, email, change password, sign out. The portal and admin share an `AreaBar` with the current section highlighted.)_
- [x] Biodata is read-only for students. _(`/portal/record` shows the application's details through the same `ApplicationDetails` panels admins see; there is no edit path, and corrections go through the registrar until step 3.5's "Request a change".)_

#### 2.5. Records admin

- [x] `record_notes` table + RLS + pgTAP tests. _(Done 20 Nov 2026, `20261120012918_records_admin.sql`: admins only, append-only (no edit or delete), author is always the signed-in admin; `set_student_status()` changes a status and logs it with the reason in one transaction. 26 pgTAP tests.)_
- [x] Trigram index (`pg_trgm`) on student name and `matric_no`. _(On `profiles.full_name` and `students.matric_no`; `search_students()` (admin only) does contains-matching on either, with filters, sort and paging.)_
- [x] `/admin/students`: search by name, matric number, programme, intake, status; results in under a second (`DataTable`: sort, filter, search, paginate). _(Done 20 Nov 2026. The search runs through a Server Action, so names and matric numbers never reach URLs; the tab remembers the last search (sessionStorage) for "back" from a file. `components/shared/DataTable.tsx` is a table on wider screens and cards on phones.)_
- [x] `/admin/students/[id]`: student file on one page: biodata, documents, registrations, grades; dated notes (the "log"); update status. _(Done 20 Nov 2026. Grades show every status for admins, while GPA and CGPA count published grades only, as the student sees them (`lib/student-file.ts`, tested).)_

#### 2.6. Finishing the tricycle

- [x] Contact form on `/contact`: Server Action + Zod; sends to the office inbox and a confirmation to the sender; rate limited. _(Done 20 Nov 2026. Goes to `EMAIL_TO`, the developer's inbox until GHTI names the office address (client input #10); replies go straight to the sender. The sender's confirmation repeats none of their text, so the form cannot be used to send our emails with someone else's words. A honeypot field turns away simple bots. Rate limits: Vercel Hobby allows only one rate-limit rule, so `/contact` joins the auth forms' rule (30 POSTs a minute per IP), and `claim_contact_send()` caps the form at 30 messages a UTC day in total (`CONTACT_DAILY_LIMIT`), so spam can never use up the Resend quota that sign-up emails need.)_
- [x] Scheduled job: delete documents of rejected applicants after the agreed period. _(Built 20 Nov 2026, switched off: `/api/cron/cleanup-documents` runs daily at 05:30 UTC and deletes the files and rows of documents on applications rejected more than `REJECTED_DOCUMENTS_KEEP_DAYS` ago (`lib/retention.ts`), up to 100 a run; the application stays. The period is `null` until GHTI decides (client input #19), and while it is null the job deletes nothing. Tested end to end on the local stack. Uses `SUPABASE_SECRET_KEY`, now in Vercel (Production only).)_
- [x] Seed script covers the whole stage: one programme of each level, a term, two courses, an admin, two students with grades. _(Plus notes on both students' files, 20 Nov 2026.)_
- [ ] **Milestone: one term's results published** to students online (pilot).

## Stage 3 — 🚗 Car: Full System

> Goal: Lecturers work in the portal, course content and certificates are online, and staff are trained.

#### 3.1. Staff

- [x] Staff accounts (lecturer, admin) invited by an admin, never self-registered; invitation email. _(Done 20 Nov 2026: "Invite staff" on `/admin/users` sends Supabase's branded invitation (the link lands on "choose a password"); an applicant's or student's email is refused, not converted; pending invitations can be resent. Uses `SUPABASE_SECRET_KEY` (Production only), after `requireRole("admin")`. `bun run admin:create` still works for the very first admin.)_
- [x] `/admin/users`: users and roles. _(Done 20 Nov 2026 as the staff list: name, email, role, invited or last signed in; make lecturer/admin or remove staff access through `set_staff_role()`, which refuses your own role and the last admin. `staff_accounts()`, `account_by_email()` and `set_staff_role()` are admin-only, 16 pgTAP tests. Applicants and students are managed from their own pages, not here.)_
- [x] Assign lecturers to offerings; "lecturer assigned" email. _(Done 20 Nov 2026: a "Lecturer" panel on each class list (`/admin/offerings/[termId]/[offeringId]`); the term's offerings show who teaches what; the newly assigned lecturer is emailed. The database accepts only lecturer accounts, and someone who stops being a lecturer is unassigned.)_
- [x] `proxy.ts` guards `/teach`. Lecturers write content and `draft`/`submitted` grades only for their own offerings; RLS + pgTAP tests for the lecturer role on every table it touches. _(20 Nov 2026: `/teach` lists the lecturer's courses by term, each with an overview and class list. Lecturer RLS on offerings, courses, registrations and grades (draft and submitted only) through `SECURITY DEFINER` helpers in a non-API `private` schema, which avoids policy recursion; lecturers see students' names and matric numbers only, through `class_list()`. 23 pgTAP tests. Lessons and materials (3.2) and grade returns (3.3) have lecturer policies and tests too, so every table lecturers touch is covered.)_

#### 3.2. Course content

- [x] `lessons`, `materials`, `lecture_schedules` tables + RLS + pgTAP tests (students read content only for offerings they are registered on). _(Done 20 Nov 2026, `20261120053409_course_content.sql`: lessons and materials belong to the course and carry over terms (students of any offering of the course read them; its lecturers and admins write them); only YouTube and Drive IDs are stored, checked by format; a material's lesson must be in the same course, and deleting a lesson keeps its materials. Schedules are public for published programmes and written by admins. 21 pgTAP tests.)_
- [x] `lib/links.ts` with Bun tests: extract the ID from YouTube (`youtu.be/…`, `watch?v=…`, `/live/…`) and Drive (`drive.google.com/file/d/…`, `open?id=…`, Docs/Slides URLs) links; reject anything it can't parse. _(Done 20 Nov 2026, 41 tests: also `/embed/`, `/shorts/`, links without "https://", `/u/0/` Drive links and Sheets; refuses folders, look-alike domains and other schemes. `youTubeEmbedUrl()` and `driveViewUrl()` rebuild links from stored IDs.)_
- [x] `/teach` (my courses this term) and `/teach/[offering]/content`: paste a link, preview, save. Help panel: upload to YouTube as _Unlisted_; upload to the ministry Drive with sharing set to _Anyone with the link → Viewer_. _(Done 20 Nov 2026: `components/content/CourseContentEditor` (add, edit, reorder, two-step delete; the pasted YouTube link previews before saving), also at `/admin/offerings/[termId]/[offeringId]/content` for courses without a lecturer.)_
- [x] `/materials/[id]` and `/schedules/[id]`: check access, then redirect to Drive. Never render raw Drive links. _(Both read through RLS; materials need sign-in, schedules are public for published programmes. Pages carry only these redirect links, never Drive URLs or IDs for students.)_
- [x] `LessonPlayer` (privacy-enhanced `youtube-nocookie.com` embed) and `MaterialList` (icon by kind, title, "Open"). _(Captions on by default where the video has them.)_
- [x] `/portal/courses/[offering]` and `/portal/schedules`; lecture schedules on programme pages. _(Done 20 Nov 2026: portal Courses and Schedules tabs; admins add and delete schedules on the programme's admin page.)_

#### 3.3. Grade workflow

- [x] `/teach/[offering]/students` and `/teach/[offering]/grades`: spreadsheet-style entry (CA, exam; total and letter from `grading_scale`). Save as draft, then **Submit for approval**. _(Done 20 Nov 2026: one `GradeSheetForm` for admins and lecturers (`components/grades/`); lecturers see submitted and published grades read-only, and only complete grades are submitted (a database check). Submitting emails the office (`EMAIL_TO`) a count, no names or scores.)_
- [x] Optional CSV import of scores, with a preview of what will change. _(Both sheets: columns `matric`, `ca`, `exam` in any order (headers are matched loosely, other columns ignored; `;` files read too); the preview lists changes, matric numbers not on the class, bad scores, repeats and locked grades. "Fill in" only fills the sheet; nothing saves until Save. "Download this class as a CSV" gives matric numbers and current scores, no names (`lib/grade-import.ts`, tested).)_
- [x] `/admin/grades` becomes approve and publish per offering. Lecturers cannot edit `published` grades. _(Done 20 Nov 2026, `20261120100550_grade_workflow.sql`: the term list shows "N to approve"; the sheet's "Save and publish" publishes submitted grades, or **Return to the lecturer** sends them back to draft with a note (`return_grades()`, kept in `grade_returns`, emailed to the lecturer and shown on both sheets until they submit again). The admin overview tile is now "Grades awaiting approval". 16 pgTAP tests.)_

#### 3.4. Awards, transcripts and verification

- [ ] `awards` table + RLS + pgTAP tests. Only admins issue awards.
- [x] PDFs generated **on demand** with `@react-pdf/renderer`. Nothing stored, so storage cost stays at zero. _(20 Nov 2026: `components/pdf/`, fonts from `assets/fonts`, crest as `assets/images/ghti-crest.png` because react-pdf images cannot be SVG. Text drawn through react-pdf's `render` callback comes out invisible with the embedded fonts, so there are no "Page x of y" numbers.)_
- [ ] Award certificate: logo, name, programme, level, date, serial, signatories, QR code linking to `/verify/[id]`.
- [x] Unofficial transcript: all published grades, GPA per term, CGPA, "Unofficial" watermark; downloadable from `/portal/history`. _(Done 20 Nov 2026: `/portal/transcript` (students only, their own published grades through RLS); A4 with the crest, student details, a table per term with its GPA, CGPA and credit units, a diagonal watermark and a footer saying it is not an official record. File name `ghti-transcript-<date>.pdf`, no name in it (`lib/transcript.ts`, tested).)_
- [ ] `/verify/[id]` shows valid or revoked, name, award and date. No other personal data.
- [ ] `/admin/awards` and `/portal/awards`.

#### 3.5. Admin and applicant polish

- [x] `site_content` table + RLS + pgTAP tests; `/admin/content` so the mission, history, Statement of Faith and contact details can change without a developer (moves the Stage 1 text into the database). Built in our own admin, not with a headless CMS: see "Content management: when to revisit Payload CMS" under Post-MVP Ideas. _(Done 20 Nov 2026, `20261120135916_site_content.sql`: one row per piece of text (welcome, mission, history, Statement of Faith articles, office address, phone, email, map, office hours, application fee, data controller, privacy email); anyone reads, admins write, a trigger stamps who and when; 13 pgTAP tests. `/admin/content` has a form per piece, grouped, with an articles editor; saving refreshes the cached public pages at once, and an empty answer brings back the "Waiting for GHTI" placeholder. `lib/content.ts` and the contact slots in `lib/site.ts` are gone.)_
- [x] `/admin` overview: applications pending, students by programme, grades awaiting approval. _(Done 20 Nov 2026: "Students and results" tiles for active students by programme, grades awaiting approval (submitted by lecturers since step 3.3, with drafts counted beside them) and results emails still to send, per term (`lib/admin-overview.ts`, tested).)_
- [x] CSV exports for applications, students, results. _(Done 20 Nov 2026: `/admin/exports`. Built on request and never stored; every download is written to `export_log` first (who, which export, filters, rows, when; append-only, admins only, 10 pgTAP tests) and listed on the page, for accountability under the NDPA. File names carry the kind and date, never a name; URLs carry statuses and ids only. Cells that could run as spreadsheet formulas are neutralised, and Nigerian phone numbers export as 0803 123 4567 (`lib/csv.ts`, `lib/exports.ts`, tested). Results export published grades unless the admin includes drafts.)_
- [ ] Admins upload documents on a student's behalf.
- [ ] Students request biodata corrections through a "Request a change" form that lands in the admin log.
- [x] `StepForm`: the application becomes a multi-step form with progress indicator and **autosave** on every step. _(Done 20 Nov 2026, with GHTI's paper "Application for Admission" (received 20 Nov): the form asks the paper form's questions in 9 steps (programme; about you; addresses and next of kin; work; faith and church; education; two referees; documents; review with the pledge), `20261120105238_application_paper_form.sql` (new answers, two referees, education years, pledge; state of origin dropped; `submit_application()` requires the same answers). `components/forms/Stepper.tsx`; Next checks the step, every move saves the draft, `?step=` keeps the place (browser Back works), and a refused submit opens the first step with a problem. Certificates up to 5 files; photo required; pastor's endorsement and proof of payment optional.)_

#### 3.6. Launch

- [x] Open Graph images and a sitemap. _(Share image with the crest since 20 Nov 2026; `/sitemap.xml` lists the public pages and published programmes, `/robots.txt` keeps signed-in areas, account pages and API routes out, and asks crawlers to skip preview deployments entirely (`lib/seo.ts`, tested).)_
- [ ] Accessibility pass (keyboard, contrast, form errors, captions where available).
- [ ] **Staff training** (the spec's "Admin Dashboard Training"): a one-page handbook each for admins and lecturers, with screenshots, plus a live walkthrough session.
- [ ] **Milestone: full launch.**

## Architecture Reference

### Roles

| Role                          | Can do                                                                                        | Stage |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ----- |
| `applicant`                   | Fill and submit their own application; upload documents; see its status                       | 1     |
| `admin` (registrar / faculty) | Everything: admissions, records, grade approval, programmes, site content, users              | 1     |
| `student`                     | See their own record, grades, registrations, course content and awards                        | 2     |
| `lecturer`                    | Manage content and enter grades for the course offerings assigned to them; see those students | 3     |

An applicant who is admitted becomes a `student` on the same account.

### Data Model (Supabase Postgres)

Migrations live in `supabase/migrations/` (versioned in Git, never edited in the dashboard). Regenerate types with `bun run db:types` after each one.

**People and admissions:**

| Table          | Key fields                                                                                                                       | Notes                                                                                         | Stage |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----- |
| `profiles`     | `id` (= auth user), `full_name`, `phone`, `role`                                                                                 | Created by trigger on sign-up, default `applicant`                                            | 1     |
| `applications` | `id`, `applicant_id`, `programme_id`, `intake_term_id`, biodata fields, `status`, `reviewed_by`, `decision_note`, `submitted_at` | `status`: `draft` \| `submitted` \| `under_review` \| `admitted` \| `rejected` \| `withdrawn` | 1     |
| `documents`    | `id`, `owner_id`, `application_id?`, `kind`, `storage_path`, `size_bytes`, `mime`                                                | `kind`: `transcript` \| `id_card` \| `photo` \| `other`                                       | 1     |
| `students`     | `id` (= profile), `matric_no`, `programme_id`, `entry_term_id`, `application_id?`, `status`                                      | `status`: `active` \| `deferred` \| `withdrawn` \| `graduated`                                | 2     |
| `record_notes` | `id`, `student_id`, `author_id`, `body`, `created_at`                                                                            | The "log" in the spec: dated notes on a student's file                                        | 2     |

**Academics:**

| Table               | Key fields                                                                                            | Notes                                                                                                                                                     | Stage |
| ------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `programmes`        | `id`, `slug`, `title`, `level`, `duration`, `description`, `requirements`, `status`                   | `level`: `certificate` \| `diploma` \| `postgraduate_diploma` (was `degree` until 16 Nov 2026)                                                            | 1     |
| `terms`             | `id`, `session` (e.g. `2026/2027`), `name`, `starts_on`, `ends_on`                                    | Semesters or terms; also used as intakes                                                                                                                  | 1     |
| `courses`           | `id`, `programme_id`, `code`, `title`, `credit_units`, `year`, `semester`                             |                                                                                                                                                           | 2     |
| `course_offerings`  | `id`, `course_id`, `term_id`, `lecturer_id`                                                           | A course taught in a given term                                                                                                                           | 2     |
| `registrations`     | `id`, `student_id`, `offering_id`                                                                     | Student takes an offering                                                                                                                                 | 2     |
| `grades`            | `registration_id`, `ca_score`, `exam_score`, `total`, `letter`, `grade_point`, `status`, `entered_by` | `status`: `draft` \| `submitted` \| `published`                                                                                                           | 2     |
| `grade_changes`     | `id`, `grade_id`, `old_values`, `new_values`, `changed_by`, `reason`, `changed_at`                    | Written by trigger; never edited                                                                                                                          | 2     |
| `grading_scale`     | `min_score`, `letter`, `grade_point`                                                                  | A total gets the band with the highest `min_score` at or below it (lower bounds only, so decimal totals never fall between bands); configurable by admins | 2     |
| `lecture_schedules` | `id`, `programme_id`, `term_id`, `title`, `drive_file_id`                                             | Downloadable schedules (spec item 2)                                                                                                                      | 3     |

**Learning content and awards:**

| Table          | Key fields                                                                                           | Notes                                                 | Stage |
| -------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----- |
| `lessons`      | `id`, `course_id`, `title`, `body`, `youtube_id`, `position`                                         | Store the **video ID**, not the raw URL               | 3     |
| `materials`    | `id`, `course_id`, `lesson_id?`, `title`, `kind`, `drive_file_id`                                    | Slides, PDFs, handouts                                | 3     |
| `awards`       | `id` (uuid), `serial`, `student_id`, `programme_id`, `kind`, `issued_at`, `issued_by`, `revoked_at?` | Certificate, Diploma or Post Graduate Diploma awarded | 3     |
| `site_content` | `key`, `title`, `body_md`, `updated_by`                                                              | Mission, history, Statement of Faith, contact details | 3     |

### Row-Level Security (the real access control)

RLS is enabled on every table and the storage bucket; no table is reachable without a policy. Each stage adds the policies and pgTAP tests (`supabase test db`) for the tables it introduces, before any screen uses them.

- **Applicants:** read and write only their own application while it is `draft`; read-only after submission.
- **Students:** read only their own record, registrations and **published** grades; read lessons and materials for courses they are registered on.
- **Lecturers:** write content and `draft`/`submitted` grades only for their own offerings; cannot touch `published` grades.
- **Admins:** everything. Only admins publish grades, change roles, admit applicants and issue awards.

### Storage

- Private bucket `documents`; path `{owner_id}/{application_id}/{uuid}.{ext}`.
- Allowed types: PDF, JPG, PNG. Maximum 5 MB. Phone photos compressed in the browser before upload.
- Owners can upload and read their own files; admins can read all. Admins view files through signed URLs that expire after 10 minutes.

### Route Map

**Public website (spec items 1, 2, 6):**

| #   | Page                 | Route                                                                                     | Stage                        |
| --- | -------------------- | ----------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Home                 | `/` (welcome banner, mission, history summary, Statement of Faith teaser)                 | 1                            |
| 2   | About                | `/about` (mission, full history)                                                          | 1                            |
| 3   | Statement of Faith   | `/statement-of-faith`                                                                     | 1                            |
| 4   | Academics            | `/academics` (programmes grouped by Certificate, Diploma, Post Graduate Diploma)          | 1                            |
| 5   | Programme detail     | `/academics/[slug]` (overview, requirements, courses by year/semester, lecture schedules) | 1 (courses: 2, schedules: 3) |
| 6   | Admissions           | `/admissions` (requirements, how to apply, key dates, "Start application")                | 1                            |
| 7   | Contact & Directions | `/contact`                                                                                | 1 (form: 2)                  |
| 8   | Verify an award      | `/verify/[id]`                                                                            | 3                            |
| 9   | Privacy notice       | `/privacy`                                                                                | 1                            |

**Admissions (spec item 3):**

| #   | Page               | Route             | Stage                      |
| --- | ------------------ | ----------------- | -------------------------- |
| 1   | Create account     | `/apply/register` | 1                          |
| 2   | Application form   | `/apply`          | 1 (single page), 3 (steps) |
| 3   | Application status | `/apply/status`   | 1                          |

**Student portal (spec item 4):**

| #   | Page             | Route                                                                  | Stage      |
| --- | ---------------- | ---------------------------------------------------------------------- | ---------- |
| 1   | Dashboard        | `/portal` (programme, current term, registered courses, announcements) | 2          |
| 2   | My record        | `/portal/record` (biodata, matric number, programme, status)           | 2          |
| 3   | Results          | `/portal/results` (published grades per term, GPA, CGPA)               | 2          |
| 4   | Academic history | `/portal/history` (all terms, unofficial transcript PDF)               | 2 (PDF: 3) |
| 5   | Courses          | `/portal/courses/[offering]` (lessons, videos, materials)              | 3          |
| 6   | Schedules        | `/portal/schedules`                                                    | 3          |
| 7   | Awards           | `/portal/awards`                                                       | 3          |
| 8   | Account          | `/portal/account`                                                      | 2          |

**Lecturer portal:**

| #   | Page                 | Route                        | Stage |
| --- | -------------------- | ---------------------------- | ----- |
| 1   | My courses this term | `/teach`                     | 3     |
| 2   | Lessons & materials  | `/teach/[offering]/content`  | 3     |
| 3   | Students             | `/teach/[offering]/students` | 3     |
| 4   | Grade entry          | `/teach/[offering]/grades`   | 3     |

**Admin dashboard (spec item 5):**

| #   | Page                       | Route                                                                                 | Stage                   |
| --- | -------------------------- | ------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Overview                   | `/admin` (applications pending, students by programme, grades awaiting approval)      | 3                       |
| 2   | Applications               | `/admin/applications` and `/admin/applications/[id]`                                  | 1                       |
| 3   | Student search             | `/admin/students`                                                                     | 2                       |
| 4   | Student file               | `/admin/students/[id]` (biodata, documents, registrations, grades, notes log, awards) | 2                       |
| 5   | Grades                     | `/admin/grades`                                                                       | 2 (entry), 3 (approval) |
| 6   | Programmes, courses, terms | `/admin/academics`                                                                    | 2                       |
| 7   | Offerings & lecturers      | `/admin/offerings`                                                                    | 2 (lecturers: 3)        |
| 8   | Site content               | `/admin/content` (mission, history, Statement of Faith, contact details, schedules)   | 3                       |
| 9   | Users & roles              | `/admin/users`                                                                        | 3                       |
| 10  | Awards                     | `/admin/awards`                                                                       | 3                       |

### Email Notifications

Templates built with React Email; sent through Resend (free tier: 3,000/month, 100/day).

| Email                                          | Stage |
| ---------------------------------------------- | ----- |
| Account confirmation                           | 1     |
| Application submitted; application decision    | 1     |
| Welcome to students on admission               | 2     |
| Results published for the term                 | 2     |
| Contact form copy to the office and the sender | 2     |
| Staff invitations; lecturer assigned           | 3     |

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

### Content management: when to revisit Payload CMS

Considered 16 Nov 2026 and **not adopted**. Payload (a Next.js-native headless CMS on Postgres) is strong at editorial content, but this project is a records system: access control lives in the database (RLS, the grade-change trigger, pgTAP tests), there is one login (Supabase Auth), and every schema change is a hand-written migration. Payload brings its own users, its own app-level access control, its own tables and migrations, an admin at `/admin` that clashes with ours, and a media library that would need a second storage bucket. For the planned content (vision, history, Statement of Faith, welcome banner, contact details), the `site_content` table in step 3.5 is cheaper and keeps one login and one permission model.

Revisit when **any** of these becomes true:

- GHTI wants a content site, not a handful of text blocks: news, events, a sermon or publications archive, staff profiles, many pages with images.
- Non-technical staff need page building, scheduled publishing, drafts with preview, or editorial approval workflows.
- The amount of public content outgrows simple Markdown fields.

If revisited, run Payload as a **separate small app** (its own subdomain, database schema and users) that the public site reads from, and keep the records system as it is. Check then that the Payload version supports this project's Next.js version, and that its storage and hosting fit the free tiers.
