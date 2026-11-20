import "server-only";

import { createClient } from "@/lib/supabase/server";

// Staff reads for admins (staff_accounts() checks the caller is an admin).

/** Every lecturer and admin, with email and invitation state. */
export async function listStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_accounts");
  if (error) throw new Error(`Could not load staff: ${error.message}`);
  return data;
}

/** Lecturers only, by name: the people who can be assigned to a course. */
export async function listLecturers() {
  const staff = await listStaff();
  return staff
    .filter((person) => person.role === "lecturer")
    .map((person) => ({ id: person.id, name: person.full_name || person.email }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
