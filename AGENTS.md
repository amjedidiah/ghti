# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Codex) working in this repository.

## Project Overview

GHTI (Great Harvest Theological Institute) website, admissions portal and student records system for a Charismatic Renewal Ministries (CRM) institution offering a Certificate, an Ordinary Diploma and a Post Graduate Diploma in Theology. It will live at `ghti.crm-world.org.ng` (subdomain to be confirmed), alongside the other CRM subdomains (`hymns.`, `cwl.`, `protection.`).

This is an **app**, not a content site: applications, logins, four roles, academic records and grades. Data modelling and access control come first; visuals second.

## Source of Truth

- `docs/development_plan.md`: delivery stages (Bicycle → Tricycle → Car), data model, routes per portal, open questions, trade-offs. **Read it before starting any task**, and tick its checkboxes as work is completed.
- `docs/client_proposal.md`: client-facing scope summary. Do not change its scope without the user's say-so.
- `docs/client_inputs.md`: living list of what we need from the client, by stage. **Whenever a task depends on information only GHTI can give (content, names, decisions, DNS), add a row there** and use a clearly marked placeholder in code until it arrives.
- If code and the plan disagree, ask. Do not silently diverge from the plan.

## Project Status

Stage 1 🚲 Bicycle: built and live except real content. Step 1.5's remaining items wait on GHTI (real intake, admins, content; see `docs/client_inputs.md`) and the "applications open" milestone. Stage 2 🛺 Tricycle: steps 2.1 to 2.5 built (academics, enrolment, grades, student portal, records admin, transactional emails); 2.6 is built (contact form; rejected-documents clean-up, switched off until GHTI sets the period); its milestone waits on a real term's results.

### Supabase environments

