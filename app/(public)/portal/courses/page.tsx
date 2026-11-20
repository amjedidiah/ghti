import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { getMyCourses } from "@/lib/queries/student";
import { termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "My courses", robots: { index: false } };

/** The courses the student is registered on, by term, each with its lessons. */
function CoursesPage() {
  return (
    <>
      <PageHeader eyebrow="Student portal" title="My courses">
        <p>Lessons, videos and materials for the courses you are registered on.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading your courses…</p>}>
          <Courses />
        </Suspense>
      </div>
    </>
  );
}

async function Courses() {
  const user = await requireRole("student");
  const courses = await getMyCourses(user.id);
  if (courses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
        You are not registered on any course yet. The registrar registers students each term.
      </p>
    );
  }

  const terms = new Map<string, { label: string; courses: typeof courses }>();
  for (const course of courses) {
    const entry = terms.get(course.term.id) ?? { label: termLabel(course.term), courses: [] };
    entry.courses.push(course);
    terms.set(course.term.id, entry);
  }

  return (
    <div className="space-y-8">
      {[...terms.entries()].map(([termId, term]) => (
        <section key={termId} aria-labelledby={`term-${termId}`}>
          <h2 id={`term-${termId}`} className="font-display text-xl font-bold text-primary">
            {term.label}
          </h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {term.courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/portal/courses/${course.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted sm:px-5"
                >
                  <span className="min-w-0 text-primary">
                    <span className="font-semibold tabular-nums">{course.course.code}</span>{" "}
                    {course.course.title}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-secondary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default CoursesPage;
