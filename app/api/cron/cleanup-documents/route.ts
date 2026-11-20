import { isCronRequest } from "@/lib/cron";
import {
  CLEANUP_BATCH_LIMIT,
  REJECTED_DOCUMENTS_KEEP_DAYS,
  rejectedDocumentsCutoff,
} from "@/lib/retention";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily (vercel.json `crons`): delete the documents of applications rejected
 * more than REJECTED_DOCUMENTS_KEEP_DAYS ago, files first, then their rows
 * (their view log goes with them). The application itself stays. Does
 * nothing until GHTI sets the period (client input #19). Uses the secret key:
 * no user is signed in, and RLS would hide other people's files. Logs counts
 * only, never names or paths.
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response("Unauthorized", { status: 401 });

  const cutoff = rejectedDocumentsCutoff(new Date(), REJECTED_DOCUMENTS_KEEP_DAYS);
  if (!cutoff) return Response.json({ ok: true, deleted: 0, skipped: "no retention period set" });

  const supabase = createAdminClient();
  const { data: due, error } = await supabase
    .from("documents")
    .select("id, storage_path, application:applications!inner(status, decided_at)")
    .eq("application.status", "rejected")
    .lt("application.decided_at", cutoff.toISOString())
    .limit(CLEANUP_BATCH_LIMIT);
  if (error) {
    console.error(`[cleanup] could not list documents: ${error.code}`);
    return Response.json({ ok: false }, { status: 500 });
  }
  if (due.length === 0) return Response.json({ ok: true, deleted: 0 });

  // Files first: a row without a file is harmless; a file without a row is lost track of.
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove(due.map((doc) => doc.storage_path));
  if (storageError) {
    console.error(`[cleanup] could not remove files: ${storageError.name}`);
    return Response.json({ ok: false }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .in(
      "id",
      due.map((doc) => doc.id),
    );
  if (deleteError) {
    console.error(`[cleanup] removed files but not rows: ${deleteError.code}`);
    return Response.json({ ok: false }, { status: 500 });
  }

  console.info(`[cleanup] deleted ${due.length} rejected applicants' documents`);
  return Response.json({ ok: true, deleted: due.length, more: due.length === CLEANUP_BATCH_LIMIT });
}
