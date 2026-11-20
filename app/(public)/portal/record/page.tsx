import type { Metadata } from "next";
import { Suspense } from "react";

import ApplicationDetails, { detailsOf } from "@/components/applications/ApplicationDetails";
import StudentRecordCard from "@/components/portal/StudentRecordCard";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { getMyApplication } from "@/lib/queries/applications";
import { getMyStudentRecord } from "@/lib/queries/student";

export const metadata: Metadata = { title: "My record", robots: { index: false } };

/** The student's record and the biodata from their application. Read-only. */
function RecordPage() {
  return (
    <>
      <PageHeader eyebrow="Student portal" title="My record">
        <p>
          Your student record and the details from your application. You cannot change them here: to
          correct anything, contact the registrar.
        </p>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading your record…</p>}>
          <Record />
        </Suspense>
      </div>
    </>
  );
}

async function Record() {
  const user = await requireRole("student");
  const [record, application] = await Promise.all([
    getMyStudentRecord(user.id),
    getMyApplication(user.id),
  ]);

  return (
    <>
      {record ? (
        <StudentRecordCard record={record} />
      ) : (
        <p className="rounded-xl border border-border bg-card p-6 text-secondary">
          We could not find your student record. Please contact the registrar.
        </p>
      )}
      {application ? (
        <ApplicationDetails {...detailsOf(application)} />
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
          Your personal details were not entered through an online application. The registrar holds
          them.
        </p>
      )}
    </>
  );
}

export default RecordPage;
