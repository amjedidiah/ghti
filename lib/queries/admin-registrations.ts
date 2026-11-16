import "server-only";

import type { ProgrammeLevel } from "@/lib/programmes";
import { createClient } from "@/lib/supabase/server";

// Admin reads for registrations (Stage 2, step 2.1). Run as the signed-in
// admin; never cached.

/**
 * Everything the bulk registration page needs for one term: the programmes
 * that have courses offered in it and, for the chosen programme, its offerings
 * this term and its active students (with how many of those offerings each is
 * already registered on).
 */
export async function getRegistrationSetup(termId: string, programmeId: string | null) {
  const supabase = await createClient();
  const [term, offerings] = await Promise.all([
    supabase.from("terms").select("id, session, name").eq("id", termId).maybeSingle(),
    supabase
      .from("course_offerings")
      .select(
        "id, registrations(count), course:courses(code, title, credit_units, year, semester, programme:programmes(id, title, level))",
      )
      .eq("term_id", termId),
  ]);
  if (term.error) throw new Error(`Could not load term: ${term.error.message}`);
  if (offerings.error) throw new Error(`Could not load offerings: ${offerings.error.message}`);
  if (!term.data) return null;

  const programmes = new Map<string, { id: string; title: string; level: ProgrammeLevel }>();
  for (const offering of offerings.data) {
    const programme = offering.course?.programme;
    if (programme) programmes.set(programme.id, programme);
  }

  const chosen = programmeId && programmes.has(programmeId) ? programmeId : null;
  const programmeOfferings = offerings.data
    .filter((offering) => offering.course?.programme?.id === chosen)
    .map((offering) => ({
      id: offering.id,
      code: offering.course?.code ?? "",
      title: offering.course?.title ?? "",
      creditUnits: offering.course?.credit_units ?? 0,
      year: offering.course?.year ?? 0,
      semester: offering.course?.semester ?? 0,
      registrations: offering.registrations[0]?.count ?? 0,
    }))
    .sort((a, b) => a.year - b.year || a.semester - b.semester || a.code.localeCompare(b.code));

  let students: {
    id: string;
    matricNo: string;
    name: string;
    entryTerm: string;
    registeredOn: number;
  }[] = [];

  if (chosen) {
    const { data, error } = await supabase
      .from("students")
      .select("id, matric_no, profile:profiles(full_name), entry_term:terms(name, session)")
      .eq("programme_id", chosen)
      .eq("status", "active")
      .order("matric_no")
      .limit(2000);
    if (error) throw new Error(`Could not load students: ${error.message}`);

    const offeringIds = programmeOfferings.map((offering) => offering.id);
    const counts = new Map<string, number>();
    if (offeringIds.length > 0 && data.length > 0) {
      const { data: existing, error: existingError } = await supabase
        .from("registrations")
        .select("student_id")
        .in("offering_id", offeringIds);
      if (existingError) {
        throw new Error(`Could not load registrations: ${existingError.message}`);
      }
      for (const row of existing) counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
    }

    students = data.map((student) => ({
      id: student.id,
      matricNo: student.matric_no,
      name: student.profile?.full_name ?? "",
      entryTerm: student.entry_term
        ? `${student.entry_term.name}, ${student.entry_term.session}`
        : "",
      registeredOn: counts.get(student.id) ?? 0,
    }));
  }

  return {
    term: term.data,
    programmes: [...programmes.values()].sort((a, b) => a.title.localeCompare(b.title)),
    programmeId: chosen,
    offerings: programmeOfferings,
    students,
  };
}

export type RegistrationSetup = NonNullable<Awaited<ReturnType<typeof getRegistrationSetup>>>;

/** One offering and its class list (registered students by matric number), or null. */
export async function getOfferingClassList(offeringId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offerings")
    .select(
      "id, term:terms(id, session, name), course:courses(code, title, credit_units, programme:programmes(title)), registrations(id, created_at, student:students(matric_no, status, profile:profiles(full_name)))",
    )
    .eq("id", offeringId)
    .maybeSingle();

  if (error) throw new Error(`Could not load the class list: ${error.message}`);
  if (!data) return null;
  return {
    ...data,
    registrations: [...data.registrations].sort((a, b) =>
      (a.student?.matric_no ?? "").localeCompare(b.student?.matric_no ?? ""),
    ),
  };
}
