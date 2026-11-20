import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import CourseContentEditor from "@/components/content/CourseContentEditor";
import { requireRole } from "@/lib/auth/session";
import { getCourseContent } from "@/lib/queries/content";
import { getMyOffering } from "@/lib/queries/teach";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Course content", robots: { index: false } };

/** The lecturer's lessons and materials for a course they teach. */
function ContentPage({ params }: PageProps<"/teach/[offeringId]/content">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<p className="text-secondary">Loading content…</p>}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: Pick<PageProps<"/teach/[offeringId]/content">, "params">) {
  await requireRole("lecturer");
  const { offeringId } = await params;
  const offering = isUuid(offeringId) ? await getMyOffering(offeringId) : null;
  if (!offering) notFound();
  const content = await getCourseContent(offering.course.id, { withFileIds: true });
  return <CourseContentEditor courseId={offering.course.id} content={content} />;
}

export default ContentPage;
