import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import CourseForm from "@/components/admin/CourseForm";
import DeleteCourseButton from "@/components/admin/DeleteCourseButton";
import { updateCourse } from "@/lib/admin/academics";
import { requireRole } from "@/lib/auth/session";
import { getCourseForAdmin, isUuid } from "@/lib/queries/admin-academics";
import { courseRowValues } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Course", robots: { index: false } };

function CoursePage({ params }: PageProps<"/admin/academics/courses/[id]">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading course…</p>
      }
    >
      <CourseContent params={params} />
    </Suspense>
  );
}

async function CourseContent({
  params,
}: Pick<PageProps<"/admin/academics/courses/[id]">, "params">) {
  await requireRole("admin");
  const { id } = await params;
  const course = isUuid(id) ? await getCourseForAdmin(id) : null;
  if (!course || !course.programme) notFound();

  return (
    <>
      <AdminPageHeader
        back={{
          href: `/admin/academics/programmes/${course.programme.id}`,
          label: course.programme.title,
        }}
        title={`${course.code}: ${course.title}`}
      >
        <p>
          Year {course.year}, semester {course.semester} · {course.credit_units} credit unit
          {course.credit_units === 1 ? "" : "s"}
        </p>
      </AdminPageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <CourseForm
          key={course.id}
          action={updateCourse.bind(null, course.id)}
          defaultValues={courseRowValues(course)}
          submitLabel="Save changes"
        />

        <section aria-labelledby="delete-heading" className="border-t border-border pt-8">
          <h2 id="delete-heading" className="font-display text-xl font-bold text-primary">
            Delete this course
          </h2>
          {course.offeringCount > 0 ? (
            <p className="mt-2 max-w-prose text-secondary">
              This course has been offered in {course.offeringCount} term
              {course.offeringCount === 1 ? "" : "s"}, so it cannot be deleted: its history must
              stay on students&rsquo; records. You can still correct its details above.
            </p>
          ) : (
            <>
              <p className="mt-2 max-w-prose text-secondary">
                Only for courses added by mistake. It has never been offered in a term.
              </p>
              <div className="mt-4">
                <DeleteCourseButton courseId={course.id} code={course.code} />
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

export default CoursePage;
