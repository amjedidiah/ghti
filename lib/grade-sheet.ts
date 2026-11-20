import { GRADE_SPLIT, parseScore } from "@/lib/grades";

// Saving a grade sheet (steps 2.3 and 3.3): from the current grades and what
// was typed, work out what to insert, update, delete and change. Pure, tested
// in grade-sheet.test.ts; the database still checks everything.
//
// Two modes share the sheet:
// - admin: "finalise" publishes complete grades; every row can be edited,
//   and a change to a published grade needs a reason.
// - lecturer: "finalise" submits complete grades for approval; only empty
//   and draft rows can be edited (submitted and published ones are locked).

export type GradeStatus = "draft" | "submitted" | "published";
export type SheetMode = "admin" | "lecturer";

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
  /** Changes to published grades: need a reason (change_published_grade). Admin only. */
  publishedChanges: { id: string; ca_score: number; exam_score: number }[];
  /** Rows this save newly publishes (admin) or submits for approval (lecturer). */
  newlyFinal: number;
  /** Rows that were to be published or submitted but still miss a score. */
  incomplete: number;
};

/** The status "finalise" moves complete grades to. */
export const FINAL_STATUS: Record<SheetMode, GradeStatus> = {
  admin: "published",
  lecturer: "submitted",
};

/** Whether a row can be edited in this mode. Lecturers change only drafts. */
export function isLocked(mode: SheetMode, status: GradeStatus | null): boolean {
  return mode === "lecturer" && (status === "submitted" || status === "published");
}

export function planGradeSheet(
  rows: readonly CurrentRow[],
  typed: ReadonlyMap<string, TypedScores>,
  { mode, finalise, reason }: { mode: SheetMode; finalise: boolean; reason: string },
): SheetPlan {
  const plan: SheetPlan = {
    errors: {},
    inserts: [],
    updates: [],
    deletes: [],
    publishedChanges: [],
    newlyFinal: 0,
    incomplete: 0,
  };
  const finalStatus = FINAL_STATUS[mode];

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
      const status: GradeStatus = finalise && complete ? finalStatus : "draft";
      plan.inserts.push({
        registration_id: row.registrationId,
        ca_score: ca,
        exam_score: exam,
        status,
      });
      if (status === finalStatus) plan.newlyFinal += 1;
      else if (finalise) plan.incomplete += 1;
      continue;
    }

    const changed = ca !== grade.ca || exam !== grade.exam;

    if (isLocked(mode, grade.status)) {
      if (changed) {
        plan.errors[`ca:${row.registrationId}`] =
          grade.status === "published"
            ? "Published: only the office can change it"
            : "Submitted for approval: only the office can change it";
      }
      continue;
    }

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
    // A submitted grade an admin edits stays submitted unless it is published,
    // or goes back to draft if it loses a score (submitted grades are complete).
    const status: GradeStatus =
      finalise && complete
        ? finalStatus
        : grade.status === "submitted" && !complete
          ? "draft"
          : grade.status;
    if (changed || status !== grade.status) {
      plan.updates.push({ id: grade.id, ca_score: ca, exam_score: exam, status });
    }
    if (status === finalStatus && grade.status !== finalStatus) plan.newlyFinal += 1;
    else if (finalise && !complete) plan.incomplete += 1;
  }

  if (plan.publishedChanges.length > 0 && reason.trim() === "") {
    plan.errors.reason = "Say why you are changing published grades. The reason is kept on record.";
  }
  return plan;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** "Saved 3 grades. Published 2. 1 still misses a score and stays a draft." */
export function describeSheetSave(plan: SheetPlan, mode: SheetMode, finalise: boolean): string {
  const saved =
    plan.inserts.length + plan.updates.length + plan.deletes.length + plan.publishedChanges.length;
  if (saved === 0) return "No changes to save.";
  const parts = [`Saved ${saved} grade${plural(saved, "", "s")}.`];
  if (finalise) {
    if (mode === "admin") {
      parts.push(plan.newlyFinal > 0 ? `Published ${plan.newlyFinal}.` : "Nothing new to publish.");
    } else {
      parts.push(
        plan.newlyFinal > 0
          ? `Submitted ${plan.newlyFinal} for approval.`
          : "Nothing new to submit.",
      );
    }
    if (plan.incomplete > 0) {
      parts.push(
        `${plan.incomplete} still ${plural(plan.incomplete, "misses", "miss")} a score and ${plural(plan.incomplete, "stays", "stay")} a draft.`,
      );
    }
  }
  if (plan.publishedChanges.length > 0) {
    parts.push(
      `${plan.publishedChanges.length} published grade${plural(plan.publishedChanges.length, " was", "s were")} changed and logged.`,
    );
  }
  return parts.join(" ");
}

/**
 * The latest "returned to lecturer" note while it still applies: until the
 * lecturer submits again (or an admin publishes) after it. Grades untouched
 * since before the return do not count.
 */
export function pendingReturn<T extends { returnedAt: string }>(
  latest: T | null,
  grades: readonly { status: GradeStatus; updatedAt: string }[],
): T | null {
  if (!latest) return null;
  const returnedAt = Date.parse(latest.returnedAt);
  const actedOn = grades.some(
    (grade) => grade.status !== "draft" && Date.parse(grade.updatedAt) > returnedAt,
  );
  return actedOn ? null : latest;
}
