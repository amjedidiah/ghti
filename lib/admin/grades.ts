"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { describeSheetSave, planGradeSheet, type TypedScores } from "@/lib/grade-sheet";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";

// Grade entry (Stage 2, step 2.3). The action re-checks the role and re-reads
// the sheet from the database; the database triggers work out letters, guard
// published grades and log every change to them.

const id = z.guid();
const GENERIC = "Something went wrong. Please try again.";

function failure(code: string | undefined, saved: string): FormState {
  const reason =
    code === "42501"
      ? "Only admins can do this, and published grades change only with a reason."
      : code === "23514"
        ? "A score is out of range, or a grade to publish misses a score."
        : GENERIC;
  return { status: "error", message: saved ? `${saved} Then: ${reason}` : reason };
}

/** Save a whole grade sheet; with intent "publish", also publish every complete grade. */
export async function saveGradeSheet(
  offeringId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(offeringId).success) {
    return { status: "error", message: "Unknown course. Refresh the page." };
  }
  const publish = formData.get("intent") === "publish";
  const reason = String(formData.get("reason") ?? "").slice(0, 500);

  const supabase = await createClient();
  const { data: registrations, error: readError } = await supabase
    .from("registrations")
    .select("id, grade:grades(id, ca_score, exam_score, status)")
    .eq("offering_id", offeringId);
  if (readError) return { status: "error", message: GENERIC };

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

  const plan = planGradeSheet(rows, typed, { publish, reason });
  if (Object.keys(plan.errors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted scores.",
      fieldErrors: Object.fromEntries(
        Object.entries(plan.errors).map(([field, message]) => [field, [message]]),
      ),
    };
  }

  if (plan.inserts.length > 0) {
    const { error } = await supabase.from("grades").insert(plan.inserts);
    if (error) return failure(error.code, "");
  }

  const updates = await Promise.all(
    plan.updates.map(({ id: gradeId, ...values }) =>
      supabase.from("grades").update(values).eq("id", gradeId),
    ),
  );
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) {
    revalidatePath("/admin/grades", "layout");
    return failure(updateError.code, "Some grades were saved.");
  }

  if (plan.deletes.length > 0) {
    const { error } = await supabase.from("grades").delete().in("id", plan.deletes);
    if (error) {
      revalidatePath("/admin/grades", "layout");
      return failure(error.code, "Some grades were saved.");
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
      revalidatePath("/admin/grades", "layout");
      return failure(error.code, "Some grades were saved.");
    }
  }

  revalidatePath("/admin/grades", "layout");
  return { status: "success", message: describeSheetSave(plan, publish) };
}
