import "server-only";

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
