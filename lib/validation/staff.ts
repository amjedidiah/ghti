import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

// Staff accounts (Stage 3, step 3.1). Pure; tested in staff.test.ts.

type AppRole = Database["public"]["Enums"]["app_role"];

export const STAFF_ROLES = ["lecturer", "admin"] as const satisfies readonly AppRole[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  lecturer: "Lecturer",
  admin: "Admin",
};

export const inviteStaffSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter their full name.")
    .max(200, "Keep the name under 200 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter their email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter a valid email address, like name@example.com.")),
  role: z.enum(STAFF_ROLES, "Choose a role."),
});

export type InviteStaffValues = z.input<typeof inviteStaffSchema>;

/** "applicant" here means "no staff access" (the account stays, the role goes). */
export const staffRoleSchema = z.object({
  role: z.enum(["lecturer", "admin", "applicant"], "Choose a role."),
});

/** Why an existing account cannot simply be invited as staff, or null when it can. */
export function inviteBlocker(
  existing: { role: AppRole; confirmed: boolean } | null,
): string | null {
  if (!existing) return null;
  if (existing.role === "admin" || existing.role === "lecturer") {
    return existing.confirmed
      ? "This person is already on the staff list."
      : "This person has already been invited. Use “Resend invitation” on the staff list.";
  }
  if (existing.role === "student") {
    return "This email belongs to a student's account. Staff need their own email address.";
  }
  return "This email belongs to an applicant's account. Staff need their own email address.";
}

/** Has this staff member accepted their invitation (confirmed their email)? */
export function staffStatus(account: {
  confirmed_at: string | null;
  last_sign_in_at: string | null;
}): "active" | "invited" {
  return account.confirmed_at || account.last_sign_in_at ? "active" : "invited";
}
