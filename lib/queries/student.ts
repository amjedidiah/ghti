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
