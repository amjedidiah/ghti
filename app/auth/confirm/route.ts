import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { ROLE_HOME, SIGN_IN_PATH, safeNextPath } from "@/lib/auth/rules";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const EMAIL_LINK_TYPES = new Set<EmailOtpType>([
  "email",
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
]);

/**
 * Landing point for every auth email link. Two shapes arrive here:
 *
 * - `?token_hash=…&type=…` from our own templates (supabase/templates). Works
 *   even when the email is opened in a different browser or app.
 * - `?code=…` from Supabase's default templates, used in the cloud until
 *   custom SMTP (Resend) unlocks our templates. Works only in the browser that
 *   asked for the email, because it needs the PKCE verifier cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const supabase = await createClient();

  if (tokenHash && type && EMAIL_LINK_TYPES.has(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) redirect(await destination(supabase, data.user.id, next));
    redirect(`${SIGN_IN_PATH}?error=link-expired`);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) redirect(await destination(supabase, data.user.id, next));
    // The email is often already confirmed at this point; only the sign-in
    // part failed (e.g. the link was opened in another browser).
    redirect(`${SIGN_IN_PATH}?error=link-other-browser`);
  }

  redirect(`${SIGN_IN_PATH}?error=link-expired`);
}

async function destination(
  supabase: SupabaseClient<Database>,
  userId: string,
  next: string | null,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return safeNextPath(next, ROLE_HOME[profile?.role ?? "applicant"]);
}
