import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import CourseContentEditor from "@/components/content/CourseContentEditor";
import { requireRole } from "@/lib/auth/session";
import { getOfferingClassList } from "@/lib/queries/admin-registrations";
import { getCourseContent } from "@/lib/queries/content";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Course content", robots: { index: false } };

/** Admins edit a course's content too, e.g. while no lecturer is assigned. */
function AdminContentPage({ params }: PageProps<"/admin/offerings/[termId]/[offeringId]/content">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading content…</p>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}

async function Content({
  params,
}: Pick<PageProps<"/admin/offerings/[termId]/[offeringId]/content">, "params">) {
  await requireRole("admin");
  const { termId, offeringId } = await params;
  const offering = isUuid(offeringId) ? await getOfferingClassList(offeringId) : null;
  if (!offering?.course || offering.term?.id !== termId) notFound();
  const content = await getCourseContent(offering.course_id, { withFileIds: true });

  return (
    <>
      <AdminPageHeader
        back={{ href: `/admin/offerings/${termId}/${offeringId}`, label: "Class list" }}
        title={`${offering.course.code}: content`}
      >
        <p>
          Lessons and materials belong to the course, so they carry over to every term.
          {offering.lecturer?.full_name
            ? ` ${offering.lecturer.full_name} teaches it this term and can edit them too.`
            : " No lecturer is assigned this term."}
        </p>
      </AdminPageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <CourseContentEditor courseId={offering.course_id} content={content} />
      </div>
    </>
  );
}

export default AdminContentPage;
