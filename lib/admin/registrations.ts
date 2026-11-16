"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { describeRegistrations, planRegistrations } from "@/lib/registrations";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";

// Registrations (Stage 2, step 2.1). Every action re-checks the role; RLS is
// the final word. Ids from the form are re-checked against the database, so a
// tampered form can only register the programme's own active students on the
// term's own offerings.

// Format-only id check: any hex id the database could hold, not just RFC 4122 versions.
const uuid = z.guid();
const GENERIC = "Something went wrong. Please try again.";

function ids(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && uuid.safeParse(value).success);
}

/** Register every ticked student on every ticked offering of the term. */
export async function registerStudents(
  termId: string,
  programmeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(termId).success || !uuid.safeParse(programmeId).success) {
    return { status: "error", message: "Unknown term or programme. Refresh the page." };
  }
  const studentIds = ids(formData, "studentId");
  const offeringIds = ids(formData, "offeringId");
  if (studentIds.length === 0 || offeringIds.length === 0) {
    return { status: "error", message: "Tick at least one student and one course." };
  }

  const supabase = await createClient();
  const [offerings, students] = await Promise.all([
    supabase
      .from("course_offerings")
      .select("id, course:courses!inner(programme_id)")
      .eq("term_id", termId)
      .eq("course.programme_id", programmeId)
      .in("id", offeringIds),
    supabase
      .from("students")
      .select("id")
      .eq("programme_id", programmeId)
      .eq("status", "active")
      .in("id", studentIds),
  ]);
  if (offerings.error || students.error) return { status: "error", message: GENERIC };

  const validOfferings = offerings.data.map((offering) => offering.id);
  const validStudents = students.data.map((student) => student.id);
  if (validOfferings.length === 0 || validStudents.length === 0) {
    return {
      status: "error",
      message: "Those courses or students have changed. Refresh the page.",
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("registrations")
    .select("student_id, offering_id")
    .in("offering_id", validOfferings)
    .in("student_id", validStudents);
  if (existingError) return { status: "error", message: GENERIC };

  const plan = planRegistrations(validStudents, validOfferings, existing);
  let added = 0;
  // Batches keep each request small; ignoreDuplicates makes a double submit harmless.
  for (let start = 0; start < plan.add.length; start += 500) {
    const { data, error } = await supabase
      .from("registrations")
      .upsert(plan.add.slice(start, start + 500), {
        onConflict: "student_id,offering_id",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      revalidatePath("/admin/offerings", "layout");
      return {
        status: "error",
        message:
          error.code === "42501"
            ? "Only admins can do this."
            : `${describeRegistrations(added, plan.alreadyRegistered)} The rest could not be saved; please try again.`,
      };
    }
    added += data.length;
  }

  revalidatePath("/admin/offerings", "layout");
  return {
    status: "success",
    message: describeRegistrations(added, plan.alreadyRegistered + (plan.add.length - added)),
  };
}

export type RemoveResult = { ok: true } | { ok: false; message: string };

/** Remove one student from one offering. */
export async function removeRegistration(registrationId: string): Promise<RemoveResult> {
  await requireRole("admin");
  if (!uuid.safeParse(registrationId).success) {
    return { ok: false, message: "Unknown registration. Refresh the page." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .delete()
    .eq("id", registrationId)
    .select("id");
  if (error?.code === "23503") {
    return {
      ok: false,
      message: "This student has grades for this course, so the registration cannot be removed.",
    };
  }
  if (error) return { ok: false, message: GENERIC };
  if (data.length === 0) {
    return { ok: false, message: "This registration no longer exists. Refresh the page." };
  }

  revalidatePath("/admin/offerings", "layout");
  return { ok: true };
}
