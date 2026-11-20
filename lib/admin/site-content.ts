"use server";

import { updateTag } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { SITE_CONTENT_TAG } from "@/lib/queries/site-content";
import { isSiteContentName, parseSiteContentForm, SITE_CONTENT_FIELDS } from "@/lib/site-content";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";

// Site content (Stage 3, step 3.5): admins edit the public text. RLS lets only
// admins write; the trigger stamps who and when. Saving refreshes every
// cached page that shows it.

const GENERIC = "Something went wrong. Please try again.";

/** Save one piece of content; an empty answer clears it (the page shows its placeholder). */
export async function updateSiteContent(
  name: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  if (!isSiteContentName(name)) return { status: "error", message: GENERIC };
  const parsed = parseSiteContentForm(name, formData);
  if (!parsed.ok) {
    return { status: "error", message: parsed.message, fieldErrors: { value: [parsed.message] } };
  }

  const { key } = SITE_CONTENT_FIELDS[name];
  const supabase = await createClient();
  const { error } =
    parsed.value === null
      ? await supabase.from("site_content").delete().eq("key", key)
      : await supabase.from("site_content").upsert({ key, value: parsed.value });
  if (error) return { status: "error", message: GENERIC };

  updateTag(SITE_CONTENT_TAG);
  return {
    status: "success",
    message:
      parsed.value === null
        ? "Cleared. The page shows “Waiting for GHTI” until it is filled in again."
        : "Saved. The public pages show it now.",
  };
}
