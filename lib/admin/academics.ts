"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { sendLecturerAssigned } from "@/lib/email/send";
import { describeChanges, diffOfferings } from "@/lib/offerings";
import { TERMS_TAG } from "@/lib/queries/applications";
import { PROGRAMMES_TAG } from "@/lib/queries/programmes";
import { createClient } from "@/lib/supabase/server";
import {
  courseSchema,
  programmeSchema,
  termSchema,
  toCourseRow,
  toProgrammeRow,
  toTermRow,
} from "@/lib/validation/academics";
import type { FormState } from "@/lib/validation/auth";
import { parseFormData } from "@/lib/validation/form";

// Admin actions for programmes, courses and terms (Stage 2, step 2.1).
// Every action re-checks the role; RLS is the final word.

const uuid = z.uuid();
const SAVED: FormState = { status: "success", message: "Saved." };
const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const NOT_ALLOWED_MESSAGE = "Only admins can do this.";
const UNKNOWN_MESSAGE = "This record no longer exists. Go back and refresh the page.";
const GENERIC: FormState = { status: "error", message: GENERIC_MESSAGE };
const NOT_ALLOWED: FormState = { status: "error", message: NOT_ALLOWED_MESSAGE };
const UNKNOWN: FormState = { status: "error", message: UNKNOWN_MESSAGE };

type DbError = { code?: string } | null;

/** Turn a database error into a form state; `duplicate` names the field a unique clash belongs to. */
function failure(error: DbError, duplicate?: { field: string; message: string }): FormState {
  if (error?.code === "42501") return NOT_ALLOWED;
  if (error?.code === "23505" && duplicate) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { [duplicate.field]: [duplicate.message] },
    };
  }
  return GENERIC;
}

function refreshProgrammes() {
  updateTag(PROGRAMMES_TAG);
  revalidatePath("/admin/academics", "layout");
}

function refreshTerms() {
  updateTag(TERMS_TAG);
  revalidatePath("/admin/academics", "layout");
}

// Programmes -----------------------------------------------------------------------

const DUPLICATE_SLUG = {
  field: "slug",
  message: "Another programme already uses this web address. Choose a different one.",
};

