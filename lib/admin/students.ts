"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RecordedDocument } from "@/lib/applications/actions";
import { DOCUMENT_LABELS } from "@/lib/applications/labels";
import { requireRole } from "@/lib/auth/session";
import {
  isAllowedMimeType,
  isDocumentPathFor,
  MAX_UPLOAD_BYTES,
  RECORDS_FOLDER,
} from "@/lib/files";
import { searchStudents, type StudentSearchResults } from "@/lib/queries/admin-students";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";
import { parseFormData } from "@/lib/validation/form";
import {
  recordNoteSchema,
  resolveChangeRequestSchema,
  STUDENT_DOCUMENT_KINDS,
  studentSearchSchema,
  studentStatusSchema,
  type StudentSearchInput,
} from "@/lib/validation/students";

// Records admin (Stage 2, step 2.5). The search runs as a Server Action (a
// POST) so names and matric numbers never appear in URLs or server logs.

const id = z.guid();
const GENERIC = "Something went wrong. Please try again.";

export type SearchStudentsResult =
  ({ ok: true } & StudentSearchResults) | { ok: false; message: string };

export async function searchStudentsAction(
  input: StudentSearchInput,
): Promise<SearchStudentsResult> {
  await requireRole("admin");
  const parsed = studentSearchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Those filters did not look right." };
  try {
    return { ok: true, ...(await searchStudents(parsed.data)) };
  } catch {
    return { ok: false, message: "We could not search just now. Please try again." };
  }
}

/** Add a dated note to a student's file. Notes are never edited or deleted. */
export async function addRecordNote(
  studentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(studentId).success) return { status: "error", message: "Unknown student." };
  const parsed = parseFormData(recordNoteSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase
    .from("record_notes")
    .insert({ student_id: studentId, body: parsed.data.body });
  if (error) {
    return {
      status: "error",
      message: error.code === "42501" ? "Only admins can write notes." : GENERIC,
    };
  }

  revalidatePath(`/admin/students/${studentId}`);
  return { status: "success", message: "Note added." };
}

/** Change a student's status; the change and its reason go on the file. */
export async function changeStudentStatus(
  studentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(studentId).success) return { status: "error", message: "Unknown student." };
  const parsed = parseFormData(studentStatusSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_student_status", {
    p_student_id: studentId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  revalidatePath(`/admin/students/${studentId}`);

  if (!error) return { status: "success", message: "Status changed and logged on the file." };
  switch (error.code) {
    case "55000":
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { status: ["The student already has this status."] },
      };
    case "42501":
      return { status: "error", message: "Only admins can change a student's status." };
    case "P0002":
      return { status: "error", message: "Unknown student. Refresh the page." };
    default:
      return { status: "error", message: GENERIC };
  }
}

// Documents on a student's file ---------------------------------------------------------------

const studentDocumentInput = z.object({
  kind: z.enum(STUDENT_DOCUMENT_KINDS),
  path: z.string().max(200),
  fileName: z.string().trim().min(1).max(200),
  sizeBytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  mime: z.string().refine(isAllowedMimeType),
});

/** Write a line on the student's file; a failure here never undoes the change itself. */
async function noteOnFile(studentId: string, body: string) {
  const supabase = await createClient();
  await supabase.from("record_notes").insert({ student_id: studentId, body });
}

/**
 * Record a file an admin has just uploaded to the student's records folder,
 * and note it on the file (the kind, never the file name).
 */
export async function recordStudentDocument(
  studentId: string,
  input: z.input<typeof studentDocumentInput>,
): Promise<{ ok: true; document: RecordedDocument } | { ok: false; message: string }> {
  await requireRole("admin");
  const parsed = studentDocumentInput.safeParse(input);
  if (
    !id.safeParse(studentId).success ||
    !parsed.success ||
    !isDocumentPathFor(parsed.data.path, studentId, RECORDS_FOLDER)
  ) {
    return { ok: false, message: "That upload did not look right. Please try again." };
  }
  const { kind, path, fileName, sizeBytes, mime } = parsed.data;
  const supabase = await createClient();
  const bucket = supabase.storage.from("documents");

  const { data: exists } = await bucket.exists(path);
  if (!exists) return { ok: false, message: "The upload did not finish. Please try again." };

  const { data: created, error } = await supabase
    .from("documents")
    .insert({
      owner_id: studentId,
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
    return { ok: false, message: "We could not save that document. Please try again." };
  }

  await noteOnFile(studentId, `Added a document: ${DOCUMENT_LABELS[kind]}.`);
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true, document: { id: created.id, kind, fileName, sizeBytes } };
}

/** Remove a document an admin added to the student's file (application documents stay). */
export async function removeStudentDocument(
  studentId: string,
  documentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireRole("admin");
  if (!id.safeParse(studentId).success || !id.safeParse(documentId).success) {
    return { ok: false, message: GENERIC };
  }
  const supabase = await createClient();
  const { data: removed, error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("owner_id", studentId)
    .is("application_id", null)
    .select("storage_path, kind");
  const document = removed?.[0];
  if (error || !document) {
    return { ok: false, message: "We could not remove that document. Refresh the page." };
  }
  await supabase.storage.from("documents").remove([document.storage_path]);
  await noteOnFile(studentId, `Removed a document: ${DOCUMENT_LABELS[document.kind]}.`);
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true };
}

// Change requests ----------------------------------------------------------------------------

/** Resolve a student's change request with a note; both go on the student's file. */
export async function resolveChangeRequest(
  studentId: string,
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(studentId).success || !id.safeParse(requestId).success) {
    return { status: "error", message: GENERIC };
  }
  const parsed = parseFormData(resolveChangeRequestSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_change_request", {
    p_request_id: requestId,
    p_note: parsed.data.note,
  });
  if (error?.code === "55000") {
    return {
      status: "error",
      message: "This request has already been resolved. Refresh the page.",
    };
  }
  if (error) return { status: "error", message: GENERIC };

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin");
  return { status: "success", message: "Resolved. The student sees your note in their portal." };
}
