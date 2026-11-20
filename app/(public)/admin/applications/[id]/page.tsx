import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import DocumentViewer from "@/components/admin/DocumentViewer";
import ApplicationDetails, {
  detailsOf,
  Panel,
  Rows,
} from "@/components/applications/ApplicationDetails";
import EnrolPanel from "@/components/admin/EnrolPanel";
import ReviewPanel from "@/components/admin/ReviewPanel";
import { enrolStudent } from "@/lib/admin/actions";
import StatusBadge from "@/components/shared/StatusBadge";
import { applicantName } from "@/lib/applications/labels";
import { requireRole } from "@/lib/auth/session";
import { listTermsForAdmin } from "@/lib/queries/admin-academics";
import {
  getApplicationForReview,
  type ApplicationForReview,
} from "@/lib/queries/admin-applications";
import { termLabel } from "@/lib/validation/academics";

// Generic title on purpose: applicant names never go in titles, URLs or analytics.
export const metadata: Metadata = { title: "Review application", robots: { index: false } };

const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function ReviewPage({ params }: PageProps<"/admin/applications/[id]">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading application…</p>
      }
    >
      <ReviewContent params={params} />
    </Suspense>
  );
}

async function ReviewContent({ params }: Pick<PageProps<"/admin/applications/[id]">, "params">) {
  await requireRole("admin");
  const { id } = await params;
  const application = /^[0-9a-f-]{36}$/.test(id) ? await getApplicationForReview(id) : null;
  if (!application) notFound();

  const name = applicantName(application) || "(no name yet)";

  return (
    <>
      <div className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/admin/applications"
            className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-primary"
          >
            <ChevronLeft className="size-4" aria-hidden />
            All applications
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary">{name}</h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="mt-2 text-sm text-secondary">
            {application.submitted_at
              ? `Submitted ${dateTimeFormat.format(new Date(application.submitted_at))}`
              : "Not submitted yet"}
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="space-y-6 lg:col-span-3">
          <ApplicationDetails {...detailsOf(application)} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Panel title="Documents">
            <DocumentViewer documents={application.documents} />
          </Panel>
          <Panel title="Decision">
            <Decision application={application} />
          </Panel>
          {application.status === "admitted" && (
            <Panel title="Student record">
              <StudentRecord application={application} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

/** After admission: the student record, or the form that creates it. */
async function StudentRecord({ application }: { application: ApplicationForReview }) {
  const student = application.student;
  if (student) {
    return (
      <Rows
        rows={[
          ["Matric number", student.matric_no],
          ["Entry term", student.entry_term ? termLabel(student.entry_term) : ""],
          ["Status", student.status.charAt(0).toUpperCase() + student.status.slice(1)],
          ["Enrolled", dateTimeFormat.format(new Date(student.created_at))],
        ]}
      />
    );
  }
  const terms = await listTermsForAdmin();
  return (
    <EnrolPanel
      action={enrolStudent.bind(null, application.id)}
      terms={terms.map((term) => ({ id: term.id, label: termLabel(term) }))}
      intakeTermId={application.intake_term_id}
    />
  );
}

function Decision({ application }: { application: ApplicationForReview }) {
  if (application.status === "submitted" || application.status === "under_review") {
    return <ReviewPanel applicationId={application.id} status={application.status} />;
  }
  if (application.status === "draft") {
    return (
      <p className="text-sm text-secondary">
        The applicant has not submitted this application yet.
      </p>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <StatusBadge status={application.status} />
      <p className="text-secondary">
        {application.reviewer?.full_name ? `By ${application.reviewer.full_name}` : "Decided"}
        {application.decided_at && ` on ${dateTimeFormat.format(new Date(application.decided_at))}`}
      </p>
      {application.decision_note && (
        <blockquote className="border-l-4 border-border pl-3 text-primary">
          {application.decision_note}
        </blockquote>
      )}
    </div>
  );
}

export default ReviewPage;
