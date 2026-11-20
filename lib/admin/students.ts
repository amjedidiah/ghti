"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { searchStudents, type StudentSearchResults } from "@/lib/queries/admin-students";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";
import { parseFormData } from "@/lib/validation/form";
import {
  recordNoteSchema,
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
