import type { Metadata } from "next";
import { Suspense } from "react";

import GradeTable from "@/components/portal/GradeTable";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { formatGpa } from "@/lib/grades";
import { getMyRegistrations } from "@/lib/queries/student";
import { groupResults } from "@/lib/results";

export const metadata: Metadata = { title: "My results", robots: { index: false } };

function ResultsPage() {
  return (
    <>
      <PageHeader eyebrow="Student portal" title="My results">
        <p>Published results for every term. GPA and CGPA count published results only.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading results…</p>}>
          <Results />
        </Suspense>
      </div>
    </>
  );
}

async function Results() {
  const user = await requireRole("student");
  const results = groupResults(await getMyRegistrations(user.id));

  if (results.terms.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
        You are not registered on any courses yet. Your results will appear here once they are
        published.
      </p>
    );
  }

  return (
    <>
      <dl className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <dt className="text-sm font-semibold text-secondary">
            <abbr title="Cumulative grade point average" className="no-underline">
              CGPA
            </abbr>
          </dt>
          <dd className="mt-1 text-4xl font-bold text-primary lining-nums tabular-nums">
            {formatGpa(results.cgpa)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <dt className="text-sm font-semibold text-secondary">Credit units graded</dt>
          <dd className="mt-1 text-4xl font-bold text-primary lining-nums tabular-nums">
            {results.unitsCounted}
          </dd>
        </div>
      </dl>

      {[...results.terms].reverse().map((term) => (
        <GradeTable key={term.termId} term={term} />
      ))}

      <p className="text-sm text-secondary">
        This is not an official transcript. Think a result is wrong? Contact the registrar.
      </p>
    </>
  );
}

export default ResultsPage;
