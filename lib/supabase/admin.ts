import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseUrl, requireEnv } from "@/lib/supabase/env";

/**
 * Supabase client with the SECRET key. It BYPASSES Row-Level Security.
 *
 * Use only where RLS genuinely cannot apply (cron jobs, staff invitations via
 * the Auth admin API). Never import from a Client Component, never expose the
 * key through a `NEXT_PUBLIC_*` variable. Always check the caller's role first.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    requireEnv("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
