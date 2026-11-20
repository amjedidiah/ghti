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

/** The student's courses (registrations), newest term first, for /portal/courses. */
export async function getMyCourses(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      "offering:course_offerings(id, term:terms(id, session, name, starts_on), course:courses(code, title, credit_units))",
    )
    .eq("student_id", studentId);
  if (error) throw new Error(`Could not load your courses: ${error.message}`);
  return data
    .map((row) => row.offering)
    .filter((offering) => offering?.term && offering.course)
    .map((offering) => ({ id: offering!.id, term: offering!.term!, course: offering!.course! }))
    .sort(
      (a, b) =>
        b.term.session.localeCompare(a.term.session) ||
        (b.term.starts_on ?? "").localeCompare(a.term.starts_on ?? "") ||
        a.course.code.localeCompare(b.course.code),
    );
}

/** One offering the student is registered on (RLS), or null. */
export async function getMyCourse(offeringId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offerings")
    .select("id, term:terms(session, name), course:courses(id, code, title)")
    .eq("id", offeringId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the course: ${error.message}`);
  return data?.term && data.course ? { ...data, term: data.term, course: data.course } : null;
}

/** The student's programme id, for its lecture schedules. */
export async function getMyProgrammeId(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("programme_id")
    .eq("id", studentId)
    .maybeSingle();
  return data?.programme_id ?? null;
}
