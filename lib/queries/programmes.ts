import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { Programme, ProgrammeSummary } from "@/lib/programmes";
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
    .select("slug, title, level, duration, description")
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
    .select("slug, title, level, duration, description, requirements")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Could not load programme: ${error.message}`);
  return data;
}
