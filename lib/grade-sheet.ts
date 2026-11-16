import { GRADE_SPLIT, parseScore } from "@/lib/grades";

// Saving a grade sheet (Stage 2, step 2.3): from the current grades and what
// the admin typed, work out what to insert, update, delete and change. Pure,
// tested in grade-sheet.test.ts; the database still checks everything.

export type GradeStatus = "draft" | "submitted" | "published";

export type CurrentRow = {
  registrationId: string;
  grade: { id: string; ca: number | null; exam: number | null; status: GradeStatus } | null;
};

export type TypedScores = { ca: string; exam: string };

export type SheetPlan = {
  /** Field errors keyed `ca:<registrationId>`, `exam:<registrationId>` or `reason`. */
  errors: Record<string, string>;
  inserts: {
    registration_id: string;
    ca_score: number | null;
    exam_score: number | null;
    status: GradeStatus;
  }[];
  updates: {
    id: string;
    ca_score: number | null;
    exam_score: number | null;
    status: GradeStatus;
  }[];
  deletes: string[];
  /** Changes to published grades: need a reason (change_published_grade). */
  publishedChanges: { id: string; ca_score: number; exam_score: number }[];
  /** Rows that end up published by this save (newly). */
  newlyPublished: number;
  /** Rows the admin asked to publish but which still miss a score. */
  incomplete: number;
};

export function planGradeSheet(
  rows: readonly CurrentRow[],
  typed: ReadonlyMap<string, TypedScores>,
  { publish, reason }: { publish: boolean; reason: string },
): SheetPlan {
  const plan: SheetPlan = {
    errors: {},
    inserts: [],
    updates: [],
    deletes: [],
    publishedChanges: [],
    newlyPublished: 0,
    incomplete: 0,
  };

  for (const row of rows) {
    const input = typed.get(row.registrationId);
    if (!input) continue;
    const ca = parseScore(input.ca, GRADE_SPLIT.ca);
    const exam = parseScore(input.exam, GRADE_SPLIT.exam);
    if (ca === undefined) {
      plan.errors[`ca:${row.registrationId}`] = `0 to ${GRADE_SPLIT.ca}, up to 2 decimals`;
    }
    if (exam === undefined) {
      plan.errors[`exam:${row.registrationId}`] = `0 to ${GRADE_SPLIT.exam}, up to 2 decimals`;
    }
    if (ca === undefined || exam === undefined) continue;

    const complete = ca !== null && exam !== null;
    const empty = ca === null && exam === null;
    const grade = row.grade;

    if (!grade) {
      if (empty) continue;
      const status: GradeStatus = publish && complete ? "published" : "draft";
      plan.inserts.push({
        registration_id: row.registrationId,
        ca_score: ca,
        exam_score: exam,
        status,
      });
      if (status === "published") plan.newlyPublished += 1;
      else if (publish) plan.incomplete += 1;
      continue;
    }

    const changed = ca !== grade.ca || exam !== grade.exam;

    if (grade.status === "published") {
      if (!changed) continue;
      if (!complete || ca === null || exam === null) {
        plan.errors[`ca:${row.registrationId}`] = "A published grade needs both scores";
        continue;
      }
      plan.publishedChanges.push({ id: grade.id, ca_score: ca, exam_score: exam });
      continue;
    }

    if (empty) {
      plan.deletes.push(grade.id);
      continue;
    }
    const status: GradeStatus = publish && complete ? "published" : grade.status;
    if (changed || status !== grade.status) {
      plan.updates.push({ id: grade.id, ca_score: ca, exam_score: exam, status });
    }
    if (status === "published") plan.newlyPublished += 1;
    else if (publish) plan.incomplete += 1;
  }

  if (plan.publishedChanges.length > 0 && reason.trim() === "") {
    plan.errors.reason = "Say why you are changing published grades. The reason is kept on record.";
  }
  return plan;
}

/** "Saved 3 grades. Published 2; 1 still misses a score and stays a draft." */
export function describeSheetSave(plan: SheetPlan, publish: boolean): string {
  const saved =
    plan.inserts.length + plan.updates.length + plan.deletes.length + plan.publishedChanges.length;
  if (saved === 0) return "No changes to save.";
  const parts = [`Saved ${saved} grade${saved === 1 ? "" : "s"}.`];
  if (publish) {
    parts.push(
      plan.newlyPublished > 0 ? `Published ${plan.newlyPublished}.` : "Nothing new to publish.",
    );
    if (plan.incomplete > 0) {
      parts.push(
        `${plan.incomplete} still miss${plan.incomplete === 1 ? "es" : ""} a score and stay${plan.incomplete === 1 ? "s" : ""} a draft.`,
      );
    }
  }
  if (plan.publishedChanges.length > 0) {
    parts.push(
      `${plan.publishedChanges.length} published grade${plan.publishedChanges.length === 1 ? " was" : "s were"} changed and logged.`,
    );
  }
  return parts.join(" ");
}
