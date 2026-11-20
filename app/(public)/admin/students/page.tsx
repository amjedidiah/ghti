import type { Metadata } from "next";
import { Suspense } from "react";

import StudentSearch from "@/components/admin/StudentSearch";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { getStudentFilters, searchStudents } from "@/lib/queries/admin-students";
import { DEFAULT_STUDENT_SEARCH } from "@/lib/validation/students";

export const metadata: Metadata = { title: "Students", robots: { index: false } };

function StudentsPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Students">
        <p>
          Find a student by name or matric number, or narrow by programme, entry term and status.
        </p>
      </PageHeader>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading students…</p>}>
          <StudentsContent />
        </Suspense>
      </div>
    </>
  );
}

async function StudentsContent() {
  await requireRole("admin");
  const [initial, filters] = await Promise.all([
    searchStudents(DEFAULT_STUDENT_SEARCH),
    getStudentFilters(),
  ]);
  return <StudentSearch initial={initial} programmes={filters.programmes} terms={filters.terms} />;
}

export default StudentsPage;
