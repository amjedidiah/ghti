"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { sendGradesReturned, sendResultsPublished } from "@/lib/email/send";
import { getResultNotices } from "@/lib/queries/admin-grades";
import { describeNoticeRun } from "@/lib/result-notices";
import { saveGradeSheetAs } from "@/lib/save-grade-sheet";
import { createClient } from "@/lib/supabase/server";
import { termLabel } from "@/lib/validation/academics";
import type { FormState } from "@/lib/validation/auth";
import { parseFormData } from "@/lib/validation/form";
import { returnGradesSchema } from "@/lib/validation/grades";

// Grade entry and approval (steps 2.3 and 3.3). Each action re-checks the
// role; saveGradeSheetAs re-reads the sheet from the database, and the
// database triggers work out letters, guard published grades and log every
// change to them.

const id = z.guid();
const GENERIC = "Something went wrong. Please try again.";

/** Save a whole grade sheet; with intent "finalise", also publish every complete grade. */
export async function saveGradeSheet(
  offeringId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(offeringId).success) {
    return { status: "error", message: "Unknown course. Refresh the page." };
  }
  return (await saveGradeSheetAs("admin", offeringId, formData)).state;
}

/**
 * Send a course's submitted grades back to its lecturer as drafts, with a
 * note saying what to look at (return_grades keeps it), and email them.
 */
export async function returnGrades(
  offeringId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(offeringId).success) {
    return { status: "error", message: "Unknown course. Refresh the page." };
  }
  const parsed = parseFormData(returnGradesSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { note } = parsed.data;

  const supabase = await createClient();
  const { data: count, error } = await supabase.rpc("return_grades", {
    p_offering_id: offeringId,
    p_note: note,
  });
  if (error?.code === "55000") {
    return { status: "error", message: "No grades are waiting for approval. Refresh the page." };
  }
  if (error) return { status: "error", message: GENERIC };

  revalidatePath("/admin/grades", "layout");
  revalidatePath("/teach", "layout");

  const { data: offering } = await supabase
    .from("course_offerings")
    .select("lecturer_id, term:terms(name, session), course:courses(code, title)")
    .eq("id", offeringId)
    .maybeSingle();
  const lecturerId = offering?.lecturer_id;
  if (lecturerId && offering.course && offering.term) {
    const course = `${offering.course.code}: ${offering.course.title}`;
    const term = termLabel(offering.term);
    after(async () => {
      // A fresh client, as in the other after() emails: the request's may be gone.
      const client = await createClient();
      const [{ data: emails }, { data: profile }] = await Promise.all([
        client.rpc("account_emails", { p_user_ids: [lecturerId] }),
        client.from("profiles").select("full_name").eq("id", lecturerId).maybeSingle(),
      ]);
      const to = emails?.[0]?.email;
      if (to) {
        await sendGradesReturned({
          to,
          name: profile?.full_name ?? "",
          course,
          term,
          note,
          count,
          offeringId,
        });
      }
    });
  }

  const grades = `${count} grade${count === 1 ? "" : "s"}`;
  return {
    status: "success",
    message: lecturerId
      ? `Returned ${grades} to the lecturer as drafts. They have been emailed your note.`
      : `Returned ${grades} to draft. No lecturer is assigned, so nobody was emailed.`,
  };
}

/**
 * Email "your results are out" to the term's students who have a published
 * grade and have not had this email yet, up to RESULT_NOTICES_PER_RUN at a
 * time. Each student emailed is recorded in result_notices, so a run cut
 * short (Resend's daily limit) carries on where it stopped.
 */
export async function emailResultNotices(termId: string): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(termId).success) {
    return { status: "error", message: "Unknown term. Refresh the page." };
  }

  const supabase = await createClient();
  const { data: term } = await supabase
    .from("terms")
    .select("name, session")
    .eq("id", termId)
    .maybeSingle();
  if (!term) return { status: "error", message: "Unknown term. Refresh the page." };

  const { plan, names } = await getResultNotices(termId);
  if (plan.toSend.length === 0) {
    return {
      status: "error",
      message:
        plan.withResults === 0
          ? "No results are published in this term yet."
          : "Every student with results has already been emailed.",
    };
  }

  const { data: emails, error } = await supabase.rpc("account_emails", {
    p_user_ids: plan.toSend,
  });
  if (error) return { status: "error", message: GENERIC };
  const emailOf = new Map(emails.map((row) => [row.user_id, row.email]));
  const recipients = plan.toSend.flatMap((studentId) => {
    const to = emailOf.get(studentId);
    return to ? [{ studentId, to, name: names.get(studentId) ?? "" }] : [];
  });

  const outcome = await sendResultsPublished(termLabel(term), recipients);
  const sentIds = recipients
    .filter((_, index) => outcome.sent[index])
    .map((recipient) => recipient.studentId);

  if (sentIds.length > 0) {
    const { error: recordError } = await supabase.from("result_notices").upsert(
      sentIds.map((studentId) => ({ student_id: studentId, term_id: termId })),
      { onConflict: "student_id,term_id", ignoreDuplicates: true },
    );
    if (recordError) {
      revalidatePath("/admin/grades");
      return {
        status: "error",
        message: `${sentIds.length} emailed, but we could not record it. Do not press again; refresh first.`,
      };
    }
  }

  revalidatePath("/admin/grades");
  const failed = plan.toSend.length - sentIds.length;
  return describeNoticeRun({
    sent: sentIds.length,
    failed,
    left: plan.pending.length - sentIds.length,
    quotaReached: outcome.quotaReached,
  });
}
