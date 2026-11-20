import "server-only";

import {
  APPLICATION_HEADERS,
  applicationRow,
  keepResult,
  RESULT_HEADERS,
  resultRow,
  sortResults,
  STUDENT_HEADERS,
  studentRow,
  type ExportFilters,
  type ExportKind,
  type ResultExportRow,
} from "@/lib/exports";
import type { CsvValue } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

// Data for CSV exports, read as the signed-in admin (RLS applies). Supabase
// returns at most 1,000 rows per request, so each export reads page by page.

const PAGE = 1000;

async function readAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Could not read the export: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

const num = (value: number | string | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

export type ExportTable = { headers: readonly string[]; rows: CsvValue[][] };

export async function buildExport<K extends ExportKind>(
  kind: K,
  filters: ExportFilters[K],
): Promise<ExportTable> {
  const supabase = await createClient();

  if (kind === "applications") {
    const { status } = filters as ExportFilters["applications"];
    const rows = await readAll((from, to) => {
      let query = supabase
        .from("applications")
        .select("*, programme:programmes(title), intake:terms(name, session)")
        .order("submitted_at", { ascending: true, nullsFirst: false })
        .order("created_at")
        .range(from, to);
      if (status) query = query.eq("status", status);
      return query;
    });
    return { headers: APPLICATION_HEADERS, rows: rows.map(applicationRow) };
  }

  if (kind === "students") {
    const { status, programmeId } = filters as ExportFilters["students"];
    const rows = await readAll((from, to) => {
      let query = supabase
        .from("students")
        .select(
          "matric_no, status, created_at, profile:profiles!students_id_fkey(full_name), programme:programmes(title), entry_term:terms(name, session), application:applications!students_application_id_fkey(email, phone)",
        )
        .order("matric_no")
        .range(from, to);
      if (status) query = query.eq("status", status);
      if (programmeId) query = query.eq("programme_id", programmeId);
      return query;
    });
    return { headers: STUDENT_HEADERS, rows: rows.map(studentRow) };
  }

  const { termId, includeDrafts } = filters as ExportFilters["results"];
  const registrations = await readAll((from, to) =>
    supabase
      .from("registrations")
      .select(
        "id, student:students(matric_no, profile:profiles!students_id_fkey(full_name)), offering:course_offerings!inner(term_id, course:courses(code, title, credit_units)), grade:grades(ca_score, exam_score, total, letter, grade_point, status)",
      )
      .eq("offering.term_id", termId)
      .order("id")
      .range(from, to),
  );
  const results: ResultExportRow[] = registrations.map((registration) => ({
    matricNo: registration.student?.matric_no ?? "",
    name: registration.student?.profile?.full_name ?? "",
    code: registration.offering.course?.code ?? "",
    title: registration.offering.course?.title ?? "",
    creditUnits: registration.offering.course?.credit_units ?? 0,
    grade: registration.grade
      ? {
          ca_score: num(registration.grade.ca_score),
          exam_score: num(registration.grade.exam_score),
          total: num(registration.grade.total),
          letter: registration.grade.letter,
          grade_point: num(registration.grade.grade_point),
          status: registration.grade.status,
        }
      : null,
  }));
  return {
    headers: RESULT_HEADERS,
    rows: sortResults(results.filter((row) => keepResult(row, includeDrafts))).map(resultRow),
  };
}

/** The latest exports, newest first, with who made them. */
export async function getRecentExports(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("export_log")
    .select(
      "id, kind, filters, row_count, exported_at, exporter:profiles!export_log_exported_by_fkey(full_name)",
    )
    .order("exported_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load the export log: ${error.message}`);
  return data;
}
