"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";
import { parseFormData } from "@/lib/validation/form";
import {
  inviteBlocker,
  inviteStaffSchema,
  STAFF_ROLE_LABELS,
  staffRoleSchema,
} from "@/lib/validation/staff";

// Staff accounts (Stage 3, step 3.1). Staff are invited, never self-registered.
// The invitation needs the Auth admin API, so it uses the secret key, and only
// after requireRole("admin"); everything else runs as the signed-in admin, so
// RLS and the database checks apply. Never log names or emails.

const id = z.guid();
const GENERIC = "Something went wrong. Please try again.";

/** Invite a lecturer or admin: Supabase emails them a link to choose a password. */
export async function inviteStaff(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = parseFormData(inviteStaffSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { fullName, email, role } = parsed.data;

  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase.rpc("account_by_email", {
    p_email: email,
  });
  if (lookupError) return { status: "error", message: GENERIC };
  const blocker = inviteBlocker(existing[0] ?? null);
  if (blocker) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { email: [blocker] },
    };
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  if (inviteError || !invited.user) {
    console.error(`[staff] invitation failed: ${inviteError?.code ?? "no user"}`);
    return {
      status: "error",
      message:
        inviteError?.status === 429
          ? "Too many emails have been sent just now. Please try again later."
          : "We could not send the invitation. Please try again.",
    };
  }

  // The sign-up trigger made an applicant profile; give it the staff role.
  // service_role may change roles (guard_profile_role).
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", invited.user.id);
  if (roleError) {
    // Do not leave an invited account without its role.
    await admin.auth.admin.deleteUser(invited.user.id);
    return { status: "error", message: "We could not set up the account. Please try again." };
  }

  revalidatePath("/admin/users");
  return {
    status: "success",
    message: `Invitation sent. ${fullName} joins as ${STAFF_ROLE_LABELS[role].toLowerCase()} once they choose a password from the email.`,
  };
}

/** Send the invitation email again to staff who have not accepted it yet. */
export async function resendInvitation(userId: string): Promise<{ ok: boolean; message: string }> {
  await requireRole("admin");
  if (!id.safeParse(userId).success) return { ok: false, message: "Unknown account." };

  const supabase = await createClient();
  const { data: staff, error } = await supabase.rpc("staff_accounts");
  if (error) return { ok: false, message: GENERIC };
  const person = staff.find((account) => account.id === userId);
  if (!person) return { ok: false, message: "Unknown account. Refresh the page." };
  if (person.confirmed_at || person.last_sign_in_at) {
    return {
      ok: false,
      message: "They have already accepted. They can reset their password from the sign-in page.",
    };
  }

  const { error: inviteError } = await createAdminClient().auth.admin.inviteUserByEmail(
    person.email,
    { data: { full_name: person.full_name } },
  );
  if (inviteError) {
    console.error(`[staff] resend failed: ${inviteError.code ?? inviteError.status}`);
    return { ok: false, message: "We could not resend the invitation. Please try again later." };
  }
  return { ok: true, message: "Invitation sent again." };
}

/** Lecturer <-> admin, or remove staff access. Checks live in set_staff_role(). */
export async function changeStaffRole(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(userId).success) return { status: "error", message: "Unknown account." };
  const parsed = parseFormData(staffRoleSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_staff_role", {
    p_user_id: userId,
    p_role: parsed.data.role,
  });
  revalidatePath("/admin/users");

  if (!error) {
    return {
      status: "success",
      message:
        parsed.data.role === "applicant"
          ? "Staff access removed."
          : `Now ${STAFF_ROLE_LABELS[parsed.data.role].toLowerCase()}.`,
    };
  }
  if (error.code === "55000") {
    // The database explains which rule applies (own role, same role, last admin).
    return { status: "error", message: `${error.message}.` };
  }
  return {
    status: "error",
    message: error.code === "42501" ? "Only admins can change staff roles." : GENERIC,
  };
}