export async function createProgramme(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = parseFormData(programmeSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programmes")
    .insert(toProgrammeRow(parsed.data))
    .select("id")
    .single();
  if (error) return failure(error, DUPLICATE_SLUG);

  refreshProgrammes();
  redirect(`/admin/academics/programmes/${data.id}`);
}

export async function updateProgramme(
  programmeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(programmeId).success) return UNKNOWN;
  const parsed = parseFormData(programmeSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programmes")
    .update(toProgrammeRow(parsed.data))
    .eq("id", programmeId)
    .select("id");
  if (error) return failure(error, DUPLICATE_SLUG);
  if (data.length === 0) return UNKNOWN;

  refreshProgrammes();
  return SAVED;
}

// Courses --------------------------------------------------------------------------

const DUPLICATE_CODE = {
  field: "code",
  message: "This programme already has a course with this code.",
};

export async function createCourse(
  programmeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(programmeId).success) return UNKNOWN;
  const parsed = parseFormData(courseSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .insert({ ...toCourseRow(parsed.data), programme_id: programmeId });
  if (error?.code === "23503") return UNKNOWN;
  if (error) return failure(error, DUPLICATE_CODE);

  refreshProgrammes();
  return { status: "success", message: `${parsed.data.code} added.` };
}

export async function updateCourse(
  courseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(courseId).success) return UNKNOWN;
  const parsed = parseFormData(courseSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update(toCourseRow(parsed.data))
    .eq("id", courseId)
    .select("id");
  if (error) return failure(error, DUPLICATE_CODE);
  if (data.length === 0) return UNKNOWN;

  refreshProgrammes();
  return SAVED;
}

export type DeleteResult = { ok: false; message: string };

/** Delete a course that has never been offered, then go back to its programme. */
export async function deleteCourse(courseId: string): Promise<DeleteResult> {
  await requireRole("admin");
  if (!uuid.safeParse(courseId).success) return { ok: false, message: UNKNOWN_MESSAGE };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .select("programme_id");
  if (error?.code === "23503") {
    return {
      ok: false,
      message:
        "This course has been offered in a term, so it cannot be deleted. Its history must stay on students' records.",
    };
  }
  if (error) {
    return { ok: false, message: error.code === "42501" ? NOT_ALLOWED_MESSAGE : GENERIC_MESSAGE };
  }
  if (data.length === 0) return { ok: false, message: UNKNOWN_MESSAGE };

  refreshProgrammes();
  redirect(`/admin/academics/programmes/${data[0].programme_id}`);
}

// Terms ----------------------------------------------------------------------------

const DUPLICATE_TERM = {
  field: "name",
  message: "This session already has a term with this name.",
};

export async function createTerm(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = parseFormData(termSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.from("terms").insert(toTermRow(parsed.data));
  if (error) return failure(error, DUPLICATE_TERM);

  refreshTerms();
  redirect("/admin/academics");
}

export async function updateTerm(
  termId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(termId).success) return UNKNOWN;
  const parsed = parseFormData(termSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms")
    .update(toTermRow(parsed.data))
    .eq("id", termId)
    .select("id");
  if (error) return failure(error, DUPLICATE_TERM);
  if (data.length === 0) return UNKNOWN;

  refreshTerms();
  return SAVED;
}

// Offerings ------------------------------------------------------------------------

/**
 * Set which courses run in a term from the ticked `courseId` boxes. Offerings
 * with registered students are never removed (diffOfferings keeps them).
 */
export async function saveOfferings(
  termId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(termId).success) return UNKNOWN;
  const selected = formData
    .getAll("courseId")
    .filter((value): value is string => typeof value === "string" && uuid.safeParse(value).success);

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("course_offerings")
    .select("course_id, registrations(count)")
    .eq("term_id", termId);
  if (readError) return failure(readError);

  const changes = diffOfferings(
    existing.map((offering) => ({
      courseId: offering.course_id,
      registrations: offering.registrations[0]?.count ?? 0,
    })),
    selected,
  );

  if (changes.add.length > 0) {
    const { error } = await supabase
      .from("course_offerings")
      .insert(changes.add.map((courseId) => ({ course_id: courseId, term_id: termId })));
    if (error?.code === "23503") return UNKNOWN;
    if (error) return failure(error);
  }

  if (changes.remove.length > 0) {
    const { error } = await supabase
      .from("course_offerings")
      .delete()
      .eq("term_id", termId)
      .in("course_id", changes.remove);
    if (error?.code === "23503") {
      return {
        status: "error",
        message:
          "Students registered on one of these courses while you were editing, so nothing was removed. Refresh the page and try again.",
      };
    }
    if (error) return failure(error);
  }

  revalidatePath("/admin/offerings", "layout");
  revalidatePath("/admin/academics", "layout");
  const kept =
    changes.kept.length > 0
      ? ` ${changes.kept.length} course${changes.kept.length === 1 ? " has" : "s have"} registered students, so ${changes.kept.length === 1 ? "it stays" : "they stay"}.`
      : "";
  return { status: "success", message: describeChanges(changes) + kept };
}

// Lecturers ------------------------------------------------------------------------------

const lecturerChoice = z.object({
  lecturerId: z.union([z.guid(), z.literal("")]).transform((value) => value || null),
});

/**
 * Assign a lecturer to one offering, or none. The database accepts only
 * lecturer accounts; a newly assigned lecturer gets an email.
 */
export async function assignLecturer(
  offeringId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!z.guid().safeParse(offeringId).success) return UNKNOWN;
  const parsed = parseFormData(lecturerChoice, formData);
  if (!parsed.ok) return parsed.state;
  const { lecturerId } = parsed.data;

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("course_offerings")
    .select("lecturer_id")
    .eq("id", offeringId)
    .maybeSingle();
  if (!before) return UNKNOWN;
  if (before.lecturer_id === lecturerId) return { status: "success", message: "No change." };

  const { data: offering, error } = await supabase
    .from("course_offerings")
    .update({ lecturer_id: lecturerId })
    .eq("id", offeringId)
    .select("term:terms(id, name, session), course:courses(code, title)")
    .maybeSingle();
  if (error?.code === "23514") {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { lecturerId: ["Only a lecturer can be assigned. Refresh the list."] },
    };
  }
  if (error || !offering) return error ? GENERIC : UNKNOWN;

  revalidatePath("/admin/offerings", "layout");
  revalidatePath("/teach", "layout");
  if (lecturerId && offering.course && offering.term) {
    const course = `${offering.course.code}: ${offering.course.title}`;
    const term = `${offering.term.name}, ${offering.term.session}`;
    after(async () => {
      // A fresh client, as in the other after() emails: the request's may be gone.
      const client = await createClient();
      const [{ data: emails }, { data: profile }] = await Promise.all([
        client.rpc("account_emails", { p_user_ids: [lecturerId] }),
        client.from("profiles").select("full_name").eq("id", lecturerId).maybeSingle(),
      ]);
      const to = emails?.[0]?.email;
      if (to) await sendLecturerAssigned({ to, name: profile?.full_name ?? "", course, term });
    });
  }
  return {
    status: "success",
    message: lecturerId ? "Lecturer assigned. They have been emailed." : "Lecturer removed.",
  };
}
