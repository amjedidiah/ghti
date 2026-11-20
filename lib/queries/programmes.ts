import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { CourseListing, Programme, ProgrammeSummary } from "@/lib/programmes";
import { createPublicClient } from "@/lib/supabase/public";

/** Cache tag for published programme data; revalidate it when admins edit programmes (Stage 2). */
export const PROGRAMMES_TAG = "programmes";

/** All published programmes, ordered by level then position. RLS hides drafts. */
export async function getPublishedProgrammes(): Promise<ProgrammeSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(PROGRAMMES_TAG);

  const { data, error } = await createPublicClient()
    .from("programmes")
    .select("id, slug, title, level, duration, description")
    .eq("status", "published")
    .order("level")
    .order("position")
    .order("title");

  if (error) throw new Error(`Could not load programmes: ${error.message}`);
  return data;
}

/** One published programme by slug, or null when it does not exist or is not published. */
export async function getPublishedProgramme(slug: string): Promise<Programme | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PROGRAMMES_TAG, `${PROGRAMMES_TAG}:${slug}`);

  const { data, error } = await createPublicClient()
    .from("programmes")
    .select("id, slug, title, level, duration, description, requirements")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Could not load programme: ${error.message}`);
  return data;
}

/**
 * Courses of a published programme, for its public page. RLS shows the public
 * only the courses of published programmes. Course edits refresh PROGRAMMES_TAG.
 */
export async function getProgrammeCourses(programmeId: string): Promise<CourseListing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(PROGRAMMES_TAG);

  const { data, error } = await createPublicClient()
    .from("courses")
    .select("code, title, credit_units, year, semester")
    .eq("programme_id", programmeId)
    .order("year")
    .order("semester")
    .order("code");

  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return data;
}
