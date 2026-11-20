import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";

import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { countApplicationsByStatus } from "@/lib/queries/admin-applications";
import { getRecordsOverview } from "@/lib/queries/admin-overview";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

type Tile = { label: string; value: number; href: string; detail?: ReactNode };

function AdminPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Admin" title="Overview" />}>
      <AdminOverview />
    </Suspense>
  );
}

async function AdminOverview() {
  const user = await requireRole("admin");
  const [counts, records] = await Promise.all([countApplicationsByStatus(), getRecordsOverview()]);
  const waiting = (counts.submitted ?? 0) + (counts.under_review ?? 0);

  const applicationTiles: Tile[] = [
    { label: "Need review", value: waiting, href: "/admin/applications?status=needs-review" },
    { label: "Admitted", value: counts.admitted ?? 0, href: "/admin/applications?status=admitted" },
    {
      label: "Not admitted",
      value: counts.rejected ?? 0,
      href: "/admin/applications?status=rejected",
    },
    {
      label: "Drafts in progress",
      value: counts.draft ?? 0,
      href: "/admin/applications?status=drafts",
    },
  ];

  const emailsWaiting = records.resultsEmails.reduce((sum, term) => sum + term.students, 0);
  const recordTiles: Tile[] = [
    {
      label: "Active students",
      value: records.activeStudents,
      href: "/admin/students",
      detail:
        records.studentsByProgramme.length > 0 ? (
          <ul className="space-y-0.5">
            {records.studentsByProgramme.map((row) => (
              <li key={row.programme} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{row.programme}</span>
                <span className="shrink-0 tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        ) : null,
    },
    {
      label: "Grades awaiting approval",
      value: records.awaitingApproval,
      href:
        (records.firstTermAwaiting ?? records.firstTermWithDrafts)
          ? `/admin/grades?term=${records.firstTermAwaiting ?? records.firstTermWithDrafts}`
          : "/admin/grades",
      detail: (() => {
        const drafts = records.unpublishedGrades - records.awaitingApproval;
        return `Submitted by lecturers. ${drafts} more ${drafts === 1 ? "is a draft" : "are drafts"} students cannot see yet.`;
      })(),
    },
    {
      label: "Results emails to send",
      value: emailsWaiting,
      href: records.resultsEmails[0]
        ? `/admin/grades?term=${records.resultsEmails[0].termId}`
        : "/admin/grades",
      detail:
        records.resultsEmails.length > 0 ? (
          <ul className="space-y-0.5">
            {records.resultsEmails.map((term) => (
              <li key={term.termId} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{term.label}</span>
                <span className="shrink-0 tabular-nums">{term.students}</span>
              </li>
            ))}
          </ul>
        ) : (
          "Every student with results has been told."
        ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Admin" title={`Welcome, ${user.fullName || "admin"}`}>
        <p>
          {waiting === 0
            ? "No applications are waiting for review."
            : `${waiting} application${waiting === 1 ? " is" : "s are"} waiting for review.`}
        </p>
      </PageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <TileSection title="Applications" tiles={applicationTiles} />
        <TileSection title="Students and results" tiles={recordTiles} columns={3} />
      </div>
    </>
  );
}

function TileSection({
  title,
  tiles,
  columns = 4,
}: {
  title: string;
  tiles: Tile[];
  columns?: 3 | 4;
}) {
  const id = `${title.toLowerCase().replace(/\W+/g, "-")}-heading`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-xl font-bold text-primary">
        {title}
      </h2>
      <ul
        className={
          columns === 3
            ? "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={tile.href}
              className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md"
            >
              <span className="text-sm font-semibold text-secondary">{tile.label}</span>
              <span className="mt-1 font-display text-4xl font-bold text-primary lining-nums tabular-nums">
                {tile.value}
              </span>
              {tile.detail && <div className="mt-3 text-sm text-secondary">{tile.detail}</div>}
              <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-accent-strong">
                View
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AdminPage;
