import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

import { rowToValues } from "@/lib/applications/mapping";
import type { CsvValue } from "@/lib/csv";
import type { Database } from "@/lib/supabase/database.types";
import { STUDENT_STATUS_LABELS, STUDENT_STATUSES } from "@/lib/validation/students";

// CSV exports for admins (Stage 3, step 3.5): filters, columns and rows.
// Pure; tested in exports.test.ts. Every export is logged (export_log) by the
// route that serves it. Filters carry ids and statuses only, never names.

type Tables = Database["public"]["Tables"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];
type GradeStatus = Database["public"]["Enums"]["grade_status"];

export const EXPORT_KINDS = ["applications", "students", "results"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "admitted",
  "rejected",
  "withdrawn",
] as const satisfies readonly ApplicationStatus[];

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  admitted: "Admitted",
  rejected: "Not admitted",
  withdrawn: "Withdrawn",
};

const GRADE_STATUS_LABELS: Record<GradeStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  published: "Published",
};

const optionalStatus = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .default(null);

const optionalId = z
  .union([z.guid(), z.literal("")])
  .transform((value) => value || null)
  .default(null);

export const exportFilterSchemas = {
  applications: z.object({ status: optionalStatus(APPLICATION_STATUSES) }),
  students: z.object({ status: optionalStatus(STUDENT_STATUSES), programmeId: optionalId }),
  results: z.object({
    termId: z.guid("Choose a term."),
    includeDrafts: z
      .enum(["1", "0", ""])
      .transform((value) => value === "1")
      .default(false),
  }),
} as const;

export type ExportFilters = {
  [K in ExportKind]: z.output<(typeof exportFilterSchemas)[K]>;
};

/** Read an export's filters from the download URL; null when they do not parse. */
export function parseExportFilters<K extends ExportKind>(
  kind: K,
  params: URLSearchParams,
): ExportFilters[K] | null {
  const parsed = exportFilterSchemas[kind].safeParse(Object.fromEntries(params));
  return parsed.success ? (parsed.data as ExportFilters[K]) : null;
}

/** Nigerian numbers as 0803 123 4567; others in international format. */
export function phoneForExport(value: string | null): string {
  if (!value) return "";
  const phone = parsePhoneNumberFromString(value);
  if (!phone) return value;
  return phone.country === "NG" ? phone.formatNational() : phone.formatInternational();
}

const date = (value: string | null) => (value ? value.slice(0, 10) : "");

// Applications --------------------------------------------------------------------------

export const APPLICATION_HEADERS = [
  "Status",
  "Submitted",
  "Decided",
  "Programme",
  "Intake",
  "Surname",
  "First name",
  "Other names",
  "Email",
  "Phone",
  "Date of birth",
  "Gender",
  "State of origin",
  "Nationality",
  "Address",
  "CRM branch or church",
  "Education",
  "Next of kin",
  "Relationship",
  "Next of kin phone",
  "Referee",
  "Referee position",
  "Referee phone",
  "Referee email",
  "Decision note",
] as const;

export type ApplicationExportRow = Tables["applications"]["Row"] & {
  programme: { title: string } | null;
  intake: { name: string; session: string } | null;
};

export function applicationRow(row: ApplicationExportRow): CsvValue[] {
  const values = rowToValues(row);
  return [
    APPLICATION_STATUS_LABELS[row.status],
    date(row.submitted_at),
    date(row.decided_at),
    row.programme?.title ?? "",
    row.intake ? `${row.intake.name}, ${row.intake.session}` : "",
    row.surname,
    row.first_name,
    row.other_names,
    row.email,
    phoneForExport(row.phone),
    row.date_of_birth,
    row.gender === "male" ? "Male" : row.gender === "female" ? "Female" : "",
    row.state_of_origin,
    row.nationality,
    row.address,
    row.crm_branch,
    values.education
      .map((entry) =>
        [entry.qualification, entry.institution, entry.year].filter(Boolean).join(", "),
      )
      .join("; "),
    row.next_of_kin_name,
    row.next_of_kin_relationship,
    phoneForExport(row.next_of_kin_phone),
    row.referee_name,
    row.referee_position,
    phoneForExport(row.referee_phone),
    row.referee_email,
    row.decision_note,
  ];
}

// Students ------------------------------------------------------------------------------

export const STUDENT_HEADERS = [
  "Matric number",
  "Name",
  "Programme",
  "Entry term",
  "Status",
  "Enrolled",
  "Email",
  "Phone",
] as const;

export type StudentExportRow = {
  matric_no: string;
  status: Database["public"]["Enums"]["student_status"];
  created_at: string;
  profile: { full_name: string } | null;
  programme: { title: string } | null;
  entry_term: { name: string; session: string } | null;
  application: { email: string | null; phone: string | null } | null;
};

export function studentRow(row: StudentExportRow): CsvValue[] {
  return [
    row.matric_no,
    row.profile?.full_name ?? "",
    row.programme?.title ?? "",
    row.entry_term ? `${row.entry_term.name}, ${row.entry_term.session}` : "",
    STUDENT_STATUS_LABELS[row.status],
    date(row.created_at),
    row.application?.email ?? "",
    phoneForExport(row.application?.phone ?? null),
  ];
}

// Results -------------------------------------------------------------------------------

export const RESULT_HEADERS = [
  "Matric number",
  "Name",
  "Course code",
  "Course title",
  "Credit units",
  "CA",
  "Exam",
  "Total",
  "Grade",
  "Grade point",
  "Status",
] as const;

export type ResultExportRow = {
  matricNo: string;
  name: string;
  code: string;
  title: string;
  creditUnits: number;
  grade: {
    ca_score: number | null;
    exam_score: number | null;
    total: number | null;
    letter: string | null;
    grade_point: number | null;
    status: GradeStatus;
  } | null;
};

/** One row per registration; ungraded registrations show "No grade". */
export function resultRow(row: ResultExportRow): CsvValue[] {
  const grade = row.grade;
  return [
    row.matricNo,
    row.name,
    row.code,
    row.title,
    row.creditUnits,
    grade?.ca_score ?? null,
    grade?.exam_score ?? null,
    grade?.total ?? null,
    grade?.letter ?? null,
    grade?.grade_point ?? null,
    grade ? GRADE_STATUS_LABELS[grade.status] : "No grade",
  ];
}

/** Results to include: published only, unless the admin asked for drafts too. */
export function keepResult(row: ResultExportRow, includeDrafts: boolean): boolean {
  return includeDrafts || row.grade?.status === "published";
}

/** Sort results by matric number, then course code. */
export function sortResults(rows: ResultExportRow[]): ResultExportRow[] {
  return [...rows].sort(
    (a, b) => a.matricNo.localeCompare(b.matricNo) || a.code.localeCompare(b.code),
  );
}
