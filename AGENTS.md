# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Codex) working in this repository.

## Project Overview

GHTI website, admissions portal and student records system for a Charismatic Renewal Ministries (CRM) institution offering Certificate, Diploma and Degree programmes. It will live at `ghti.crm-world.org.ng` (subdomain to be confirmed), alongside the other CRM subdomains (`hymns.`, `cwl.`, `protection.`).

This is an **app**, not a content site: applications, logins, four roles, academic records and grades. Data modelling and access control come first; visuals second.

## Source of Truth

- `docs/development_plan.md`: phases, data model, routes per portal, open questions, trade-offs. **Read it before starting any task**, and tick its checkboxes as work is completed.
- `docs/client_proposal.md`: client-facing scope summary. Do not change its scope without the user's say-so.
- If code and the plan disagree, ask. Do not silently diverge from the plan.

## Project Status

Scaffolded (Phase 1.6): Next.js app, tooling, Supabase clients and a session-refresh `proxy.ts`. No migrations or UI yet. Next up: Phase 1.2 migrations, then 1.3 RLS + pgTAP tests, before any UI. Update this file whenever conventions change.

### Supabase environments

- **Local (current):** all development runs against the local Docker stack (`supabase start`). `.env.local` holds the local URL and keys from `supabase status`.
- **Cloud:** project `ghti` (ref `htbaujxaorlblkixiixx`, region `eu-west-2` London, free tier). The repo is **not linked** to it yet. Do not run `supabase link`, `supabase db push` or anything else against the cloud project without the user's say-so.

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

Run `bun run check` and `supabase test db` before calling a task done.

## Layout

Single Next.js app at the repository root (no separate backend). Exists today: `app/` (placeholder layout and page), `lib/utils.ts`, `lib/supabase/*`, `proxy.ts`, `supabase/config.toml`. The rest is planned.

- `app/(public)/`: website: `/`, `/about`, `/statement-of-faith`, `/academics`, `/academics/[slug]`, `/admissions`, `/contact`, `/verify/[id]`, `/privacy`
- `app/apply/`: admissions (applicant role)
- `app/portal/`: student portal
- `app/teach/`: lecturer portal
- `app/admin/`: admin dashboard
- `app/materials/[id]/`, `app/schedules/[id]/`: access-checked redirects to Google Drive
- `components/layout/`: shared CRM `Header` and `Footer`
- `components/shared/`: cross-portal components (`DataTable`, `StatusBadge`, `StepForm`, `FileDrop`, …)
- `lib/supabase/`: `server.ts` (Server Components/Actions), `client.ts` (Client Components), `admin.ts` (secret key, server-only, bypasses RLS), `proxy.ts` (`updateSession` used by root `proxy.ts`), `env.ts` (env var access), `database.types.ts` (generated, never hand-edited)
- `lib/links.ts`: YouTube and Google Drive URL parsers
- `lib/grades.ts`: score → letter → grade point, GPA and CGPA
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
- **Grades:** students see `published` grades only. Lecturers cannot edit `published` grades. Every change to a published grade requires a reason and is written to `grade_changes` by a database trigger. Never bypass or disable that trigger.
- **Personal data (Nigeria Data Protection Act 2023):** never log biodata, documents or grades; never put personal data in URLs or analytics; applicant documents are opened only through signed URLs that expire in 10 minutes.
- **Seed data is fake.** Never commit real applicant or student data.

### Files and costs

- **The only file storage is the private `documents` bucket**, for applicant and student documents (PDF, JPG, PNG; max 5 MB; compress images in the browser before upload). Do not add other buckets or upload features without asking.
- **Videos are YouTube links; materials and schedules are Google Drive links.** Store the **ID** (`youtube_id`, `drive_file_id`), never the raw URL. Parse and validate links with `lib/links.ts`.
- **Never render raw Drive links.** Students reach materials through `/materials/[id]`, which checks registration and then redirects.
- **PDFs are generated on demand** and never stored.
- Stay inside free tiers (Supabase, Vercel Hobby, Resend). Flag anything that would add a paid service or a recurring cost before adding it.

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

- **Uniform with the other CRM subdomains.** Port `Header` and `Footer` from `../cwl/components/` and `../crm-protection/components/`: same CRM logo, the six nav links to `crm-world.org.ng`, same social links. Add GHTI's own links (Academics, Admissions, Contact, Portal sign-in) without removing the CRM ones.
- **Brand:** CRM navy and gold (as on `protection`), cream ground. Playfair Display for headings, Inter for body, loaded with `next/font/google`.
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
