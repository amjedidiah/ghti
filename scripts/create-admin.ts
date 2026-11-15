/**
 * Create (or promote) an admin account. Admins are never self-registered.
 *
 *   bun run admin:create --email registrar@example.org --name "Full Name"
 *
 * Sends a Supabase invitation email; the link lands on /reset-password so the
 * new admin chooses their own password. An existing account is promoted.
 *
 * Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. Bun loads .env.local
 * (the local stack) by default; to target the cloud project, pass both as
 * environment variables, which take precedence. Never commit cloud keys.
 */
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";

import type { Database } from "@/lib/supabase/database.types";

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});

const email = values.email?.trim().toLowerCase();
const fullName = values.name?.trim() ?? "";
if (!email || !email.includes("@")) {
  console.error('Usage: bun run admin:create --email person@example.org --name "Full Name"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (see .env.example).");
  process.exit(1);
}

const supabase = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserId(address: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === address);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

let userId = await findUserId(email);
let invited = false;

if (!userId) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  if (error) {
    console.error(`Could not invite: ${error.message}`);
    process.exit(1);
  }
  userId = data.user.id;
  invited = true;
}

const update: Database["public"]["Tables"]["profiles"]["Update"] = { role: "admin" };
if (fullName) update.full_name = fullName;

const { error: roleError } = await supabase.from("profiles").update(update).eq("id", userId);
if (roleError) {
  console.error(`Could not set the admin role: ${roleError.message}`);
  process.exit(1);
}

console.log(
  invited
    ? "Invitation sent. The new admin sets a password from the email link."
    : "Existing account promoted to admin.",
);
