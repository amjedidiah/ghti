"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { sendApplicationDecision, sendStudentWelcome } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";
import { enrolmentSchema } from "@/lib/validation/enrolment";
import { parseFormData } from "@/lib/validation/form";
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

/**
 * The applicant's name, sign-in email and programme, for the decision and
 * welcome emails. Null when any of them is missing (nothing is sent).
 */
async function applicantContact(applicationId: string) {
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("applicant_id, programme:programmes(title), applicant:profiles!applicant_id(full_name)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return null;

  const { data: emails } = await supabase.rpc("account_emails", {
    p_user_ids: [application.applicant_id],
  });
  const to = emails?.[0]?.email;
  if (!to) return null;

  return {
    to,
    name: application.applicant?.full_name ?? "",
    programme: application.programme?.title ?? "your programme",
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

  if (!error) {
    const decision = parsed.data.decision;
    after(async () => {
      const contact = await applicantContact(applicationId);
      if (contact) await sendApplicationDecision({ ...contact, decision });
    });
  }
  return result(error);
}

/**
 * Enrol an admitted applicant as a student: matric number and entry term, and
 * the account's role becomes `student` (enrol_student, one transaction).
 */
export async function enrolStudent(
  applicationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(applicationId).success) {
    return { status: "error", message: "Unknown application." };
  }
  const parsed = parseFormData(enrolmentSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data: enrolled, error } = await supabase.rpc("enrol_student", {
    p_application_id: applicationId,
    p_matric_no: parsed.data.matricNo,
    p_entry_term_id: parsed.data.entryTermId,
  });
  revalidatePath(`/admin/applications/${applicationId}`);

  if (!error) {
    const matricNo = enrolled?.matric_no ?? parsed.data.matricNo;
    after(async () => {
      const contact = await applicantContact(applicationId);
      if (contact) await sendStudentWelcome({ ...contact, matricNo });
    });
    return { status: "success", message: `Enrolled as ${matricNo}.` };
  }
  switch (error.code) {
    case "23505":
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { matricNo: ["Another student already has this matric number."] },
      };
    case "23514":
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { matricNo: ['Use letters, numbers, "/" and "-" only (up to 40).'] },
      };
    case "23503":
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { entryTermId: ["That term no longer exists. Refresh and choose another."] },
      };
    case "42501":
      return { status: "error", message: ERRORS["42501"] };
    case "55000":
      return {
        status: "error",
        message: "This applicant is already a student, or is no longer admitted. Refresh the page.",
      };
    default:
      return { status: "error", message: "Something went wrong. Please try again." };
  }
}
