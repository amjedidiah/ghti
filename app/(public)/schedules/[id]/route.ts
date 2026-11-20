import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { driveViewUrl } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

/**
 * Open a lecture schedule: public when its programme is published (RLS), so
 * anyone reading a programme page can see the timetable. Admins also reach
 * drafts. Redirects to Google Drive; the link itself is never in a page.
 */
export async function GET(_request: NextRequest, { params }: RouteContext<"/schedules/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("lecture_schedules")
    .select("drive_kind, drive_file_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });

  redirect(driveViewUrl(data.drive_kind, data.drive_file_id));
}
