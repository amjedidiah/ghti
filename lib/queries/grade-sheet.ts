import "server-only";

import { pendingReturn, type GradeStatus } from "@/lib/grade-sheet";
import type { GradeBand } from "@/lib/grades";
import { createClient } from "@/lib/supabase/server";

// Reads shared by the admin and lecturer grade sheets, as the signed-in user
// (RLS decides what each sees). Never cached.

/** The grading scale, highest band first. */
export async function getGradingScale(): Promise<GradeBand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grading_scale")
    .select("min_score, letter, grade_point")
    .order("min_score", { ascending: false });
  if (error) throw new Error(`Could not load the grading scale: ${error.message}`);
  return data.map((band) => ({
    min_score: Number(band.min_score),
    letter: band.letter,
    grade_point: Number(band.grade_point),
  }));
}

export type GradeReturn = { note: string; count: number; returnedAt: string };

/**
 * The latest "returned to lecturer" note for an offering while it still
 * applies (until grades are submitted or published again).
 */
export async function getPendingReturn(
  offeringId: string,
  grades: readonly { status: GradeStatus; updatedAt: string }[],
): Promise<GradeReturn | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grade_returns")
    .select("note, grades_returned, returned_at")
    .eq("offering_id", offeringId)
    .order("returned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the grade returns: ${error.message}`);
  const latest = data
    ? { note: data.note, count: data.grades_returned, returnedAt: data.returned_at }
    : null;
  return pendingReturn(latest, grades);
}

/** A stored score as the sheet's text field: "" when not entered. */
export function scoreText(value: number | string | null | undefined): string {
  return value == null ? "" : String(Number(value));
}
