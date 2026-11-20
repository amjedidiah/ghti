import "server-only";

import { revalidatePath } from "next/cache";

import {
  describeSheetSave,
  planGradeSheet,
  type SheetMode,
  type SheetPlan,
  type TypedScores,
} from "@/lib/grade-sheet";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";

// The one grade sheet save, for admins (/admin/grades) and lecturers
// (/teach/…/grades). The caller checks the role first; this re-reads the
// sheet through RLS, plans the save (lib/grade-sheet.ts) and applies it. The
// database triggers work out letters, guard published grades and log changes.

const GENERIC = "Something went wrong. Please try again.";
const CHANGED = "Some grades changed while you were working. Refresh the page and check them.";

const DENIED: Record<SheetMode, string> = {
  admin: "Only admins can do this, and published grades change only with a reason.",
  lecturer: "You can change only draft grades for courses you teach. Refresh the page.",
};

function failure(mode: SheetMode, code: string | undefined, saved: boolean): FormState {
  const reason =
    code === "42501"
      ? DENIED[mode]
      : code === "23514"
        ? "A score is out of range, or a grade to submit or publish misses a score."
        : code === "23505"
          ? CHANGED
          : GENERIC;
  return { status: "error", message: saved ? `Some grades were saved. Then: ${reason}` : reason };
}

function refresh() {
  revalidatePath("/admin/grades", "layout");
  revalidatePath("/teach", "layout");
}

export type SheetSaveResult = { state: FormState; plan: SheetPlan | null };

/** Save a grade sheet; with intent "finalise", also publish (admin) or submit (lecturer). */
export async function saveGradeSheetAs(
  mode: SheetMode,
  offeringId: string,
  formData: FormData,
): Promise<SheetSaveResult> {
  const finalise = formData.get("intent") === "finalise";
  const reason = mode === "admin" ? String(formData.get("reason") ?? "").slice(0, 500) : "";

  const supabase = await createClient();
  const { data: registrations, error: readError } = await supabase
    .from("registrations")
    .select("id, grade:grades(id, ca_score, exam_score, status)")
    .eq("offering_id", offeringId);
  if (readError) return { state: { status: "error", message: GENERIC }, plan: null };

  const rows = registrations.map((registration) => ({
    registrationId: registration.id,
    grade: registration.grade
      ? {
          id: registration.grade.id,
          ca: registration.grade.ca_score === null ? null : Number(registration.grade.ca_score),
          exam:
            registration.grade.exam_score === null ? null : Number(registration.grade.exam_score),
          status: registration.grade.status,
        }
      : null,
  }));

  const typed = new Map<string, TypedScores>();
  for (const row of rows) {
    const ca = formData.get(`ca:${row.registrationId}`);
    const exam = formData.get(`exam:${row.registrationId}`);
    if (typeof ca === "string" && typeof exam === "string") {
      typed.set(row.registrationId, { ca, exam });
    }
  }

  const plan = planGradeSheet(rows, typed, { mode, finalise, reason });
  if (Object.keys(plan.errors).length > 0) {
    return {
      state: {
        status: "error",
        message: "Please fix the highlighted scores.",
        fieldErrors: Object.fromEntries(
          Object.entries(plan.errors).map(([field, message]) => [field, [message]]),
        ),
      },
      plan: null,
    };
  }

  if (plan.inserts.length > 0) {
    const { error } = await supabase.from("grades").insert(plan.inserts);
    if (error) return { state: failure(mode, error.code, false), plan: null };
  }

  // RLS turns an update the user may no longer make (say, a grade published
  // meanwhile) into zero rows, so count them.
  const updates = await Promise.all(
    plan.updates.map(({ id, ...values }) =>
      supabase.from("grades").update(values).eq("id", id).select("id"),
    ),
  );
  const updateError = updates.find((result) => result.error)?.error;
  const missed = updates.some((result) => !result.error && result.data.length === 0);
  if (updateError || missed) {
    refresh();
    return {
      state: updateError
        ? failure(mode, updateError.code, true)
        : { status: "error", message: CHANGED },
      plan: null,
    };
  }

  if (plan.deletes.length > 0) {
    const { error } = await supabase.from("grades").delete().in("id", plan.deletes);
    if (error) {
      refresh();
      return { state: failure(mode, error.code, true), plan: null };
    }
  }

  for (const change of plan.publishedChanges) {
    const { error } = await supabase.rpc("change_published_grade", {
      p_grade_id: change.id,
      p_ca_score: change.ca_score,
      p_exam_score: change.exam_score,
      p_status: "published",
      p_reason: reason,
    });
    if (error) {
      refresh();
      return { state: failure(mode, error.code, true), plan: null };
    }
  }

  refresh();
  return {
    state: { status: "success", message: describeSheetSave(plan, mode, finalise) },
    plan,
  };
}
