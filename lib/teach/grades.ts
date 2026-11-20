"use server";

import { after } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { sendGradesSubmitted } from "@/lib/email/send";
import { saveGradeSheetAs } from "@/lib/save-grade-sheet";
import { createClient } from "@/lib/supabase/server";
import { termLabel } from "@/lib/validation/academics";
import type { FormState } from "@/lib/validation/auth";

// Lecturer grade entry (Stage 3, step 3.3). RLS lets a lecturer write only
// draft and submitted grades for the courses they teach; submitting tells the
// office, which publishes the grades or returns them.

/** Save the lecturer's sheet; with intent "finalise", submit complete grades for approval. */
export async function saveMyGradeSheet(
  offeringId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole("lecturer");
  if (!z.guid().safeParse(offeringId).success) {
    return { status: "error", message: "Unknown course. Refresh the page." };
  }
  const { state, plan } = await saveGradeSheetAs("lecturer", offeringId, formData);
  const count = plan?.newlyFinal ?? 0;
  if (state.status !== "success" || count === 0) return state;

  const supabase = await createClient();
  const { data: offering } = await supabase
    .from("course_offerings")
    .select("term:terms(name, session), course:courses(code, title)")
    .eq("id", offeringId)
    .maybeSingle();
  if (offering?.course && offering.term) {
    const course = `${offering.course.code}: ${offering.course.title}`;
    const term = termLabel(offering.term);
    after(() => sendGradesSubmitted({ lecturer: user.fullName, course, term, count, offeringId }));
  }
  return {
    ...state,
    message: `${state.message} The office has been told; you cannot change submitted grades unless they are returned to you.`,
  };
}
