import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AssignLecturerForm from "@/components/admin/AssignLecturerForm";
import RemoveRegistrationButton from "@/components/admin/RemoveRegistrationButton";
import { Panel } from "@/components/applications/ApplicationDetails";
import { assignLecturer } from "@/lib/admin/academics";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/queries/admin-academics";
import { getOfferingClassList } from "@/lib/queries/admin-registrations";
import { listLecturers } from "@/lib/queries/admin-staff";
import { termLabel } from "@/lib/validation/academics";

// Generic title: student names never go in titles, URLs or analytics.
export const metadata: Metadata = { title: "Class list", robots: { index: false } };

function ClassListPage({ params }: PageProps<"/admin/offerings/[termId]/[offeringId]">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading class list…</p>
      }
    >
      <ClassListContent params={params} />
    </Suspense>
  );
}

async function ClassListContent({
  params,
}: Pick<PageProps<"/admin/offerings/[termId]/[offeringId]">, "params">) {
  await requireRole("admin");
  const { termId, offeringId } = await params;
  const [offering, lecturers] = await Promise.all([
    isUuid(offeringId) ? getOfferingClassList(offeringId) : null,
    listLecturers(),
  ]);
  if (!offering || !offering.term || !offering.course || offering.term.id !== termId) notFound();

  const count = offering.registrations.length;

  return (
    <>
      <AdminPageHeader
        back={{
          href: `/admin/offerings/${termId}`,
          label: `Offerings: ${termLabel(offering.term)}`,
        }}
        title={`${offering.course.code}: ${offering.course.title}`}
      >
        <p>
          {offering.course.programme?.title} · {offering.course.credit_units} credit unit
          {offering.course.credit_units === 1 ? "" : "s"} ·{" "}
          {offering.lecturer?.full_name ? `${offering.lecturer.full_name} · ` : "No lecturer · "}
          <span className="tabular-nums">
            {count} student{count === 1 ? "" : "s"} registered
          </span>
        </p>
      </AdminPageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Panel title="Lecturer">
          <AssignLecturerForm
            action={assignLecturer.bind(null, offering.id)}
            lecturers={lecturers}
            current={offering.lecturer_id}
          />
        </Panel>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/offerings/${termId}/register`}
            className="inline-flex items-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-deep"
          >
            Register students
          </Link>
          <Link
            href={`/admin/grades/${offeringId}`}
            className="inline-flex items-center rounded-md border border-brand bg-card px-4 py-2.5 text-sm font-semibold text-brand hover:bg-muted"
          >
            Enter grades
          </Link>
        </div>

        {count === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
            Nobody is registered on this course yet.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {offering.registrations.map((registration) => {
              const name = registration.student?.profile?.full_name ?? "";
              const matric = registration.student?.matric_no ?? "";
              return (
                <li
                  key={registration.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-primary">{name || matric}</span>
                    <span className="block text-sm text-secondary tabular-nums">
                      {matric}
                      {registration.student && registration.student.status !== "active"
                        ? ` · ${registration.student.status}`
                        : ""}
                    </span>
                  </span>
                  <RemoveRegistrationButton registrationId={registration.id} who={name || matric} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

export default ClassListPage;
