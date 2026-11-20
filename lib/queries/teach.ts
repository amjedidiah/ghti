import "server-only";

import { getGradingScale, getPendingReturn, scoreText } from "@/lib/queries/grade-sheet";
import { createClient } from "@/lib/supabase/server";

// Reads for the lecturer area (/teach), as the signed-in lecturer: RLS returns
// only the offerings they teach and those classes.

/** The lecturer's offerings, newest term first, with class sizes. */
export async function getMyOfferings(lecturerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offerings")
    .select(
      "id, term:terms(id, session, name, starts_on), course:courses(code, title, credit_units), registrations(count)",
    )
    .eq("lecturer_id", lecturerId);
  if (error) throw new Error(`Could not load your courses: ${error.message}`);

  return data
    .filter((offering) => offering.term && offering.course)
    .map((offering) => ({
      id: offering.id,
      term: offering.term!,
      course: offering.course!,
      students: offering.registrations[0]?.count ?? 0,
    }))
    .sort(
      (a, b) =>
        b.term.session.localeCompare(a.term.session) ||
        (b.term.starts_on ?? "").localeCompare(a.term.starts_on ?? "") ||
        a.course.code.localeCompare(b.course.code),
    );
}

export type MyOffering = Awaited<ReturnType<typeof getMyOfferings>>[number];

/** One offering the lecturer teaches, or null (not theirs, or unknown). */
export async function getMyOffering(offeringId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offerings")
    .select(
      "id, course_id, term:terms(id, session, name), course:courses(id, code, title, credit_units)",
    )
    .eq("id", offeringId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the course: ${error.message}`);
  return data?.term && data.course ? { ...data, term: data.term, course: data.course } : null;
}

/** The class: matric number, name and grade status only (class_list()). */
export async function getClassList(offeringId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("class_list", { p_offering_id: offeringId });
  if (error) throw new Error(`Could not load the class list: ${error.message}`);
  return data;
}

/**
 * The lecturer's grade sheet: the class (class_list: name and matric only),
 * each student's grade, the grading scale and any note from the office.
 */
export async function getMyGradeSheet(offeringId: string) {
  const supabase = await createClient();
  const [students, grades, scale] = await Promise.all([
    getClassList(offeringId),
    supabase
      .from("registrations")
      .select("id, grade:grades(ca_score, exam_score, status, updated_at)")
      .eq("offering_id", offeringId),
    getGradingScale(),
  ]);
  if (grades.error) throw new Error(`Could not load the grades: ${grades.error.message}`);

  const gradeOf = new Map(grades.data.map((row) => [row.id, row.grade]));
  const rows = students.map((student) => {
    const grade = gradeOf.get(student.registration_id) ?? null;
    return {
      registrationId: student.registration_id,
      name: student.full_name,
      matric: student.matric_no,
      ca: scoreText(grade?.ca_score),
      exam: scoreText(grade?.exam_score),
      status: grade?.status ?? null,
      updatedAt: grade?.updated_at ?? null,
    };
  });
  const returned = await getPendingReturn(
    offeringId,
    rows.flatMap((row) =>
      row.status && row.updatedAt ? [{ status: row.status, updatedAt: row.updatedAt }] : [],
    ),
  );
  return { rows, scale, returned };
}
