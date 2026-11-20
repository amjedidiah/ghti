import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ReturnGradesForm from "@/components/admin/ReturnGradesForm";
import GradeSheetForm from "@/components/grades/GradeSheetForm";
import ReturnedNote from "@/components/grades/ReturnedNote";
import { returnGrades, saveGradeSheet } from "@/lib/admin/grades";
import { requireRole } from "@/lib/auth/session";
import { GRADE_SPLIT } from "@/lib/grades";
import { isUuid } from "@/lib/queries/admin-academics";
import { getGradeSheet } from "@/lib/queries/admin-grades";
import { scoreText } from "@/lib/queries/grade-sheet";
import { termLabel } from "@/lib/validation/academics";

// Generic title: student names never go in titles, URLs or analytics.
export const metadata: Metadata = { title: "Grade sheet", robots: { index: false } };

function GradeSheetPage({ params }: PageProps<"/admin/grades/[offeringId]">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading grade sheet…</p>
      }
    >
      <GradeSheetContent params={params} />
    </Suspense>
  );
}

async function GradeSheetContent({
  params,
}: Pick<PageProps<"/admin/grades/[offeringId]">, "params">) {
  await requireRole("admin");
  const { offeringId } = await params;
  const sheet = isUuid(offeringId) ? await getGradeSheet(offeringId) : null;
  if (!sheet || !sheet.term || !sheet.course) notFound();

  const published = sheet.registrations.filter((r) => r.grade?.status === "published").length;
  const submitted = sheet.registrations.filter((r) => r.grade?.status === "submitted").length;

  return (
    <>
      <AdminPageHeader
        back={{
          href: `/admin/grades?term=${sheet.term.id}`,
          label: `Grades: ${termLabel(sheet.term)}`,
        }}
        title={`${sheet.course.code}: ${sheet.course.title}`}
      >
        <p>
          {sheet.course.programme?.title} · {sheet.course.credit_units} credit unit
          {sheet.course.credit_units === 1 ? "" : "s"} ·{" "}
          <span className="tabular-nums">
            {published}/{sheet.registrations.length} published
          </span>
        </p>
        <p>Lecturer: {sheet.lecturer?.full_name ?? "none assigned"}</p>
      </AdminPageHeader>

      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <details className="rounded-xl border border-border bg-card p-4 text-sm text-secondary">
          <summary className="cursor-pointer font-semibold text-primary">
            Grading scale and marks
          </summary>
          <p className="mt-3">
            CA is out of {GRADE_SPLIT.ca} and the exam out of {GRADE_SPLIT.exam} (to be confirmed by
            GHTI). A total gets the highest band it reaches:
          </p>
          {sheet.scale.length === 0 ? (
            <p className="mt-2 font-semibold text-danger">
              No grading scale is set, so no letters can be given. Ask a developer to add it.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {sheet.scale.map((band) => (
                <li key={band.letter} className="rounded-md bg-muted px-2.5 py-1 tabular-nums">
                  <span className="font-bold text-primary">{band.letter}</span> from{" "}
                  {band.min_score} · {band.grade_point.toFixed(2)} pts
                </li>
              ))}
            </ul>
          )}
        </details>

        {submitted > 0 && (
          <section
            aria-labelledby="awaiting-approval"
            className="space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-4 sm:p-5"
          >
            <h2 id="awaiting-approval" className="font-semibold text-primary">
              {submitted} grade{submitted === 1 ? " is" : "s are"} waiting for approval
            </h2>
            <p className="text-sm text-secondary">
              Submitted by the lecturer and marked “Submitted” below. Check them, then press{" "}
              <strong>Save and publish</strong> to show them to students, or return them to the
              lecturer with a note.
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-accent-strong">
                Return them to the lecturer
              </summary>
              <div className="mt-3">
                <ReturnGradesForm
                  action={returnGrades.bind(null, sheet.id)}
                  hasLecturer={Boolean(sheet.lecturer)}
                />
              </div>
            </details>
          </section>
        )}

        {sheet.returned && (
          <ReturnedNote
            returned={sheet.returned}
            audience="admin"
            hasLecturer={Boolean(sheet.lecturer)}
          />
        )}

        {sheet.registrations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
            Nobody is registered on this course yet.{" "}
            <Link
              href={`/admin/offerings/${sheet.term.id}/register`}
              className="font-semibold text-accent-strong"
            >
              Register students
            </Link>
          </p>
        ) : (
          <GradeSheetForm
            key={sheet.id}
            mode="admin"
            action={saveGradeSheet.bind(null, sheet.id)}
            split={GRADE_SPLIT}
            scale={sheet.scale}
            rows={sheet.registrations.map((registration) => ({
              registrationId: registration.id,
              name: registration.student?.profile?.full_name ?? "",
              matric: registration.student?.matric_no ?? "",
              ca: scoreText(registration.grade?.ca_score),
              exam: scoreText(registration.grade?.exam_score),
              status: registration.grade?.status ?? null,
            }))}
          />
        )}
      </div>
    </>
  );
}

export default GradeSheetPage;
