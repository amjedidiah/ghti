import type { Metadata } from "next";
import { Suspense } from "react";

import SignOutButton from "@/components/auth/SignOutButton";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { LEVEL_LABELS } from "@/lib/programmes";
import { getMyStudentRecord } from "@/lib/queries/student";
import { termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Student portal", robots: { index: false } };

const STATUS_LABELS = {
  active: "Active",
  deferred: "Deferred",
  withdrawn: "Withdrawn",
  graduated: "Graduated",
} as const;

/** Student portal home (Stage 2). Courses, results and history arrive in step 2.4. */
function PortalPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Student portal" title="Welcome" />}>
      <PortalContent />
    </Suspense>
  );
}

async function PortalContent() {
  const user = await requireRole("student");
  const record = await getMyStudentRecord(user.id);
  const firstName = user.fullName.split(/\s+/)[0];

  return (
    <>
      <PageHeader eyebrow="Student portal" title={firstName ? `Welcome, ${firstName}` : "Welcome"}>
        <p>Your student record at a glance. Your courses and results will appear here.</p>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {record ? (
          <section
            aria-labelledby="record-heading"
            className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            <h2 id="record-heading" className="font-display text-xl font-bold text-primary">
              Your record
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Item label="Matric number" value={record.matric_no} strong />
              <Item label="Status" value={STATUS_LABELS[record.status]} />
              <Item
                label="Programme"
                value={
                  record.programme
                    ? `${record.programme.title} (${LEVEL_LABELS[record.programme.level].singular})`
                    : "Ask the registrar"
                }
              />
              <Item
                label="Entry term"
                value={record.entry_term ? termLabel(record.entry_term) : "Ask the registrar"}
              />
            </dl>
          </section>
        ) : (
          <p className="rounded-xl border border-border bg-card p-6 text-secondary">
            We could not find your student record. Please contact the registrar.
          </p>
        )}

        <p className="text-sm text-secondary">
          Something wrong in your record? Contact the registrar to have it corrected.
        </p>

        <SignOutButton />
      </div>
    </>
  );
}

function Item({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-sm font-semibold text-secondary">{label}</dt>
      <dd
        className={
          strong
            ? "mt-1 text-2xl font-bold tracking-tight break-all text-primary lining-nums tabular-nums"
            : "mt-1 text-primary"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default PortalPage;
