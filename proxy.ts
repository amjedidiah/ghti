import { NextResponse, type NextRequest } from "next/server";

import { guardRedirect, isGuestPage, requiresSignIn, type AppRole } from "@/lib/auth/rules";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs before every matched request: refreshes the Supabase session cookie and
 * steers users to the right area for their role (rules in lib/auth/rules.ts).
 *
 * This is navigation only. RLS and the role checks in pages and Server Actions
 * remain the real access control.
 */
export async function proxy(request: NextRequest) {
  const { response, supabase, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!isGuestPage(pathname) && !requiresSignIn(pathname)) return response;

  let role: AppRole | null = null;
  if (claims?.sub) {
    const { data } = await supabase.from("profiles").select("role").eq("id", claims.sub).single();
    role = data?.role ?? null;
  }

  const target = guardRedirect(pathname, search, role);
  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Keep any session cookies the refresh just set.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
