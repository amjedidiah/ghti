import { isCronRequest } from "@/lib/cron";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Daily ping (vercel.json `crons`) so the free Supabase project never pauses
 * after 7 idle days. Reads one public row only; touches no personal data.
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response("Unauthorized", { status: 401 });

  const { error } = await createPublicClient().from("programmes").select("id").limit(1);
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}
