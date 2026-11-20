import "server-only";

import type { GradeBand } from "@/lib/grades";
import { planResultNotices } from "@/lib/result-notices";
import { createClient } from "@/lib/supabase/server";

// Admin reads for grades (Stage 2, step 2.3). Run as the signed-in admin;
// never cached. Student names never leave the admin pages.

/**
 * Terms (newest first) and, for the chosen term (default: the newest with
 * offerings), each offering's progress: registered, graded and published.
 */
export async function getGradeProgress(termId: string | null) {
  const supabase = await createClient();
  const { data: terms, error } = await supabase
    .from("terms")
    .select("id, session, name, course_offerings(count)")
    .order("session", { ascending: false })
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("name");
  if (error) throw new Error(`Could not load terms: ${error.message}`);

  const withOfferings = terms.filter((term) => (term.course_offerings[0]?.count ?? 0) > 0);
  const chosen =
    (termId && terms.find((term) => term.id === termId)?.id) ?? withOfferings[0]?.id ?? null;

  let offerings: {
    id: string;
    code: string;
    title: string;
    programme: string;
    registered: number;
    graded: number;
    published: number;
  }[] = [];

  if (chosen) {
    const { data, error: offeringsError } = await supabase
      .from("course_offerings")
      .select(
        "id, course:courses(code, title, programme:programmes(title)), registrations(id, grade:grades(status, total))",
      )
      .eq("term_id", chosen);
    if (offeringsError) throw new Error(`Could not load offerings: ${offeringsError.message}`);

    offerings = data
      .map((offering) => ({
        id: offering.id,
        code: offering.course?.code ?? "",
        title: offering.course?.title ?? "",
        programme: offering.course?.programme?.title ?? "",
        registered: offering.registrations.length,
        graded: offering.registrations.filter((r) => r.grade?.total != null).length,
        published: offering.registrations.filter((r) => r.grade?.status === "published").length,
      }))
      .sort((a, b) => a.programme.localeCompare(b.programme) || a.code.localeCompare(b.code));
  }

  return {
    terms: terms.map(({ id, session, name }) => ({ id, session, name })),
    termId: chosen,
    offerings,
  };
}

/** One offering's grade sheet: course, term, scale and every registered student's grade. */
export async function getGradeSheet(offeringId: string) {
  const supabase = await createClient();
  const [offering, scale] = await Promise.all([
    supabase
      .from("course_offerings")
      .select(
        "id, term:terms(id, session, name), course:courses(code, title, credit_units, programme:programmes(title)), registrations(id, student:students(matric_no, profile:profiles(full_name)), grade:grades(id, ca_score, exam_score, total, letter, status))",
      )
      .eq("id", offeringId)
      .maybeSingle(),
    supabase.from("grading_scale").select("min_score, letter, grade_point").order("min_score", {
      ascending: false,
    }),
  ]);
  if (offering.error) throw new Error(`Could not load the grade sheet: ${offering.error.message}`);
  if (scale.error) throw new Error(`Could not load the grading scale: ${scale.error.message}`);
  if (!offering.data) return null;

  return {
    ...offering.data,
    registrations: [...offering.data.registrations].sort((a, b) =>
      (a.student?.matric_no ?? "").localeCompare(b.student?.matric_no ?? ""),
    ),
    scale: scale.data.map((band): GradeBand => ({
      min_score: Number(band.min_score),
      letter: band.letter,
      grade_point: Number(band.grade_point),
    })),
  };
}

export type GradeSheet = NonNullable<Awaited<ReturnType<typeof getGradeSheet>>>;

/**
 * Who has published results in a term and who has already had the "results
 * are out" email (result_notices). Names come along for the email itself.
 */
export async function getResultNotices(termId: string) {
  const supabase = await createClient();
  const [published, notices] = await Promise.all([
    supabase
      .from("registrations")
      .select(
        "student_id, student:students(profile:profiles(full_name)), offering:course_offerings!inner(term_id), grade:grades!inner(status)",
      )
      .eq("offering.term_id", termId)
      .eq("grade.status", "published"),
    supabase.from("result_notices").select("student_id").eq("term_id", termId),
  ]);
  if (published.error) throw new Error(`Could not load results: ${published.error.message}`);
  if (notices.error) throw new Error(`Could not load notices: ${notices.error.message}`);

  const names = new Map<string, string>();
  for (const row of published.data) {
    names.set(row.student_id, row.student?.profile?.full_name ?? "");
  }
  return {
    plan: planResultNotices(
      published.data.map((row) => row.student_id),
      notices.data.map((row) => row.student_id),
    ),
    names,
  };
}
