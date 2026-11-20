import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { readSiteContent, type SiteContent } from "@/lib/site-content";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

/** Cache tag for the public text; updateTag it when an admin saves (lib/admin/site-content.ts). */
export const SITE_CONTENT_TAG = "site-content";

/** GHTI's public text, the same for every visitor: cached, refreshed when an admin saves. */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(SITE_CONTENT_TAG);

  const { data, error } = await createPublicClient().from("site_content").select("key, value");
  if (error) throw new Error(`Could not load the site text: ${error.message}`);
  return readSiteContent(data);
}

/** For /admin/content: every piece of text, and when and by whom each was last changed. */
export async function getSiteContentForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("key, value, updated_at, editor:profiles(full_name)");
  if (error) throw new Error(`Could not load the site text: ${error.message}`);
  return {
    content: readSiteContent(data),
    changed: new Map(
      data.map((row) => [row.key, { at: row.updated_at, by: row.editor?.full_name ?? null }]),
    ),
  };
}
