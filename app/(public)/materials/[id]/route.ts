import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { SIGN_IN_PATH } from "@/lib/auth/rules";
import { driveViewUrl } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

/**
 * The only way to open a course material: read it as the signed-in user, so
 * RLS decides (its students, its lecturer, admins), then redirect to Google
 * Drive. Raw Drive links are never put in a page.
 */
export async function GET(_request: NextRequest, { params }: RouteContext<"/materials/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(`/materials/${id}`)}`);
  if (!isUuid(id)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("materials")
    .select("drive_kind, drive_file_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });

  redirect(driveViewUrl(data.drive_kind, data.drive_file_id));
}
