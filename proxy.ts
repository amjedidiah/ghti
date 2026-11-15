import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs before every matched request.
 *
 * Today: refreshes the Supabase session cookie.
 *
 * TODO (Phase 1.4, once `profiles.role` exists): guard the portals by role and
 * redirect to sign-in when signed out.
 *   /apply  -> applicant
 *   /portal -> student
 *   /teach  -> lecturer
 *   /admin  -> admin
 * This is a UX convenience only. RLS and the per-action role checks in Server
 * Actions remain the real access control.
 */
export async function proxy(request: NextRequest) {
  const { response } = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
