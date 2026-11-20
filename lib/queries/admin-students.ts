import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STUDENTS_PAGE_SIZE, type StudentSearch } from "@/lib/validation/students";

// Admin reads for the records admin (Stage 2, step 2.5). Run as the signed-in
// admin; never cached. Names and matric numbers never go in URLs or logs.

/** One page of students matching a search, and the total. */
export async function searchStudents(search: StudentSearch) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_students", {
    p_query: search.query,
    p_programme_id: search.programmeId ?? undefined,
    p_entry_term_id: search.entryTermId ?? undefined,
    p_status: search.status ?? undefined,
    p_sort: search.sort,
    p_limit: STUDENTS_PAGE_SIZE,
    p_offset: (search.page - 1) * STUDENTS_PAGE_SIZE,
  });
  if (error) throw new Error(`Could not search students: ${error.message}`);
  return {
    total: Number(data[0]?.total_count ?? 0),
    rows: data.map((row) => ({
      id: row.id,
      matricNo: row.matric_no,
      fullName: row.full_name,
      status: row.status,
      programme: row.programme_title,
      entryTerm: `${row.entry_term_name}, ${row.entry_term_session}`,
    })),
  };
}

export type StudentSearchResults = Awaited<ReturnType<typeof searchStudents>>;
export type StudentRow = StudentSearchResults["rows"][number];

/** Programmes and terms for the search filters. */
export async function getStudentFilters() {
  const supabase = await createClient();
  const [programmes, terms] = await Promise.all([
    supabase.from("programmes").select("id, title").order("level").order("position"),
    supabase
      .from("terms")
      .select("id, session, name")
      .order("session", { ascending: false })
      .order("starts_on", { ascending: false, nullsFirst: false })
      .order("name"),
  ]);
  if (programmes.error) throw new Error(`Could not load programmes: ${programmes.error.message}`);
  if (terms.error) throw new Error(`Could not load terms: ${terms.error.message}`);
  return {
    programmes: programmes.data.map(({ id, title }) => ({ id, label: title })),
    terms: terms.data.map(({ id, session, name }) => ({ id, label: `${name}, ${session}` })),
  };
}

/**
 * A student's whole file: record, application (biodata and documents), every
 * registration with its grade (any status), and the notes log, newest first.
 */
export async function getStudentFile(id: string) {
  const supabase = await createClient();
  const { data: student, error } = await supabase
    .from("students")
    .select(
      "id, matric_no, status, created_at, application_id, profile:profiles!students_id_fkey(full_name, phone), programme:programmes(title, level), entry_term:terms(name, session)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the student: ${error.message}`);
  if (!student) return null;

  const [application, registrations, notes] = await Promise.all([
    student.application_id
      ? supabase
          .from("applications")
          .select(
            "*, programme:programmes(title, level), intake:terms(session, name), documents(id, kind, file_name, size_bytes, mime, created_at)",
          )
          .eq("id", student.application_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("registrations")
      .select(
        "id, offering:course_offerings(term:terms(id, session, name, starts_on), course:courses(code, title, credit_units)), grade:grades(total, letter, grade_point, status)",
      )
      .eq("student_id", id),
    supabase
      .from("record_notes")
      .select("id, kind, body, created_at, author:profiles!record_notes_author_id_fkey(full_name)")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (application.error)
    throw new Error(`Could not load the application: ${application.error.message}`);
  if (registrations.error) {
    throw new Error(`Could not load registrations: ${registrations.error.message}`);
  }
  if (notes.error) throw new Error(`Could not load notes: ${notes.error.message}`);

  return {
    student,
    application: application.data,
    registrations: registrations.data,
    notes: notes.data,
  };
}

export type StudentFile = NonNullable<Awaited<ReturnType<typeof getStudentFile>>>;
