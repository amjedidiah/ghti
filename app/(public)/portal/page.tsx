import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import StudentRecordCard from "@/components/portal/StudentRecordCard";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { formatGpa } from "@/lib/grades";
import { getMyRegistrations, getMyStudentRecord } from "@/lib/queries/student";
import { groupResults } from "@/lib/results";

export const metadata: Metadata = { title: "Student portal", robots: { index: false } };

/** Student portal home: record, CGPA at a glance, and the latest term's courses. */
function PortalPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Student portal" title="Welcome" />}>
      <PortalContent />
    </Suspense>
  );
}

async function PortalContent() {
  const user = await requireRole("student");
  const [record, registrations] = await Promise.all([
    getMyStudentRecord(user.id),
    getMyRegistrations(user.id),
  ]);
  const results = groupResults(registrations);
  const latest = results.terms.at(-1) ?? null;
  const firstName = user.fullName.split(/\s+/)[0];

  return (
    <>
      <PageHeader eyebrow="Student portal" title={firstName ? `Welcome, ${firstName}` : "Welcome"}>
        <p>Your record, your courses and your results, in one place.</p>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {record ? (
          <StudentRecordCard record={record} />
        ) : (
          <p className="rounded-xl border border-border bg-card p-6 text-secondary">
            We could not find your student record. Please contact the registrar.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-4">
          <Tile label="CGPA" value={formatGpa(results.cgpa)} href="/portal/results" />
          <Tile
            label={latest ? `GPA, ${latest.label}` : "Latest GPA"}
            value={formatGpa(latest?.gpa ?? null)}
            href="/portal/results"
          />
        </dl>

        <section aria-labelledby="courses-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="courses-heading" className="font-display text-2xl font-bold text-primary">
              {latest ? `Courses: ${latest.label}` : "Courses"}
            </h2>
            {latest && (
              <p className="text-sm text-secondary tabular-nums">
                {latest.unitsRegistered} credit units
              </p>
            )}
          </div>
          {latest ? (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {latest.courses.map((course) => (
                <li key={course.code} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="min-w-0">
                    <span className="font-semibold text-primary tabular-nums">{course.code}</span>{" "}
                    <span className="text-primary">{course.title}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {course.published ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-bold text-primary">
                        {course.letter}
                      </span>
                    ) : (
                      <span className="text-secondary">{course.creditUnits} CU</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
              You are not registered on any courses yet. The registrar registers you each term.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Tile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <dt className="text-sm font-semibold text-secondary">{label}</dt>
      <dd className="mt-1 text-4xl font-bold text-primary lining-nums tabular-nums">{value}</dd>
      <dd className="mt-auto pt-3">
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent-strong hover:underline"
        >
          See results
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </dd>
    </div>
  );
}

export default PortalPage;
