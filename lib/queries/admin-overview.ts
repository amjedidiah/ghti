import "server-only";

import { summariseRecords } from "@/lib/admin-overview";
import { createClient } from "@/lib/supabase/server";
import { termLabel } from "@/lib/validation/academics";

// Counts for the /admin overview, as the signed-in admin (RLS applies).

export async function getRecordsOverview() {
  const supabase = await createClient();
  const [students, unpublished, published, notices, terms] = await Promise.all([
    supabase.from("students").select("status, programme:programmes(title)"),
    supabase
      .from("grades")
      .select("status, registration:registrations!inner(offering:course_offerings!inner(term_id))")
      .neq("status", "published"),
    supabase
      .from("grades")
      .select(
        "registration:registrations!inner(student_id, offering:course_offerings!inner(term_id))",
      )
      .eq("status", "published"),
    supabase.from("result_notices").select("student_id, term_id"),
    supabase
      .from("terms")
      .select("id, session, name")
      .order("session", { ascending: false })
      .order("starts_on", { ascending: false, nullsFirst: false })
      .order("name"),
  ]);
  for (const result of [students, unpublished, published, notices, terms]) {
    if (result.error) throw new Error(`Could not load the overview: ${result.error.message}`);
  }

  return summariseRecords({
    students: (students.data ?? []).map((row) => ({
      programme: row.programme?.title ?? "No programme",
      status: row.status,
    })),
    unpublishedGrades: (unpublished.data ?? []).flatMap((row) =>
      row.status === "published"
        ? []
        : [{ termId: row.registration.offering.term_id, status: row.status }],
    ),
    publishedGrades: (published.data ?? []).map((row) => ({
      studentId: row.registration.student_id,
      termId: row.registration.offering.term_id,
    })),
    notices: (notices.data ?? []).map((row) => ({
      studentId: row.student_id,
      termId: row.term_id,
    })),
    terms: (terms.data ?? []).map((term) => ({ id: term.id, label: termLabel(term) })),
  });
}
