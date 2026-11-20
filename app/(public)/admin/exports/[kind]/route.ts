import type { NextRequest } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { exportFileName, toCsv } from "@/lib/csv";
import { EXPORT_KINDS, parseExportFilters, type ExportKind } from "@/lib/exports";
import { buildExport } from "@/lib/queries/admin-exports";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-only CSV download. Builds the file on request (never stored), logs the
 * export in export_log (who, what, filters, rows, when), then sends it. No
 * log row, no file. The file name carries the kind and date, never a name.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/admin/exports/[kind]">) {
  await requireRole("admin");
  const { kind } = await params;
  if (!(EXPORT_KINDS as readonly string[]).includes(kind)) {
    return new Response("Not found", { status: 404 });
  }
  const exportKind = kind as ExportKind;
  const filters = parseExportFilters(exportKind, request.nextUrl.searchParams);
  if (!filters) return new Response("Those filters did not look right.", { status: 400 });

  let table;
  try {
    table = await buildExport(exportKind, filters);
  } catch {
    return new Response("Could not build the export. Please try again.", { status: 500 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("export_log")
    .insert({ kind: exportKind, filters, row_count: table.rows.length });
  if (error)
    return new Response("Could not record the export, so it was not sent.", { status: 500 });

  return new Response(toCsv(table.headers, table.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(exportKind, new Date())}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
