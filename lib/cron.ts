import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * True when a request comes from Vercel Cron: it sends
 * `Authorization: Bearer $CRON_SECRET`. Constant-time comparison; false when
 * CRON_SECRET is unset.
 */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
