"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { APPLICATION_DOCUMENT_KINDS, documentSlot } from "@/lib/applications/documents";
import { splitFullName, valuesToUpdate } from "@/lib/applications/mapping";
import { requireRole } from "@/lib/auth/session";
import { sendApplicationSubmitted } from "@/lib/email/send";
import { isAllowedMimeType, isDocumentPathFor, MAX_UPLOAD_BYTES } from "@/lib/files";
import { createClient } from "@/lib/supabase/server";
import { termLabel } from "@/lib/validation/academics";
import {
  applicationDraftSchema,
  applicationSubmitSchema,
  MISSING_FIELD_MESSAGES,
  type ApplicationValues,
} from "@/lib/validation/application";

// Never log personal data from these actions (NDPA 2023).

export type ApplicationActionResult =
  | { status: "saved"; savedAt: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      /** Set when the answers were saved even though submitting failed. */
      savedAt?: string;
    };

const GENERIC_ERROR = "We could not save your application just now. Please try again in a moment.";

function fieldErrorsFrom(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Start a draft for the signed-in applicant (or reuse their open one), then show the form. */
export async function startApplication(): Promise<void> {
  const user = await requireRole("applicant");
  const supabase = await createClient();

  const { data: open } = await supabase
    .from("applications")
    .select("id")
    .eq("applicant_id", user.id)
    .in("status", ["draft", "submitted", "under_review", "admitted"])
    .maybeSingle();

  if (!open) {
    const { firstName, surname } = splitFullName(user.fullName);
    const { error } = await supabase.from("applications").insert({
      first_name: firstName || null,
      surname: surname || null,
      email: user.email || null,
    });
    // 23505: a draft was created a moment ago (double click); carry on.
    if (error && error.code !== "23505") throw new Error("Could not start the application.");
  }

  redirect("/apply");
}

async function loadDraft(applicationId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, status, consent_given_at, pledge_given_at")
    .eq("id", applicationId)
    .eq("applicant_id", userId)
    .maybeSingle();
  return { supabase, draft: data };
}

/** Save the draft. Answers may be incomplete but must be well formed. */
export async function saveApplication(
  applicationId: string,
  values: ApplicationValues,
): Promise<ApplicationActionResult> {
  const user = await requireRole("applicant");
  const parsed = applicationDraftSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Some answers need fixing before we can save them.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const { supabase, draft } = await loadDraft(applicationId, user.id);
  if (!draft) return { status: "error", message: "We could not find your application." };
  if (draft.status !== "draft") redirect("/apply/status");

  const { error } = await supabase
    .from("applications")
    .update(
      valuesToUpdate(parsed.data, {
        consentGivenAt: draft.consent_given_at,
        pledgeGivenAt: draft.pledge_given_at,
      }),
    )
    .eq("id", applicationId);
  if (error) return { status: "error", message: GENERIC_ERROR };

  return { status: "saved", savedAt: new Date().toISOString() };
}

/** Save, then submit through submit_application(), which checks completeness. */
export async function submitApplication(
  applicationId: string,
  values: ApplicationValues,
): Promise<ApplicationActionResult> {
  const user = await requireRole("applicant");
  const parsed = applicationSubmitSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Your application is not complete yet. Fix the highlighted answers, then submit.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const saved = await saveApplication(applicationId, values);
  if (saved.status === "error") return saved;

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_application", { p_application_id: applicationId });

  if (error?.code === "23514") {
    const fieldErrors: Record<string, string> = {};
    for (const key of (error.details ?? "").split(",").filter(Boolean)) {
      const known = MISSING_FIELD_MESSAGES[key];
      if (known) fieldErrors[known.field] = known.message;
    }
    return {
      status: "error",
      message: "Your application is not complete yet. Fix the highlighted answers, then submit.",
      fieldErrors,
      savedAt: saved.savedAt,
    };
  }
  if (error && error.code !== "55000") {
    return { status: "error", message: GENERIC_ERROR, savedAt: saved.savedAt };
  }

  // Confirmation email, only for a fresh submission (55000: already submitted).
  if (!error) {
    after(async () => {
      const { data } = await supabase
        .from("applications")
        .select("programme:programmes(title), intake:terms(name, session)")
        .eq("id", applicationId)
        .maybeSingle();
      await sendApplicationSubmitted({
        to: user.email,
        name: user.fullName,
        programme: data?.programme?.title ?? "your chosen programme",
        intake: data?.intake ? termLabel(data.intake) : null,
      });
    });
  }

  // Submitted (or already submitted in another tab).
  redirect("/apply/status");
}

const documentInput = z.object({
  applicationId: z.uuid(),
  kind: z.enum(APPLICATION_DOCUMENT_KINDS),
  path: z.string().max(200),
  fileName: z.string().trim().min(1).max(200),
  sizeBytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  mime: z.string().refine(isAllowedMimeType),
});

export type RecordedDocument = { id: string; kind: string; fileName: string; sizeBytes: number };

/**
 * Record a file the browser has just uploaded to the `documents` bucket. A
 * slot that holds one file (lib/applications/documents.ts) replaces the
 * earlier one; a slot that holds several refuses a file beyond its limit.
 */
export async function recordDocument(
  input: z.input<typeof documentInput>,
): Promise<{ ok: true; document: RecordedDocument } | { ok: false; message: string }> {
  const user = await requireRole("applicant");
  const parsed = documentInput.safeParse(input);
  if (!parsed.success || !isDocumentPathFor(parsed.data.path, user.id, parsed.data.applicationId)) {
    return { ok: false, message: "That upload did not look right. Please try again." };
  }
  const { applicationId, kind, path, fileName, sizeBytes, mime } = parsed.data;
  const supabase = await createClient();
  const bucket = supabase.storage.from("documents");

  const { data: exists } = await bucket.exists(path);
  if (!exists) return { ok: false, message: "The upload did not finish. Please try again." };

  const { data: previous } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("application_id", applicationId)
    .eq("kind", kind);
  const max = documentSlot(kind)?.max ?? 1;
  if (max > 1 && (previous?.length ?? 0) >= max) {
    await bucket.remove([path]);
    return {
      ok: false,
      message: `You can upload up to ${max} files here. Remove one to add another.`,
    };
  }

  const { data: created, error } = await supabase
    .from("documents")
    .insert({
      application_id: applicationId,
      kind,
      storage_path: path,
      file_name: fileName,
      size_bytes: sizeBytes,
      mime,
    })
    .select("id")
    .single();

  if (error || !created) {
    await bucket.remove([path]);
    return {
      ok: false,
      message:
        error?.code === "42501"
          ? "This application has been submitted, so its documents can no longer change."
          : "We could not save that document. Please try again.",
    };
  }

  if (max === 1 && previous && previous.length > 0) {
    await supabase
      .from("documents")
      .delete()
      .in(
        "id",
        previous.map((doc) => doc.id),
      );
    await bucket.remove(previous.map((doc) => doc.storage_path));
  }

  return { ok: true, document: { id: created.id, kind, fileName, sizeBytes } };
}

/** Remove a document (and its file) from the applicant's draft. */
export async function removeDocument(documentId: string): Promise<{ ok: boolean }> {
  await requireRole("applicant");
  if (!z.uuid().safeParse(documentId).success) return { ok: false };

  const supabase = await createClient();
  const { data: removed } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .select("storage_path");

  const path = removed?.[0]?.storage_path;
  if (!path) return { ok: false };
  await supabase.storage.from("documents").remove([path]);
  return { ok: true };
}
