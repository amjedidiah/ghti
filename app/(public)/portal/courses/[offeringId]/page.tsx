import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import CourseContentView from "@/components/content/CourseContentView";
import { requireRole } from "@/lib/auth/session";
import { getCourseContent } from "@/lib/queries/content";
import { getMyCourse } from "@/lib/queries/student";
import { isUuid } from "@/lib/utils";
import { termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Course", robots: { index: false } };

/** A course's lessons and materials, for a student registered on it. */
function CoursePage({ params }: PageProps<"/portal/courses/[offeringId]">) {
  return (
    <Suspense
      fallback={<p className="mx-auto w-full max-w-3xl px-4 py-10 text-secondary">Loading…</p>}
    >
      <Course params={params} />
    </Suspense>
  );
}

async function Course({ params }: Pick<PageProps<"/portal/courses/[offeringId]">, "params">) {
  await requireRole("student");
  const { offeringId } = await params;
  const offering = isUuid(offeringId) ? await getMyCourse(offeringId) : null;
  if (!offering) notFound();
  const content = await getCourseContent(offering.course.id);

  return (
    <>
      <div className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/portal/courses"
            className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-primary"
          >
            <ChevronLeft className="size-4" aria-hidden />
            My courses
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-primary">
            {offering.course.code}: {offering.course.title}
          </h1>
          <p className="mt-1 text-sm text-secondary">{termLabel(offering.term)}</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <CourseContentView content={content} />
      </div>
    </>
  );
}

export default CoursePage;
