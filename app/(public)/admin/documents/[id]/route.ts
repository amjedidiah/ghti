import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Signed links expire after 10 minutes (development plan, Storage). */
const SIGNED_URL_SECONDS = 600;

/**
 * Admin-only door to an applicant's document: logs the view, then redirects to
 * a short-lived signed URL. Never link to storage directly.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/admin/documents/[id]">,
) {
  await requireRole("admin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!document) return new Response("Not found", { status: 404 });

  // Log first: no log row, no link.
  const { error: logError } = await supabase.from("document_views").insert({ document_id: id });
  if (logError) return new Response("Could not open the document", { status: 500 });

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.storage_path, SIGNED_URL_SECONDS);
  if (error || !signed) return new Response("Could not open the document", { status: 500 });

  redirect(signed.signedUrl);
}
