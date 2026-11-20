"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";
import { lessonSchema, materialSchema } from "@/lib/validation/content";
import { parseFormData } from "@/lib/validation/form";

// Course content (Stage 3, step 3.2) for lecturers and admins. requireRole
// keeps out everyone else; RLS decides which courses each may change (a
// lecturer only the courses they teach).

const id = z.guid();
type Result = { ok: true } | { ok: false; message: string };

const NOT_YOURS = "You can change only the courses you teach. Refresh the page.";
const GENERIC = "Something went wrong. Please try again.";

function refresh() {
  revalidatePath("/teach", "layout");
  revalidatePath("/portal", "layout");
  revalidatePath("/admin/offerings", "layout");
}

function failure(code: string | undefined): FormState {
  return { status: "error", message: code === "42501" ? NOT_YOURS : GENERIC };
}

// Lessons ---------------------------------------------------------------------------------

export async function createLesson(
  courseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("lecturer", "admin");
  if (!id.safeParse(courseId).success) return { status: "error", message: GENERIC };
  const parsed = parseFormData(lessonSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.from("lessons").insert({
    course_id: courseId,
    title: parsed.data.title,
    body: parsed.data.body,
    youtube_id: parsed.data.youtubeLink,
  });
  if (error) return failure(error.code);
  refresh();
  return { status: "success", message: "Lesson added." };
}

export async function updateLesson(
  lessonId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("lecturer", "admin");
  if (!id.safeParse(lessonId).success) return { status: "error", message: GENERIC };
  const parsed = parseFormData(lessonSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      youtube_id: parsed.data.youtubeLink,
    })
    .eq("id", lessonId)
    .select("id");
  if (error) return failure(error.code);
  if (data.length === 0) return failure("42501");
  refresh();
  return { status: "success", message: "Lesson saved." };
}

/** Delete a lesson. Its materials stay, as course materials. */
export async function deleteLesson(lessonId: string): Promise<Result> {
  await requireRole("lecturer", "admin");
  if (!id.safeParse(lessonId).success) return { ok: false, message: GENERIC };
  const supabase = await createClient();
  const { data, error } = await supabase.from("lessons").delete().eq("id", lessonId).select("id");
  if (error || data.length === 0) return { ok: false, message: error ? GENERIC : NOT_YOURS };
  refresh();
  return { ok: true };
}

// Materials ------------------------------------------------------------------------------

export async function createMaterial(
  courseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("lecturer", "admin");
  if (!id.safeParse(courseId).success) return { status: "error", message: GENERIC };
  const parsed = parseFormData(materialSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.from("materials").insert({
    course_id: courseId,
    lesson_id: parsed.data.lessonId,
    title: parsed.data.title,
    drive_kind: parsed.data.driveLink.kind,
    drive_file_id: parsed.data.driveLink.id,
  });
  if (error?.code === "23503") {
    return { status: "error", message: "That lesson no longer exists. Refresh the page." };
  }
  if (error) return failure(error.code);
  refresh();
  return { status: "success", message: "Material added." };
}

export async function updateMaterial(
  materialId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("lecturer", "admin");
  if (!id.safeParse(materialId).success) return { status: "error", message: GENERIC };
  const parsed = parseFormData(materialSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .update({
      lesson_id: parsed.data.lessonId,
      title: parsed.data.title,
      drive_kind: parsed.data.driveLink.kind,
      drive_file_id: parsed.data.driveLink.id,
    })
    .eq("id", materialId)
    .select("id");
  if (error?.code === "23503") {
    return { status: "error", message: "That lesson no longer exists. Refresh the page." };
  }
  if (error) return failure(error.code);
  if (data.length === 0) return failure("42501");
  refresh();
  return { status: "success", message: "Material saved." };
}

export async function deleteMaterial(materialId: string): Promise<Result> {
  await requireRole("lecturer", "admin");
  if (!id.safeParse(materialId).success) return { ok: false, message: GENERIC };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId)
    .select("id");
  if (error || data.length === 0) return { ok: false, message: error ? GENERIC : NOT_YOURS };
  refresh();
  return { ok: true };
}

// Order ---------------------------------------------------------------------------------------

/** Swap a lesson or material with its neighbour above or below. */
export async function moveContent(
  table: "lessons" | "materials",
  itemId: string,
  direction: "up" | "down",
): Promise<Result> {
  await requireRole("lecturer", "admin");
  if (!id.safeParse(itemId).success || !["lessons", "materials"].includes(table)) {
    return { ok: false, message: GENERIC };
  }
  const supabase = await createClient();
  const { data: item } = await supabase
    .from(table)
    .select("id, course_id, position")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { ok: false, message: NOT_YOURS };

  const neighbourQuery = supabase
    .from(table)
    .select("id, position")
    .eq("course_id", item.course_id)
    .limit(1);
  const { data: neighbours } = await (direction === "up"
    ? neighbourQuery.lt("position", item.position).order("position", { ascending: false })
    : neighbourQuery.gt("position", item.position).order("position", { ascending: true }));
  const neighbour = neighbours?.[0];
  if (!neighbour) return { ok: true };

  const results = await Promise.all([
    supabase.from(table).update({ position: neighbour.position }).eq("id", item.id),
    supabase.from(table).update({ position: item.position }).eq("id", neighbour.id),
  ]);
  if (results.some((result) => result.error)) return { ok: false, message: GENERIC };
  refresh();
  return { ok: true };
}
