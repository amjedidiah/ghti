import { Download } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import Field from "@/components/forms/Field";
import Select from "@/components/forms/Select";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { getRecentExports } from "@/lib/queries/admin-exports";
import { getStudentFilters } from "@/lib/queries/admin-students";
import { STUDENT_STATUS_LABELS, STUDENT_STATUSES } from "@/lib/validation/students";

export const metadata: Metadata = { title: "Exports", robots: { index: false } };

const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const APPLICATION_STATUS_OPTIONS = [
  ["submitted", "Submitted"],
  ["under_review", "Under review"],
  ["admitted", "Admitted"],
  ["rejected", "Not admitted"],
  ["withdrawn", "Withdrawn"],
  ["draft", "Draft"],
] as const;

const KIND_LABELS = { applications: "Applications", students: "Students", results: "Results" };

function ExportsPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Exports">
        <p>
          Download applications, students or results as a spreadsheet (CSV). These files hold
          personal data: every download is recorded below with your name. Keep the files safe and
          delete them when you no longer need them.
        </p>
      </PageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading…</p>}>
          <ExportsContent />
        </Suspense>
      </div>
    </>
  );
}

async function ExportsContent() {
  await requireRole("admin");
  const [filters, recent] = await Promise.all([getStudentFilters(), getRecentExports()]);
  const termLabels = new Map(filters.terms.map((term) => [term.id, term.label]));
  const programmeLabels = new Map(filters.programmes.map((p) => [p.id, p.label]));

  function describe(kind: keyof typeof KIND_LABELS, raw: unknown): string {
    const f = (raw ?? {}) as Record<string, unknown>;
    if (kind === "results") {
      const term = termLabels.get(String(f.termId)) ?? "a term";
      return `${term}${f.includeDrafts ? ", drafts included" : ", published only"}`;
    }
    const parts: string[] = [];
    if (typeof f.status === "string") parts.push(f.status.replace("_", " "));
    if (typeof f.programmeId === "string") parts.push(programmeLabels.get(f.programmeId) ?? "");
    return parts.filter(Boolean).join(", ") || "all";
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <ExportCard
          kind="applications"
          title="Applications"
          text="Every answer on the form, with status and dates. One row per application."
        >
          <Field id="applications-status" label="Status">
            <Select id="applications-status" name="status" defaultValue="">
              <option value="">All applications</option>
              {APPLICATION_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </ExportCard>

        <ExportCard
          kind="students"
          title="Students"
          text="Matric number, name, programme, entry term, status and contact details."
        >
          <Field id="students-programme" label="Programme">
            <Select id="students-programme" name="programmeId" defaultValue="">
              <option value="">All programmes</option>
              {filters.programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="students-status" label="Status">
            <Select id="students-status" name="status" defaultValue="">
              <option value="">Any status</option>
              {STUDENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STUDENT_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
        </ExportCard>

        <ExportCard
          kind="results"
          title="Results"
          text="One row per student and course for a term: CA, exam, total, grade and status."
        >
          <Field id="results-term" label="Term">
            <Select id="results-term" name="termId" required defaultValue={filters.terms[0]?.id}>
              {filters.terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-start gap-3 text-sm text-primary">
            <input
              type="checkbox"
              name="includeDrafts"
              value="1"
              className="mt-0.5 size-4 accent-(--brand)"
            />
            <span>
              Include grades not yet published
              <span className="block text-secondary">Students cannot see these yet.</span>
            </span>
          </label>
        </ExportCard>
      </div>

      <section aria-labelledby="log-heading">
        <h2 id="log-heading" className="font-display text-xl font-bold text-primary">
          Recent exports
        </h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-secondary">No exports yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-5"
              >
                <span className="min-w-0">
                  <span className="font-semibold text-primary">{KIND_LABELS[entry.kind]}</span>
                  <span className="text-secondary">
                    {" "}
                    ({describe(entry.kind, entry.filters)}) · {entry.row_count} row
                    {entry.row_count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="text-secondary">
                  {entry.exporter?.full_name || "Unknown"} ·{" "}
                  <time dateTime={entry.exported_at}>
                    {dateTimeFormat.format(new Date(entry.exported_at))}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ExportCard({
  kind,
  title,
  text,
  children,
}: {
  kind: keyof typeof KIND_LABELS;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <form
      method="get"
      action={`/admin/exports/${kind}`}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div>
        <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
        <p className="mt-1 text-sm text-secondary">{text}</p>
      </div>
      {children}
      <button
        type="submit"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 font-semibold text-on-brand hover:bg-brand-deep"
      >
        <Download className="size-4" aria-hidden />
        Download CSV
      </button>
    </form>
  );
}

export default ExportsPage;