- **Local (current):** all development runs against the local Docker stack (`supabase start`). `.env.local` holds the local URL and keys from `supabase status`. The seed creates fake local accounts (never in the cloud): admin `local-admin@example.test` / `local-admin-pass-123`; applicants `amaka.admitted@example.test` (admitted, ready to enrol) and `tunde.submitted@example.test` (submitted), both `local-applicant-pass-123`. Students `chidi.student@example.test` and `ngozi.student@example.test` (Certificate), both `local-student-pass-123`. Lecturer `lecturer@example.test` / `local-lecturer-pass-123` (teaches BIB 101).
- **Cloud:** project `ghti` (ref `htbaujxaorlblkixiixx`, region `eu-west-2` London, free tier), linked since step 1.1. It holds real data from step 1.5 on. **Never run `supabase db push`, `db reset --linked`, seeding or any other write against it without the user's say-so**; always `--dry-run` first. Seeded with fake placeholder programmes and one placeholder open intake ("Second semester, 2026/2027"); replace both with real data before applications open (step 1.5).
- **Cloud email (Resend since 16 Nov 2026):** Supabase sends auth emails through Resend (`smtp.resend.com`) from `GHTI <no-reply@ghti.crm-world.org.ng>` with the branded templates in `supabase/templates/`. Resend free tier: 3,000 a month, **100 a day**; test email flows locally (Mailpit at http://127.0.0.1:54324), not against the cloud. To change templates or the sender, edit them and rerun `bun run auth:push --site-url https://ghti.crm-world.org.ng --smtp --apply` (reads the key from the keychain item `ghti-resend-api-key`).
- **Vercel:** project `ghti` in the `amjedidiahs-projects` scope (Hobby), connected to GitHub: **every push to `main` deploys to production**, other branches get previews. Production URL: `https://ghti.crm-world.org.ng` (live since 16 Nov 2026; `ghti-nine.vercel.app` still serves the same deployment). DNS for `crm-world.org.ng` is at QServers (cPanel) and managed by the developer: `ghti` is an A record to Vercel (`216.198.79.1`), verified with a `_vercel` TXT record. `vercel.json` sets the Next.js preset and pins functions to `lhr1` (London, next to the database). Preview and production have `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY` and `EMAIL_TO`; production also has `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` and `SUPABASE_SECRET_KEY` (added 20 Nov 2026, Sensitive, **Production only**: previews are public and must never hold it). Deployment Protection is off (turned off for client review), so every preview URL is public: never deploy anything that exposes real personal data on a preview.
- **Firewall:** one custom rule, "Rate limit auth forms" (30 POSTs per minute per IP to `/sign-in`, `/apply/register`, `/forgot-password` and `/contact`). Hobby allows 3 custom rules but **only one rate-limit rule** (a second one is refused with 402), so new rate-limited forms join this rule. Keep per-IP limits generous: Nigerian mobile users often share an IP (CGNAT). The contact form also has a daily cap in the database (`claim_contact_send()`).
- **Backups:** private repo `amjedidiah/ghti-backups` (weekly workflow, age-encrypted artifacts kept 35 days). It runs `scripts/backup-storage.ts` from this repo, so keep that script dependency-free. The age private key is not on GitHub.

## Tech Stack

- **App:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- **Database + Auth:** Supabase (Postgres, Row-Level Security, Auth) via `@supabase/ssr` and `@supabase/supabase-js`
- **Applicant documents:** Supabase Storage, one private bucket (`documents`)
- **Video:** YouTube (unlisted), privacy-enhanced embeds
- **Course materials and lecture schedules:** Google Drive links
- **Forms:** React Hook Form + Zod + Server Actions; `libphonenumber-js` for phone numbers
- **PDFs:** `@react-pdf/renderer` (awards, unofficial transcripts), generated on demand
- **Email:** Resend + React Email
- **Icons / utilities:** Lucide React, `clsx`, `tailwind-merge`
- **Hosting:** Vercel
- **Package manager:** Bun

## Commands

```bash
bun run dev            # Next.js dev server
bun run build          # Production build
bun run lint           # ESLint (with eslint-config-prettier)
bun run format         # Prettier, write (includes Tailwind class sorting)
bun run format:check   # Prettier, check only
bun run typecheck      # next typegen + tsc --noEmit
bun run test           # Bun test runner: pure functions and React Testing Library component tests
bun run test:e2e       # Playwright end-to-end + axe (needs `bun run dev` and `supabase start`)
bun run test:e2e:fresh # Same, after `supabase db reset` (the specs rely on the seed)
bun run check          # lint + format:check + typecheck + test + build (full validation)
bun run db:types       # Regenerate lib/supabase/database.types.ts from the local DB

supabase start         # Local Supabase stack (Docker)
supabase status        # Local URLs and keys (for .env.local)
supabase db reset      # Re-apply all migrations + seed locally
supabase migration new <name>   # New migration file
supabase test db       # pgTAP tests for RLS policies
```

Run `bun run check` and `supabase test db` before calling a task done, and `bun run test:e2e` before a release or when a change touches a user journey. `bun run build` prerenders pages that read the database, so `supabase start` must be running locally (Vercel builds read the cloud project).

## Layout

Single Next.js app at the repository root (no separate backend). Exists today: `app/(public)/` (home, academics, "Coming soon" admissions/contact/sign-in), `components/layout/`, `components/programmes/`, `components/shared/`, `lib/`, `proxy.ts`, `supabase/` (one migration, seed, tests). The rest is planned.

- `app/(public)/`: website: `/`, `/about`, `/statement-of-faith`, `/academics`, `/academics/[slug]`, `/admissions`, `/contact`, `/verify/[id]`, `/privacy`
- `app/apply/`: admissions (applicant role)
- `app/portal/`: student portal
- `app/teach/`: lecturer portal
- `app/admin/`: admin dashboard
- `app/materials/[id]/`, `app/schedules/[id]/`: access-checked redirects to Google Drive
- `components/layout/`: shared CRM `Header` and `Footer`
- `components/shared/`: cross-portal components (`DataTable`, `StatusBadge`, `StepForm`, `FileDrop`, …)
- `lib/supabase/`: `server.ts` (Server Components/Actions), `client.ts` (Client Components), `admin.ts` (secret key, server-only, bypasses RLS), `proxy.ts` (`updateSession` used by root `proxy.ts`), `public.ts` (anonymous, cookie-less client for public data; the only client allowed inside `"use cache"`), `env.ts` (env var access), `database.types.ts` (generated, never hand-edited)
- `lib/queries/`: server-only data access (`"use cache"` reads of public data with `cacheTag`; revalidate the tag when admins change the data)
- `lib/site.ts`: site name, CRM nav and social links, contact details (null until the client supplies them)
- `lib/content.ts`: GHTI's own words for public pages (mission (GHTI dropped the vision on 20 Nov 2026), history, Statement of Faith, map, privacy contacts); null shows a `Placeholder` ("Waiting for GHTI")
- `app/api/cron/keep-alive/`: daily Vercel Cron (vercel.json) so the free Supabase project never pauses. `app/api/cron/cleanup-documents/`: daily deletion of rejected applicants' documents after `REJECTED_DOCUMENTS_KEEP_DAYS` (`lib/retention.ts`; `null`, so off, until client input #19). Both check `CRON_SECRET` with `isCronRequest()` from `lib/cron.ts`
- Contact form (step 2.6): `components/contact/ContactForm.tsx`, `lib/contact/actions.ts`, `lib/validation/contact.ts` (schema, honeypot, `CONTACT_DAILY_LIMIT`), templates `emails/ContactMessage.tsx` and `emails/ContactReceipt.tsx`; daily cap `claim_contact_send()` in `supabase/migrations/20261120032259_contact_sends.sql`
- `lib/auth/`: `rules.ts` (role homes, route guards, safe redirects; pure, tested), `session.ts` (`getCurrentUser`, `requireRole`), `actions.ts` (auth Server Actions)
- `lib/validation/`: Zod schemas shared by client forms and Server Actions (`auth.ts`, `application.ts`)
- `lib/applications/`: `actions.ts` (start, save, submit, record/remove documents), `mapping.ts` (row <-> form values; pure, tested)
- `lib/files.ts` (upload rules, paths; pure, tested) and `lib/upload-browser.ts` (photo compression, direct-to-Storage upload with progress)
- `components/applications/`: `ApplicationForm`, `DocumentUpload`
- `components/admin/`: `ApplicationsList` (browser-side name filter), `DocumentViewer`, `ReviewPanel`; `lib/admin/actions.ts` and `lib/queries/admin-applications.ts`
- Academics admin (`/admin/academics`, `/admin/offerings`): `components/admin/` `ProgrammeForm`, `CourseForm`, `TermForm`, `DeleteCourseButton`, `OfferingsForm`; `lib/offerings.ts` (what to add or remove; pure, tested); registrations: `RegisterStudentsForm`, `RemoveRegistrationButton`, `lib/admin/registrations.ts`, `lib/queries/admin-registrations.ts`, `lib/registrations.ts` (pure, tested); `lib/admin/academics.ts` (Server Actions), `lib/queries/admin-academics.ts`, `lib/validation/academics.ts` (schemas and row mapping; pure, tested). `lib/validation/form.ts` turns a Zod failure into a `FormState`
- Enrolment (step 2.2): `enrol_student()` in `supabase/migrations/20261116120000_enrol_student.sql`; `components/admin/EnrolPanel.tsx` on admitted applications; `enrolStudent` in `lib/admin/actions.ts`; `lib/validation/enrolment.ts`. Student portal `app/(public)/portal/` (overview, results, record, history, account; `lib/queries/student.ts`, `lib/results.ts`, `components/portal/`). `components/layout/AreaBar.tsx` is the admin and portal sub-navigation; `components/applications/ApplicationDetails.tsx` shows biodata read-only for both
- `app/(public)/admin/documents/[id]/route.ts`: the only way to open an applicant document. Logs the view in `document_views`, then redirects to a 10-minute signed URL
- `components/forms/`: `Field`, `TextInput`, `PasswordInput`, `SubmitButton`, `FormMessage`, `useActionForm` (React Hook Form + `useActionState`)
- `app/auth/confirm/`: landing route for every auth email link (`token_hash` + `verifyOtp`); templates in `supabase/templates/`
- `scripts/create-admin.ts`: `bun run admin:create --email … --name …` invites or promotes an admin
- `scripts/push-auth-config.ts`: `bun run auth:push --site-url <url> [--apply]` sets the cloud project's auth settings (site URL, redirect allow list, password length) and, once custom SMTP exists, the branded email templates. Dry run by default; rerun when the domain changes
- `lib/links.ts`: YouTube and Google Drive link parsers (store the ID only) and `youTubeEmbedUrl()` / `driveViewUrl()` (pure, tested)
- Staff (step 3.1): `/admin/users` (`InviteStaffForm`, `StaffRoleForm`, `ResendInvitationButton`), `lib/admin/users.ts` (invitations use the secret key via `createAdminClient()` after `requireRole`), `lib/validation/staff.ts`; database functions in `supabase/migrations/20261120035806_staff_accounts.sql`. `/teach` is lecturers only (a "coming soon" page until steps 3.2 and 3.3)
- Admin overview (`/admin`): `lib/admin-overview.ts` (pure, tested), `lib/queries/admin-overview.ts`
- CSV exports (`/admin/exports`): download route `app/(public)/admin/exports/[kind]/route.ts` logs to `export_log` (`supabase/migrations/20261120033905_export_log.sql`) before sending; `lib/csv.ts` (CSV, formula neutralising), `lib/exports.ts` (filters, columns, rows), `lib/queries/admin-exports.ts`. Never store an export, never put a name in its file name or URL
- Unofficial transcript: `app/(public)/portal/transcript/route.tsx` renders `components/pdf/TranscriptDocument.tsx` from `lib/transcript.ts` (pure, tested). PDFs use `assets/fonts` (WOFF) and `assets/images/ghti-crest.png`; never `render`-callback text (invisible with embedded fonts)
- SEO: `app/sitemap.ts`, `app/robots.ts`, rules in `lib/seo.ts`; `siteUrl()` in `lib/site.ts` is the one canonical-URL helper (metadata, emails, sitemap)
- Tests: Bun unit tests beside the code (`*.test.ts`); React Testing Library component tests (`*.test.tsx`) run with happy-dom preloaded by `bunfig.toml` (`tests/setup-dom.ts` keeps Bun's own streams and fetch classes). Components take Server Actions as props so tests pass fakes. Playwright specs are `e2e/*.e2e.ts` (phone 375px and desktop projects; `e2e/support/` has the seeded accounts, a Mailpit helper and an axe fixture preset to WCAG 2.1 A/AA). Seeded lecturer: `lecturer@example.test` / `local-lecturer-pass-123`, teaching BIB 101
- Lecturer access: policies call `SECURITY DEFINER` helpers in the `private` schema (`teaches_offering`, `teaches_course`, `teaches_registration`), never a policy that reads back the table it guards (42P17 recursion). Lecturers never read `profiles`/`students`: use `class_list()`. `/teach` (`lib/queries/teach.ts`) and `/admin/offerings/[termId]/[offeringId]` (assign a lecturer, `assignLecturer` in `lib/admin/academics.ts`)
- Course content (step 3.2): `supabase/migrations/20261120053409_course_content.sql`; `components/content/` (`CourseContentEditor` for lecturers and admins, `CourseContentView` for students, `LessonPlayer`, `MaterialList`, `ScheduleList`, `ContentHelp`); actions `lib/content/actions.ts`, schemas `lib/validation/content.ts`, queries `lib/queries/content.ts` (`getCourseContent(courseId, { withFileIds })`: only the editor asks for Drive IDs). Drive files open through `app/(public)/materials/[id]/route.ts` and `schedules/[id]/route.ts`. `components/shared/ConfirmDeleteButton.tsx` is the two-step delete. `useActionForm` takes schemas that transform (input and output types differ). In Zod 4 use `.prefault()`, not `.default()`, when a default must go through a transform
- e2e: `makeAxeBuilder(page)` scans the page you pass (the default `page` is blank when a test uses `pageAs`); `describeViolations()` turns results into readable failures; YouTube's player frame is excluded as third-party. Playwright `getByRole` names match substrings: use `exact: true` for short names like "Content"
- `supabase migration new <name>` reads SQL from stdin when its output is piped or captured: run it plainly, then write the file
- Records admin (step 2.5): `supabase/migrations/20261120012918_records_admin.sql` (`record_notes`, append-only; `set_student_status()`; `search_students()` with `pg_trgm`). `/admin/students` (`components/admin/StudentSearch.tsx`, search through `searchStudentsAction` so names never reach URLs) and `/admin/students/[id]` (`RecordNoteForm`, `StudentStatusForm`, `lib/student-file.ts`); `lib/admin/students.ts`, `lib/queries/admin-students.ts`, `lib/validation/students.ts`. `components/shared/DataTable.tsx`: sortable, paged table that becomes cards on phones
- Transactional emails: templates in `emails/` (React Email, tested in `emails/templates.test.tsx`); `lib/email/send.tsx` (one function per email; call inside `after()`), `lib/email/transport.ts` (Resend when `RESEND_API_KEY` is set, else Mailpit at `MAILPIT_URL`, else skipped). `account_emails()` (admin only) returns sign-in emails. Results emails go by an "Email students" button on `/admin/grades`, tracked in `result_notices` (one per student and term, up to 80 a click: Resend's 100 a day is shared with auth emails)
- PostgREST embeds: a table with a composite primary key of two foreign keys reads as a many-to-many link and makes existing embeds between those tables ambiguous. Give such tables a surrogate `id` primary key and a unique constraint instead (as `result_notices` does)
- `lib/grades.ts`: score → letter → grade point, GPA and CGPA, and `GRADE_SPLIT` (CA/exam maximums, the one place to change when GHTI confirms its split); `lib/grade-sheet.ts` plans a grade sheet save for both modes (`admin` publishes, `lecturer` submits; pure, tested) and `lib/save-grade-sheet.ts` applies it (the one save, server-only). One form for both: `components/grades/GradeSheetForm.tsx` (with `ImportScores`, CSV import via `lib/grade-import.ts`, and `ReturnedNote`). Admin: `/admin/grades` (`lib/admin/grades.ts`: `saveGradeSheet`, `returnGrades`; `lib/queries/admin-grades.ts`); lecturer: `/teach/[offeringId]/grades` (`lib/teach/grades.ts`, `getMyGradeSheet` in `lib/queries/teach.ts`). Shared reads in `lib/queries/grade-sheet.ts`. Grade workflow (step 3.3): `supabase/migrations/20261120100550_grade_workflow.sql` (`grade_returns`, `return_grades()`; submitted grades must be complete); emails `GradesSubmitted` (to `EMAIL_TO`, counts only) and `GradesReturned` (to the lecturer, with the note)
- `supabase/migrations/`, `supabase/seed.sql`, `supabase/tests/`
- `emails/`: React Email templates (`EmailLayout`, application submitted, decision, welcome, results published)
- `proxy.ts`: session refresh and role guards for `/apply`, `/portal`, `/teach`, `/admin`

## Roles

| Role        | Scope                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `applicant` | Own application (editable only while `draft`) and own documents                                      |
| `student`   | Own record, registrations, **published** grades, course content for registered offerings, own awards |
| `lecturer`  | Content and draft/submitted grades for their assigned offerings only                                 |
| `admin`     | Everything; the only role that admits, publishes grades, changes roles and issues awards             |

An admitted applicant becomes a `student` on the same account. Staff accounts are invited by admins, never self-registered.

## Non-Negotiable Rules

### Security and data

- **RLS on every table and on the storage bucket.** No table ships without policies and pgTAP tests for each role.
- **Access control lives in the database.** Hiding a button is never the only check. Every Server Action re-checks the user's role on the server.
- **The Supabase secret key is server-only.** Use it only in `lib/supabase/admin.ts` (which imports `server-only`), and only where RLS genuinely can't apply (e.g. cron jobs). Never in client components, never in `NEXT_PUBLIC_*` variables.
- **Schema changes only through migration files** in `supabase/migrations/`. Never edit the schema in the Supabase dashboard. Regenerate types after each migration.
- **Deploy order:** Supabase migrations are not applied by Vercel. Before pushing code that needs a new migration to `main`, push the migration to the cloud project (`supabase db push --dry-run`, then `supabase db push`, with the user's say-so). Code first means a broken production site.
- **Grants are explicit.** On this Supabase version new tables give `anon`, `authenticated` and `service_role` no privileges. Every table migration revokes everything, then grants only what its policies need, `service_role` included.
- **Role checks:** `public.is_admin()` and `public.current_app_role()` (SECURITY DEFINER) in policies; `requireRole()` from `@/lib/auth/session` at the top of every protected page and Server Action. The proxy (`lib/auth/rules.ts`) only steers navigation. Never read a role from user metadata.
- **Grades:** students see `published` grades only. Lecturers cannot edit `published` grades. Every change to a published grade requires a reason and is written to `grade_changes` by a database trigger. Never bypass or disable that trigger.
- **Personal data (Nigeria Data Protection Act 2023):** never log biodata, documents or grades; never put personal data in URLs or analytics; applicant documents are opened only through signed URLs that expire in 10 minutes.
- **Seed data is fake.** Never commit real applicant or student data.

### Files and costs

- **The only file storage is the private `documents` bucket**, for applicant and student documents (PDF, JPG, PNG; max 5 MB; compress images in the browser before upload). Do not add other buckets or upload features without asking.
- **Videos are YouTube links; materials and schedules are Google Drive links.** Store the **ID** (`youtube_id`, `drive_file_id`), never the raw URL. Parse and validate links with `lib/links.ts`.
- **Never render raw Drive links.** Students reach materials through `/materials/[id]`, which checks registration and then redirects.
- **PDFs are generated on demand** and never stored.
- Stay inside free tiers (Supabase, Vercel Hobby, Resend). Flag anything that would add a paid service or a recurring cost before adding it.
- **No headless CMS (e.g. Payload) inside this app.** Public text moves into the `site_content` table and our own admin (step 3.5). The plan's "Content management: when to revisit Payload CMS" says when to reconsider, and then only as a separate app.

## Code Conventions

- Use `function` declarations for components, not arrow functions. Default export at the bottom of the file.
- Use the `@/` path alias for imports.
- Use `cn()` from `@/lib/utils` to combine Tailwind classes conditionally.
- **Server Components by default.** Add `'use client'` only for interactivity.
- **Cache Components is on** (`cacheComponents: true`, the Next 16 scaffold default). Request-time data (`cookies()`, the Supabase server client, `searchParams`) must sit inside a `<Suspense>` boundary; use `"use cache"` only for data that is the same for every user.
- **No `forwardRef`.** Pass `ref` as a regular prop (React 19).
- **Mutations through Server Actions** (`"use server"`), validated with Zod on the server. Client forms use React Hook Form with the same Zod schema; `useActionState` for submission state, `useFormStatus` for submit buttons.
- Use the generated `Database` types for every Supabase query. No `any`.
- Keep business rules (grade maths, link parsing, status transitions) in pure functions in `lib/` with Bun tests.

## Design System

- **GHTI's header comes first** (decision 15 Nov 2026, differs from `cwl` and `protection`). The header is GHTI's own: the GHTI wordmark with "Great Harvest Theological Institute" beneath it (GHTI asked on 20 Nov 2026 that the header not carry "Charismatic Renewal Ministries", which read as what GHTI stands for), then About, Academics, Admissions, Contact and the account button. The six CRM navigation links are not shown; the footer's copyright line links "Charismatic Renewal Ministries" to crm-world.org.ng, beside the CRM social links. `public/brand/crm-logo.png` is kept for award certificates (step 3.4).
- **GHTI logo** (redrawn from GHTI's crest, approved 16 Nov 2026): `public/brand/ghti-crest.svg` is the one logo (indigo-rimmed shield, descending dove, white light, open Bible, the name on an arc and "GHTI"). GHTI asked on 20 Nov 2026 for this crest everywhere rather than two versions, so the text-free mark was removed: the crest sits beside the header wordmark, is `app/icon.svg` (a copy), and `app/icon.png` (192px, transparent) and `app/apple-icon.png` (180px on cream) are rendered from it in Chromium. It is also on the About page, the share image (`app/opengraph-image.tsx`) and, as `assets/images/ghti-crest.png`, in PDFs. Its lettering was converted to outlines on 20 Nov 2026 (Inter Bold and Playfair Display Bold, placed exactly where Chrome drew the original text), so it needs no fonts. At icon sizes the lettering is too small to read; that is accepted. If the crest changes, re-copy `app/icon.svg` and re-render the three PNGs (`app/icon.png`, `app/apple-icon.png`, `assets/images/ghti-crest.png` at 500×600). On 20 Nov 2026 the name arc was raised and the dove lowered slightly so they no longer touch. The dove is gold, not a flame.
- **Brand** (decision 16 Nov 2026): GHTI's crest colours lead; CRM's are a light touch. Crest green for the header, primary actions (`brand`) and the footer band (`band`, deepest green under a gold rule), dove gold as the accent, cream ground, green-black ink. Use blue sparingly: CRM indigo appears only in the logo rim and the CRM links (`ministry`). CRM flame red, deepened, for errors (`danger`). Dark bands carry `surface-dark` (bright gold focus ring); a light panel inside one carries `surface-light`. Playfair Display for headings, Inter for body, loaded with `next/font/google`.
- **Tailwind v4:** theme defined with `@theme` in `globals.css`, no config file. Components use **semantic tokens** (`bg`, `bg-card`, `text-primary`, `text-secondary`, `accent`, `border`, …), not raw palette values, so dark mode can be added later.
- **Simplicity and ease of use first.** Many users are on phones: every screen must work at 375px width. Forms show clear, specific errors.

## Environment Variables

Keep `.env.example` up to date. For local development, copy it to `.env.local` and fill the Supabase values from `supabase status`. Never commit `.env*` files with real values.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: client and server.
- `SUPABASE_SECRET_KEY`: server only (`lib/supabase/admin.ts`).
- `NEXT_PUBLIC_SITE_URL`: canonical URL for SEO, emails and QR codes.
- `RESEND_API_KEY`, `EMAIL_FROM` (default `GHTI <no-reply@ghti.crm-world.org.ng>`), `EMAIL_REPLY_TO` (once GHTI names an admissions address), `EMAIL_TO` (contact-form inbox, also "grades waiting for approval": the dean's address in Production since 20 Nov 2026, client input #10; Preview keeps the developer's so test messages never reach GHTI; after changing it in Vercel, redeploy): transactional email and contact-form inbox.
- `MAILPIT_URL`: local only (`http://127.0.0.1:54324`); app emails go to the local Mailpit inbox when `RESEND_API_KEY` is unset.
- `CRON_SECRET`: protects the keep-alive and clean-up cron routes (`lib/cron.ts`).

## Git

- Commit or push only when the user says so.
- No AI attribution in commits or PRs: no `Co-Authored-By` trailers, no "Generated with" lines.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
