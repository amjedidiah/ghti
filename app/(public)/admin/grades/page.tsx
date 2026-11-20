import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import ResultNoticesButton from "@/components/admin/ResultNoticesButton";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/queries/admin-academics";
import { getGradeProgress, getResultNotices } from "@/lib/queries/admin-grades";
import { cn } from "@/lib/utils";
import { termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Grades", robots: { index: false } };

function GradesPage({ searchParams }: PageProps<"/admin/grades">) {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Grades">
        <p>
          Enter CA and exam scores per course, or approve what lecturers submit, then publish.
          Students see only published grades.
        </p>
      </PageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading courses…</p>}>
          <GradesContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function GradesContent({ searchParams }: Pick<PageProps<"/admin/grades">, "searchParams">) {
  await requireRole("admin");
  const term = (await searchParams).term;
  const progress = await getGradeProgress(typeof term === "string" && isUuid(term) ? term : null);

  if (progress.terms.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
        No terms yet.
      </p>
    );
  }

  return (
    <>
      <nav aria-label="Term" className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        {progress.terms.map((t) => (
          <Link
            key={t.id}
            href={`/admin/grades?term=${t.id}`}
            aria-current={t.id === progress.termId ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap",
              t.id === progress.termId
                ? "border-brand bg-brand text-on-brand"
                : "border-border bg-card text-primary hover:bg-muted",
            )}
          >
            {termLabel(t)}
          </Link>
        ))}
      </nav>

      {progress.offerings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
          No courses are offered in this term.{" "}
          {progress.termId && (
            <Link
              href={`/admin/offerings/${progress.termId}`}
              className="font-semibold text-accent-strong"
            >
              Choose its courses
            </Link>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {progress.offerings.map((offering) => {
            const done = offering.registered > 0 && offering.published === offering.registered;
            return (
              <li key={offering.id}>
                <Link
                  href={`/admin/grades/${offering.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block text-primary">
                      <span className="font-semibold tabular-nums">{offering.code}</span>{" "}
                      {offering.title}
                    </span>
                    <span className="mt-1 block text-sm text-secondary">{offering.programme}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "text-right text-sm tabular-nums",
                        done ? "font-semibold text-success" : "text-secondary",
                      )}
                    >
                      {offering.registered === 0 ? (
                        "No students"
                      ) : (
                        <>
                          <span className="block">
                            {offering.graded}/{offering.registered} graded
                          </span>
                          {offering.submitted > 0 && (
                            <span className="block font-semibold text-brand">
                              {offering.submitted} to approve
                            </span>
                          )}
                          <span className="block">
                            {offering.published}/{offering.registered} published
                          </span>
                        </>
                      )}
                    </span>
                    <ChevronRight className="size-5 text-secondary" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {progress.termId && progress.offerings.some((offering) => offering.published > 0) && (
        <ResultNotices termId={progress.termId} />
      )}
    </>
  );
}

async function ResultNotices({ termId }: { termId: string }) {
  const { plan } = await getResultNotices(termId);
  return (
    <section
      aria-labelledby="result-notices"
      className="space-y-3 rounded-xl border border-border bg-card p-5"
    >
      <h2 id="result-notices" className="font-display text-xl font-bold text-primary">
        Tell students their results are out
      </h2>
      <p className="text-secondary">
        Emailed so far: {plan.notified} of {plan.withResults} with published results. Each student
        gets this email once per term, so publish every course first. The email says only that
        results are out; grades stay in the portal.
      </p>
      <ResultNoticesButton termId={termId} pending={plan.pending.length} />
    </section>
  );
}

export default GradesPage;
