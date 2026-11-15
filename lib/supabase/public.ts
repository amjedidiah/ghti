import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Anonymous Supabase client for PUBLIC data (published programmes, site text).
 *
 * It reads no cookies and carries no session, so it is safe inside `"use cache"`
 * functions: every visitor gets the same result. RLS applies as the `anon` role.
 * Never use it for anything that depends on who is signed in; use
 * `@/lib/supabase/server` for that.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
