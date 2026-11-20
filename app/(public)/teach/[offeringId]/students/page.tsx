import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";
import { getClassList, getMyOffering } from "@/lib/queries/teach";
import { isUuid } from "@/lib/utils";

// Generic title: student names never go in titles, URLs or analytics.
export const metadata: Metadata = { title: "Class list", robots: { index: false } };

/** The class list: matric number and name only. */
function StudentsPage({ params }: PageProps<"/teach/[offeringId]/students">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<p className="text-secondary">Loading the class…</p>}>
        <ClassList params={params} />
      </Suspense>
    </div>
  );
}

async function ClassList({ params }: Pick<PageProps<"/teach/[offeringId]/students">, "params">) {
  await requireRole("lecturer");
  const { offeringId } = await params;
  const offering = isUuid(offeringId) ? await getMyOffering(offeringId) : null;
  if (!offering) notFound();
  const students = await getClassList(offering.id);

  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
        Nobody is registered on this course yet.
      </p>
    );
  }
  return (
    <>
      <p className="mb-3 text-sm text-secondary tabular-nums">
        {students.length} student{students.length === 1 ? "" : "s"}
      </p>
      <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {students.map((student) => (
          <li key={student.registration_id} className="px-4 py-3 sm:px-5">
            <span className="block font-semibold text-primary">{student.full_name}</span>
            <span className="block text-sm text-secondary tabular-nums">{student.matric_no}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

export default StudentsPage;
