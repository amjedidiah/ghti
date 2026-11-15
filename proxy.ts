import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs before every matched request.
 *
 * Today: refreshes the Supabase session cookie.
 *
 * TODO: guard the portals by role and redirect to sign-in when signed out.
 *   /apply  -> applicant  (Stage 1, step 1.2)
 *   /admin  -> admin      (Stage 1, step 1.2)
 *   /portal -> student    (Stage 2, step 2.2)
 *   /teach  -> lecturer   (Stage 3, step 3.1)
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
