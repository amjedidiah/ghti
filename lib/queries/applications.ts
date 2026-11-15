import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export const TERMS_TAG = "terms";

export type Intake = { id: string; label: string };

/** Intakes currently accepting applications (public data, cached). */
export async function getOpenIntakes(): Promise<Intake[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TERMS_TAG);

  const { data, error } = await createPublicClient()
    .from("terms")
    .select("id, session, name")
    .eq("accepting_applications", true)
    .order("starts_on", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Could not load intakes: ${error.message}`);
  return data.map((term) => ({ id: term.id, label: `${term.name}, ${term.session}` }));
}

/**
 * The signed-in applicant's most recent application with its documents, or
 * null. Request-time data: call inside <Suspense> or a Server Action.
 */
export async function getMyApplication(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "*, programme:programmes(title, level), intake:terms(session, name), documents(id, kind, file_name, size_bytes, mime, created_at)",
    )
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Could not load your application: ${error.message}`);
  return data;
}

export type MyApplication = NonNullable<Awaited<ReturnType<typeof getMyApplication>>>;
