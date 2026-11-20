import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import GradeSheetForm from "@/components/grades/GradeSheetForm";
import ReturnedNote from "@/components/grades/ReturnedNote";
import { requireRole } from "@/lib/auth/session";
import { GRADE_SPLIT } from "@/lib/grades";
import { getMyGradeSheet, getMyOffering } from "@/lib/queries/teach";
import { saveMyGradeSheet } from "@/lib/teach/grades";
import { isUuid } from "@/lib/utils";

// Generic title: student names never go in titles, URLs or analytics.
export const metadata: Metadata = { title: "Grades", robots: { index: false } };

/** The lecturer's grade sheet: save drafts, then submit for approval. */
function TeachGradesPage({ params }: PageProps<"/teach/[offeringId]/grades">) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<p className="text-secondary">Loading the grade sheet…</p>}>
        <Sheet params={params} />
      </Suspense>
    </div>
  );
}

async function Sheet({ params }: Pick<PageProps<"/teach/[offeringId]/grades">, "params">) {
  await requireRole("lecturer");
  const { offeringId } = await params;
  const offering = isUuid(offeringId) ? await getMyOffering(offeringId) : null;
  if (!offering) notFound();
  const sheet = await getMyGradeSheet(offering.id);

  const count = (status: string) => sheet.rows.filter((row) => row.status === status).length;
  const [submitted, published] = [count("submitted"), count("published")];

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-secondary">
        <p>
          Enter CA (out of {GRADE_SPLIT.ca}) and exam (out of {GRADE_SPLIT.exam}) scores. Save a
          draft as often as you like; when a student&apos;s scores are complete, submit them for
          approval. The office publishes them to students.
        </p>
        {sheet.rows.length > 0 && (
          <p className="text-sm tabular-nums">
            {submitted} of {sheet.rows.length} waiting for approval · {published} published
          </p>
        )}
      </div>

      {sheet.returned && <ReturnedNote returned={sheet.returned} audience="lecturer" />}

      {sheet.scale.length === 0 && (
        <p className="rounded-xl border border-danger/40 bg-card p-4 text-sm font-semibold text-danger">
          No grading scale is set yet, so letters cannot be shown. Tell the office.
        </p>
      )}

      {sheet.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
          Nobody is registered on this course yet, so there is nothing to grade.
        </p>
      ) : (
        <GradeSheetForm
          key={offering.id}
          mode="lecturer"
          action={saveMyGradeSheet.bind(null, offering.id)}
          split={GRADE_SPLIT}
          scale={sheet.scale}
          rows={sheet.rows.map(({ registrationId, name, matric, ca, exam, status }) => ({
            registrationId,
            name,
            matric,
            ca,
            exam,
            status,
          }))}
        />
      )}
    </div>
  );
}

export default TeachGradesPage;
