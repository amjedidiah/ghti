import { timingSafeEqual } from "node:crypto";

import { createPublicClient } from "@/lib/supabase/public";

/**
 * Daily ping (vercel.json `crons`) so the free Supabase project never pauses
 * after 7 idle days. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 * Reads one public row only; touches no personal data.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = `Bearer ${secret ?? ""}`;
  const given = request.headers.get("authorization") ?? "";
  const authorised =
    Boolean(secret) &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!authorised) return new Response("Unauthorized", { status: 401 });

  const { error } = await createPublicClient().from("programmes").select("id").limit(1);
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}
