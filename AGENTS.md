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

Stage 1 🚲 Bicycle in progress. Steps 1.1 to 1.4 are done and live (CRM chrome, programmes, accounts and roles, online applications, admin review). Step 1.5 (ready for real applicants) is under way: public pages with placeholders, privacy notice draft and the keep-alive cron are built; backups, rate limiting, DNS and real content remain. Custom SMTP (Resend) must land before applications open.

### Supabase environments

- **Local (current):** all development runs against the local Docker stack (`supabase start`). `.env.local` holds the local URL and keys from `supabase status`. The seed creates fake local accounts (never in the cloud): admin `local-admin@example.test` / `local-admin-pass-123`; applicants `amaka.admitted@example.test` (admitted, ready to enrol) and `tunde.submitted@example.test` (submitted), both `local-applicant-pass-123`. Students `chidi.student@example.test` and `ngozi.student@example.test` (Certificate), both `local-student-pass-123`.
- **Cloud:** project `ghti` (ref `htbaujxaorlblkixiixx`, region `eu-west-2` London, free tier), linked since step 1.1. It holds real data from step 1.5 on. **Never run `supabase db push`, `db reset --linked`, seeding or any other write against it without the user's say-so**; always `--dry-run` first. Seeded with fake placeholder programmes and one placeholder open intake ("Second semester, 2026/2027"); replace both with real data before applications open (step 1.5).
- **Cloud email (Resend since 16 Nov 2026):** Supabase sends auth emails through Resend (`smtp.resend.com`) from `GHTI <no-reply@ghti.crm-world.org.ng>` with the branded templates in `supabase/templates/`. Resend free tier: 3,000 a month, **100 a day**; test email flows locally (Mailpit at http://127.0.0.1:54324), not against the cloud. To change templates or the sender, edit them and rerun `bun run auth:push --site-url https://ghti.crm-world.org.ng --smtp --apply` (reads the key from the keychain item `ghti-resend-api-key`).
- **Vercel:** project `ghti` in the `amjedidiahs-projects` scope (Hobby), connected to GitHub: **every push to `main` deploys to production**, other branches get previews. Production URL: `https://ghti.crm-world.org.ng` (live since 16 Nov 2026; `ghti-nine.vercel.app` still serves the same deployment). DNS for `crm-world.org.ng` is at QServers (cPanel) and managed by the developer: `ghti` is an A record to Vercel (`216.198.79.1`), verified with a `_vercel` TXT record. `vercel.json` sets the Next.js preset and pins functions to `lhr1` (London, next to the database). Preview and production have `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; production also has `NEXT_PUBLIC_SITE_URL`. No secret key in Vercel yet. Deployment Protection is off (turned off for client review), so every preview URL is public: never deploy anything that exposes real personal data on a preview.
- **Firewall:** one custom rule, "Rate limit auth forms" (30 POSTs per minute per IP to the auth forms). Hobby allows 3 custom rules. Keep per-IP limits generous: Nigerian mobile users often share an IP (CGNAT).
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
bun run test           # Bun test runner (pure functions: link parsing, grade maths)
bun run check          # lint + format:check + typecheck + test + build (full validation)
bun run db:types       # Regenerate lib/supabase/database.types.ts from the local DB

supabase start         # Local Supabase stack (Docker)
supabase status        # Local URLs and keys (for .env.local)
supabase db reset      # Re-apply all migrations + seed locally
supabase migration new <name>   # New migration file
supabase test db       # pgTAP tests for RLS policies
```

Run `bun run check` and `supabase test db` before calling a task done. `bun run build` prerenders pages that read the database, so `supabase start` must be running locally (Vercel builds read the cloud project).

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
- `lib/content.ts`: GHTI's own words for public pages (vision, history, Statement of Faith, map, privacy contacts); null shows a `Placeholder` ("Waiting for GHTI")
- `app/api/cron/keep-alive/`: daily Vercel Cron (vercel.json) so the free Supabase project never pauses; requires `CRON_SECRET`
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
- `lib/links.ts`: YouTube and Google Drive URL parsers
- `lib/grades.ts`: score → letter → grade point, GPA and CGPA, and `GRADE_SPLIT` (CA/exam maximums, the one place to change when GHTI confirms its split); `lib/grade-sheet.ts` plans a grade sheet save (pure, tested). Grade entry: `/admin/grades` (`components/admin/GradeSheetForm.tsx`, `lib/admin/grades.ts`, `lib/queries/admin-grades.ts`)
- `supabase/migrations/`, `supabase/seed.sql`, `supabase/tests/`
- `emails/`: React Email templates
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

- **GHTI's header comes first** (decision 15 Nov 2026, differs from `cwl` and `protection`). The header is GHTI's own: the GHTI wordmark with "Charismatic Renewal Ministries" beneath it, then About, Academics, Admissions, Contact and the account button. The six CRM navigation links are not shown; the footer's copyright line links "Charismatic Renewal Ministries" to crm-world.org.ng, beside the CRM social links. `public/brand/crm-logo.png` is kept for award certificates (step 3.4).
- **GHTI logo** (redrawn from GHTI's crest, approved 16 Nov 2026): `public/brand/ghti-mark.svg` (indigo-rimmed shield, descending dove, white light, open Bible; no text) sits beside the header wordmark and is the source of `app/icon.svg`, `app/icon.png` and `app/apple-icon.png`. `public/brand/ghti-crest.svg` is the full crest with the name arc and "GHTI", for the About page and certificates; its lettering is live text (Inter, Playfair Display), so convert it to outlines before using it as an `<img>` or in a PDF. The dove is gold, not a flame.
- **Brand** (decision 16 Nov 2026): GHTI's crest colours lead; CRM's are a light touch. Crest green for the header, primary actions (`brand`) and the footer band (`band`, deepest green under a gold rule), dove gold as the accent, cream ground, green-black ink. Use blue sparingly: CRM indigo appears only in the logo rim and the CRM links (`ministry`). CRM flame red, deepened, for errors (`danger`). Dark bands carry `surface-dark` (bright gold focus ring); a light panel inside one carries `surface-light`. Playfair Display for headings, Inter for body, loaded with `next/font/google`.
- **Tailwind v4:** theme defined with `@theme` in `globals.css`, no config file. Components use **semantic tokens** (`bg`, `bg-card`, `text-primary`, `text-secondary`, `accent`, `border`, …), not raw palette values, so dark mode can be added later.
- **Simplicity and ease of use first.** Many users are on phones: every screen must work at 375px width. Forms show clear, specific errors.

## Environment Variables

Keep `.env.example` up to date. For local development, copy it to `.env.local` and fill the Supabase values from `supabase status`. Never commit `.env*` files with real values.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: client and server.
- `SUPABASE_SECRET_KEY`: server only (`lib/supabase/admin.ts`).
- `NEXT_PUBLIC_SITE_URL`: canonical URL for SEO, emails and QR codes.
- `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`: transactional email and contact-form inbox.
- `CRON_SECRET`: protects the Supabase keep-alive and cleanup cron routes.

## Git

- Commit or push only when the user says so.
- No AI attribution in commits or PRs: no `Co-Authored-By` trailers, no "Generated with" lines.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
