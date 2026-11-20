import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<AppRole, string> = {
  applicant: "/apply",
  student: "/portal",
  lecturer: "/teach",
  admin: "/admin",
};

export const SIGN_IN_PATH = "/sign-in";

/** Areas only one role may enter. */
const ROLE_AREAS: { prefix: string; role: AppRole; except?: string[] }[] = [
  { prefix: "/apply", role: "applicant", except: ["/apply/register"] },
  { prefix: "/portal", role: "student" },
  { prefix: "/teach", role: "lecturer" },
  { prefix: "/admin", role: "admin" },
];

/** Pages for any signed-in user. */
const SIGNED_IN_PAGES = ["/reset-password"];

/** Pages that make no sense once signed in; send the user to their home instead. */
const GUEST_PAGES = [SIGN_IN_PATH, "/apply/register", "/forgot-password"];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Return a same-site path that is safe to redirect to, or `fallback`.
 * Rejects absolute URLs, protocol-relative `//host` and `/\host` tricks.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  try {
    const base = "http://ghti.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Does the path need a signed-in user (any role)? */
export function requiresSignIn(pathname: string): boolean {
  return (
    SIGNED_IN_PAGES.some((page) => matches(pathname, page)) ||
    ROLE_AREAS.some(
      (area) => matches(pathname, area.prefix) && !area.except?.some((p) => matches(pathname, p)),
    )
  );
}

/** Is the path a guest-only page (sign in, register, forgot password)? */
export function isGuestPage(pathname: string): boolean {
  return GUEST_PAGES.some((page) => matches(pathname, page));
}

/**
 * Decide where, if anywhere, to redirect a request. `role` is null when signed
 * out. Returns a path to redirect to, or null to let the request through.
 *
 * This is navigation only. RLS and server-side role checks are the real
 * access control.
 */
export function guardRedirect(pathname: string, search: string, role: AppRole | null) {
  if (isGuestPage(pathname)) {
    return role ? ROLE_HOME[role] : null;
  }

  if (!requiresSignIn(pathname)) return null;

  if (!role) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return `${SIGN_IN_PATH}?next=${next}`;
  }

  const area = ROLE_AREAS.find((a) => matches(pathname, a.prefix));
  if (area && area.role !== role) return ROLE_HOME[role];

  return null;
}
