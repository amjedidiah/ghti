import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { PROGRAMMES_TAG } from "@/lib/queries/programmes";
import type { Database } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

// Course content reads (Stage 3, step 3.2), as the signed-in user: RLS shows a
// course's lessons and materials only to its lecturer, its students and
// admins. Never returns a Drive link, only IDs, which /materials/[id] turns
// into a link after its own check.

type DriveKind = Database["public"]["Enums"]["drive_kind"];

export type Material = {
  id: string;
  title: string;
  kind: DriveKind;
  lessonId: string | null;
  /** Present only for the content editor (`withFileIds`), never for students. */
  driveFileId?: string;
};
export type Lesson = {
  id: string;
  title: string;
  body: string;
  youtubeId: string | null;
  materials: Material[];
};

/**
 * A course's lessons (in order, each with its materials) and its other
 * materials. `withFileIds` adds Drive file IDs for the editor's edit forms;
 * pages for students never ask for them.
 */
export async function getCourseContent(courseId: string, { withFileIds = false } = {}) {
  const supabase = await createClient();
  const [lessons, materials] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, body, youtube_id")
      .eq("course_id", courseId)
      .order("position"),
    supabase
      .from("materials")
      .select("id, title, drive_kind, lesson_id, drive_file_id")
      .eq("course_id", courseId)
      .order("position"),
  ]);
  if (lessons.error) throw new Error(`Could not load lessons: ${lessons.error.message}`);
  if (materials.error) throw new Error(`Could not load materials: ${materials.error.message}`);

  const all: Material[] = materials.data.map((m) => ({
    id: m.id,
    title: m.title,
    kind: m.drive_kind,
    lessonId: m.lesson_id,
    ...(withFileIds ? { driveFileId: m.drive_file_id } : {}),
  }));
  return {
    lessons: lessons.data.map((lesson): Lesson => ({
      id: lesson.id,
      title: lesson.title,
      body: lesson.body,
      youtubeId: lesson.youtube_id,
      materials: all.filter((material) => material.lessonId === lesson.id),
    })),
    /** Materials not attached to a lesson. */
    materials: all.filter((material) => material.lessonId === null),
    /** Every material, in order (for the editor). */
    allMaterials: all,
  };
}

export type CourseContent = Awaited<ReturnType<typeof getCourseContent>>;

/** A programme's lecture schedules (published programmes are public), newest term first. */
export async function getProgrammeSchedules(programmeId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PROGRAMMES_TAG);

  const { data, error } = await createPublicClient()
    .from("lecture_schedules")
    .select("id, title, drive_kind, term:terms(id, session, name, starts_on)")
    .eq("programme_id", programmeId);
  if (error) throw new Error(`Could not load schedules: ${error.message}`);
  return sortSchedules(data);
}

/**
 * A programme's schedules as the signed-in user sees them (request time, not
 * cached): admins see draft programmes' schedules too.
 */
export async function listProgrammeSchedules(programmeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lecture_schedules")
    .select("id, title, drive_kind, term:terms(id, session, name, starts_on)")
    .eq("programme_id", programmeId);
  if (error) throw new Error(`Could not load schedules: ${error.message}`);
  return sortSchedules(data);
}

type ScheduleRow = {
  id: string;
  title: string;
  drive_kind: DriveKind;
  term: { id: string; session: string; name: string; starts_on: string | null } | null;
};

function sortSchedules(rows: ScheduleRow[]) {
  return rows
    .filter((row) => row.term)
    .map((row) => ({ id: row.id, title: row.title, kind: row.drive_kind, term: row.term! }))
    .sort(
      (a, b) =>
        b.term.session.localeCompare(a.term.session) ||
        (b.term.starts_on ?? "").localeCompare(a.term.starts_on ?? "") ||
        a.title.localeCompare(b.title),
    );
}

export type Schedule = ReturnType<typeof sortSchedules>[number];
