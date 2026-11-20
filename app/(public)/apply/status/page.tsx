import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import SignOutButton from "@/components/auth/SignOutButton";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { applicantName, DOCUMENT_LABELS } from "@/lib/applications/labels";
import { requireRole } from "@/lib/auth/session";
import { formatBytes } from "@/lib/files";
import { LEVEL_LABELS } from "@/lib/programmes";
import { getMyApplication, type MyApplication } from "@/lib/queries/applications";
import { formatPhone } from "@/lib/validation/application";

export const metadata: Metadata = { title: "Application status", robots: { index: false } };

const NEXT_STEPS: Record<MyApplication["status"], string> = {
  draft: "",
  submitted:
    "Thank you. We have received your application and will review it. Check back here for updates.",
  under_review: "Your application is being reviewed. We will let you know the decision here.",
  admitted:
    "Congratulations, you have been offered admission. We will be in touch with the next steps.",
  rejected:
    "We are sorry: we could not offer you admission this time. You are welcome to apply again for a later intake.",
  withdrawn: "This application was withdrawn.",
};

function StatusPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Applicant" title="Application status" />}>
      <StatusContent />
    </Suspense>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "long" });

async function StatusContent() {
  const user = await requireRole("applicant");
  const application = await getMyApplication(user.id);
  if (!application || application.status === "draft") redirect("/apply");

  const name = applicantName(application);

  return (
    <>
      <PageHeader eyebrow="Applicant" title="Your application">
        <StatusBadge status={application.status} />
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="rounded-xl border border-border bg-card p-5 leading-relaxed text-primary shadow-sm">
          {NEXT_STEPS[application.status]}
          {application.decision_note && (
            <span className="mt-3 block text-secondary">{application.decision_note}</span>
          )}
        </p>

        <section
          aria-labelledby="summary-heading"
          className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8"
        >
          <h2 id="summary-heading" className="font-display text-xl font-bold text-primary">
            Summary
          </h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <Item label="Name" value={name} />
            <Item
              label="Programme"
              value={
                application.programme
                  ? `${application.programme.title} (${LEVEL_LABELS[application.programme.level].singular})`
                  : "—"
              }
            />
            <Item
              label="Intake"
              value={
                application.intake
                  ? `${application.intake.name}, ${application.intake.session}`
                  : "—"
              }
            />
            <Item
              label="Submitted"
              value={
                application.submitted_at
                  ? dateFormat.format(new Date(application.submitted_at))
                  : "—"
              }
            />
            <Item label="Email" value={application.email ?? "—"} />
            <Item label="Phone" value={application.phone ? formatPhone(application.phone) : "—"} />
          </dl>
        </section>

        <section
          aria-labelledby="documents-heading"
          className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8"
        >
          <h2 id="documents-heading" className="font-display text-xl font-bold text-primary">
            Documents
          </h2>
          <ul className="mt-4 divide-y divide-border text-sm">
            {application.documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap justify-between gap-2 py-3">
                <span className="font-medium text-primary">{DOCUMENT_LABELS[doc.kind]}</span>
                <span className="text-secondary">
                  {doc.file_name} · {formatBytes(doc.size_bytes)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-secondary">
          <p>Signed in as {user.email}</p>
          <SignOutButton />
        </div>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-primary">{label}</dt>
      <dd className="mt-0.5 break-words text-secondary">{value || "—"}</dd>
    </div>
  );
}

export default StatusPage;
