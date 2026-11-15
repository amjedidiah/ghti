import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { ROLE_HOME, SIGN_IN_PATH, type AppRole } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
};

/**
 * The signed-in user and their role, or null. Reads cookies, so call it only
 * from request-time code (inside <Suspense>, Server Actions, Route Handlers).
 * Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .single();
  if (!profile) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: profile.full_name,
    role: profile.role,
  };
});

/**
 * Require a signed-in user with one of `roles`. Signed-out users go to sign
 * in; other roles go to their own home. Use at the top of every protected page
 * and Server Action: the proxy alone is not access control.
 */
export async function requireRole(...roles: AppRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
