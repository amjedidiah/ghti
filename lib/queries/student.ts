import "server-only";

import { createClient } from "@/lib/supabase/server";

/** The signed-in student's own record (RLS returns only their row), or null. */
export async function getMyStudentRecord(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "matric_no, status, created_at, programme:programmes(title, level), entry_term:terms(name, session)",
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error) throw new Error(`Could not load your record: ${error.message}`);
  return data;
}

/**
 * Every registration of the signed-in student with its term, course and grade.
 * RLS returns only their own rows and only PUBLISHED grades (others come back
 * as null), so drafts can never leak to the portal.
 */
export async function getMyRegistrations(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, created_at, offering:course_offerings(term:terms(id, session, name, starts_on), course:courses(code, title, credit_units)), grade:grades(total, letter, grade_point, published_at)",
    )
    .eq("student_id", studentId);

  if (error) throw new Error(`Could not load your courses: ${error.message}`);
  return data.map((registration) => ({
    term: registration.offering?.term ?? null,
    course: registration.offering?.course ?? null,
    grade: registration.grade
      ? {
          total: registration.grade.total,
          letter: registration.grade.letter,
          grade_point: registration.grade.grade_point,
        }
      : null,
    registeredAt: registration.created_at,
    publishedAt: registration.grade?.published_at ?? null,
  }));
}
