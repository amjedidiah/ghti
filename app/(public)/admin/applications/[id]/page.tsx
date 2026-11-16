import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";

import DocumentViewer from "@/components/admin/DocumentViewer";
import EnrolPanel from "@/components/admin/EnrolPanel";
import ReviewPanel from "@/components/admin/ReviewPanel";
import { enrolStudent } from "@/lib/admin/actions";
import StatusBadge from "@/components/shared/StatusBadge";
import { applicantName } from "@/lib/applications/labels";
import { rowToValues } from "@/lib/applications/mapping";
import { requireRole } from "@/lib/auth/session";
import { LEVEL_LABELS } from "@/lib/programmes";
import { listTermsForAdmin } from "@/lib/queries/admin-academics";
import {
  getApplicationForReview,
  type ApplicationForReview,
} from "@/lib/queries/admin-applications";
import { termLabel } from "@/lib/validation/academics";
import { formatPhone } from "@/lib/validation/application";

// Generic title on purpose: applicant names never go in titles, URLs or analytics.
export const metadata: Metadata = { title: "Review application", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "long" });
const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function ReviewPage({ params }: PageProps<"/admin/applications/[id]">) {
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-7xl px-4 py-10 text-secondary">Loading application…</p>}
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="space-y-6 lg:col-span-3">
          <Details application={application} />
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

function Details({ application }: { application: ApplicationForReview }) {
  const values = rowToValues(application);
  const phone = (value: string) => (value ? formatPhone(value) : "");

  return (
    <>
      <Panel title="Programme">
        <Rows
          rows={[
            [
              "Programme",
              application.programme
                ? `${application.programme.title} (${LEVEL_LABELS[application.programme.level].singular})`
                : "",
            ],
            [
              "Intake",
              application.intake ? `${application.intake.name}, ${application.intake.session}` : "",
            ],
          ]}
        />
      </Panel>

      <Panel title="Personal details">
        <Rows
          rows={[
            ["Surname", values.surname],
            ["First name", values.firstName],
            ["Other names", values.otherNames],
            [
              "Date of birth",
              values.dateOfBirth ? dateFormat.format(new Date(values.dateOfBirth)) : "",
            ],
            [
              "Gender",
              values.gender === "female" ? "Female" : values.gender === "male" ? "Male" : "",
            ],
            ["Phone", phone(values.phone)],
            ["Email", values.email],
            ["Address", values.address],
            ["State of origin", values.stateOfOrigin],
            ["Nationality", values.nationality],
            ["CRM branch or church", values.crmBranch],
          ]}
        />
      </Panel>

      <Panel title="Education">
        {values.education.length === 0 ? (
          <p className="text-sm text-secondary">None given.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {values.education.map((entry, index) => (
              <li key={index} className="py-2">
                <p className="font-semibold text-primary">{entry.institution}</p>
                <p className="text-secondary">
                  {entry.qualification}
                  {entry.year && `, ${entry.year}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Next of kin and referee">
        <Rows
          rows={[
            ["Next of kin", values.nextOfKinName],
            ["Relationship", values.nextOfKinRelationship],
            ["Next of kin's phone", phone(values.nextOfKinPhone)],
            ["Referee", values.refereeName],
            ["Referee's position", values.refereePosition],
            ["Referee's phone", phone(values.refereePhone)],
            ["Referee's email", values.refereeEmail],
          ]}
        />
      </Panel>

      <Panel title="Declaration">
        <p className="text-sm text-secondary">
          {application.consent_given_at
            ? `Consent given ${dateTimeFormat.format(new Date(application.consent_given_at))}.`
            : "Consent not given yet."}
        </p>
      </Panel>
    </>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-semibold text-primary">{label}</dt>
          <dd className="mt-0.5 break-words whitespace-pre-line text-secondary">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default ReviewPage;
