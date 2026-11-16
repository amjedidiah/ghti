import "server-only";

import { createClient } from "@/lib/supabase/server";

// Admin reads for programmes, courses and terms. They run as the signed-in
// admin (RLS lets admins read drafts and archived rows); never cached.

/** Every programme with its number of courses, in display order. */
export async function listProgrammesForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programmes")
    .select("id, slug, title, level, status, position, courses(count)")
    .order("level")
    .order("position")
    .order("title");

  if (error) throw new Error(`Could not load programmes: ${error.message}`);
  return data.map(({ courses, ...programme }) => ({
    ...programme,
    courseCount: courses[0]?.count ?? 0,
  }));
}

/** One programme with all its courses (by year, semester, code), or null. */
export async function getProgrammeForAdmin(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programmes")
    .select(
      "id, slug, title, level, duration, description, requirements, status, position, courses(id, code, title, credit_units, year, semester)",
    )
    .eq("id", id)
    .order("year", { referencedTable: "courses" })
    .order("semester", { referencedTable: "courses" })
    .order("code", { referencedTable: "courses" })
    .maybeSingle();

  if (error) throw new Error(`Could not load programme: ${error.message}`);
  return data;
}

export type ProgrammeForAdmin = NonNullable<Awaited<ReturnType<typeof getProgrammeForAdmin>>>;

/** One course with its programme's title, or null. */
export async function getCourseForAdmin(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, code, title, credit_units, year, semester, programme:programmes(id, title), offerings:course_offerings(count)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load course: ${error.message}`);
  if (!data) return null;
  const { offerings, ...course } = data;
  return { ...course, offeringCount: offerings[0]?.count ?? 0 };
}

/** Every term, newest session first. */
export async function listTermsForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms")
    .select("id, session, name, starts_on, ends_on, accepting_applications")
    .order("session", { ascending: false })
    .order("starts_on", { ascending: true, nullsFirst: false })
    .order("name");

  if (error) throw new Error(`Could not load terms: ${error.message}`);
  return data;
}

/** One term, or null. */
export async function getTermForAdmin(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms")
    .select("id, session, name, starts_on, ends_on, accepting_applications")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load term: ${error.message}`);
  return data;
}

/** True when `value` looks like a database id; anything else is a 404. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

// Offerings ------------------------------------------------------------------------

/** Every term with how many courses it offers, newest session first. */
export async function listTermsWithOfferingCounts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms")
    .select("id, session, name, starts_on, ends_on, course_offerings(count)")
    .order("session", { ascending: false })
    .order("starts_on", { ascending: true, nullsFirst: false })
    .order("name");

  if (error) throw new Error(`Could not load terms: ${error.message}`);
  return data.map(({ course_offerings, ...term }) => ({
    ...term,
    offeringCount: course_offerings[0]?.count ?? 0,
  }));
}

/**
 * A term, every course that could run in it (grouped by programme; archived
 * programmes only when one of their courses is already offered), and the
 * term's current offerings with their number of registered students.
 */
export async function getTermOfferingsForAdmin(termId: string) {
  const supabase = await createClient();
  const [term, programmes, offerings] = await Promise.all([
    supabase.from("terms").select("id, session, name").eq("id", termId).maybeSingle(),
    supabase
      .from("programmes")
      .select("id, title, level, status, courses(id, code, title, credit_units, year, semester)")
      .order("level")
      .order("position")
      .order("title")
      .order("year", { referencedTable: "courses" })
      .order("semester", { referencedTable: "courses" })
      .order("code", { referencedTable: "courses" }),
    supabase
      .from("course_offerings")
      .select("id, course_id, registrations(count)")
      .eq("term_id", termId),
  ]);

  if (term.error) throw new Error(`Could not load term: ${term.error.message}`);
  if (programmes.error) throw new Error(`Could not load courses: ${programmes.error.message}`);
  if (offerings.error) throw new Error(`Could not load offerings: ${offerings.error.message}`);
  if (!term.data) return null;

  const registrationsByCourse = new Map(
    offerings.data.map((offering) => [offering.course_id, offering.registrations[0]?.count ?? 0]),
  );

  return {
    term: term.data,
    offered: registrationsByCourse,
    programmes: programmes.data.filter(
      (programme) =>
        programme.courses.length > 0 &&
        (programme.status !== "archived" ||
          programme.courses.some((course) => registrationsByCourse.has(course.id))),
    ),
  };
}

export type TermOfferings = NonNullable<Awaited<ReturnType<typeof getTermOfferingsForAdmin>>>;
