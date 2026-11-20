import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { getMyOfferings, type MyOffering } from "@/lib/queries/teach";
import { termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "My courses", robots: { index: false } };

/** The lecturer's home: the courses they teach, by term. */
function TeachPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Lecturer area" title="My courses" />}>
      <MyCourses />
    </Suspense>
  );
}

async function MyCourses() {
  const user = await requireRole("lecturer");
  const offerings = await getMyOfferings(user.id);

  const terms = new Map<string, { label: string; offerings: MyOffering[] }>();
  for (const offering of offerings) {
    const entry = terms.get(offering.term.id) ?? { label: termLabel(offering.term), offerings: [] };
    entry.offerings.push(offering);
    terms.set(offering.term.id, entry);
  }

  return (
    <>
      <PageHeader eyebrow="Lecturer area" title={`Welcome, ${user.fullName || "lecturer"}`}>
        <p>The courses you teach. Open one to see your class.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {terms.size === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
            You are not assigned to any course yet. The registrar assigns lecturers to courses each
            term; you will get an email when it happens.
          </p>
        ) : (
          [...terms.entries()].map(([termId, term]) => (
            <section key={termId} aria-labelledby={`term-${termId}`}>
              <h2 id={`term-${termId}`} className="font-display text-xl font-bold text-primary">
                {term.label}
              </h2>
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {term.offerings.map((offering) => (
                  <li key={offering.id}>
                    <Link
                      href={`/teach/${offering.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block text-primary">
                          <span className="font-semibold tabular-nums">{offering.course.code}</span>{" "}
                          {offering.course.title}
                        </span>
                        <span className="mt-1 block text-sm text-secondary tabular-nums">
                          {offering.students} student{offering.students === 1 ? "" : "s"} ·{" "}
                          {offering.course.credit_units} credit unit
                          {offering.course.credit_units === 1 ? "" : "s"}
                        </span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-secondary" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}

export default TeachPage;
