"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { decisionSchema, type DecisionValues } from "@/lib/validation/review";

export type ReviewResult = { ok: true } | { ok: false; message: string };

const id = z.uuid();

const ERRORS: Record<string, string> = {
  "42501": "Only admins can do this.",
  "55000": "This application has changed since you opened it. Refresh the page.",
  "23514": "Write a note for the applicant before rejecting.",
  "22001": "The note is too long: keep it under 2,000 characters.",
};

function result(error: { code?: string } | null): ReviewResult {
  if (!error) return { ok: true };
  return {
    ok: false,
    message: ERRORS[error.code ?? ""] ?? "Something went wrong. Please try again.",
  };
}

/** Mark a submitted application as under review (the applicant sees "Under review"). */
export async function startReview(applicationId: string): Promise<ReviewResult> {
  await requireRole("admin");
  if (!id.safeParse(applicationId).success) return { ok: false, message: "Unknown application." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_review", { p_application_id: applicationId });
  revalidatePath(`/admin/applications/${applicationId}`);
  return result(error);
}

/** Admit or reject. The note is shown to the applicant on their status page. */
export async function decideApplication(
  applicationId: string,
  input: DecisionValues,
): Promise<ReviewResult> {
  await requireRole("admin");
  const parsed = decisionSchema.safeParse(input);
  if (!id.safeParse(applicationId).success || !parsed.success) {
    return { ok: false, message: parsed.error?.issues[0]?.message ?? "Unknown application." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_application", {
    p_application_id: applicationId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note,
  });
  revalidatePath(`/admin/applications/${applicationId}`);
  return result(error);
}
