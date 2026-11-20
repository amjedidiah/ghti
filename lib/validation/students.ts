import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

// Records admin (Stage 2, step 2.5): student search, notes and status.
// Pure; tested in students.test.ts.

export type StudentStatus = Database["public"]["Enums"]["student_status"];

export const STUDENT_STATUSES = [
  "active",
  "deferred",
  "withdrawn",
  "graduated",
] as const satisfies readonly StudentStatus[];

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Active",
  deferred: "Deferred",
  withdrawn: "Withdrawn",
  graduated: "Graduated",
};

export const STUDENT_SORTS = {
  name: "Name",
  matric: "Matric number",
  newest: "Newest first",
} as const;

export type StudentSort = keyof typeof STUDENT_SORTS;

export const STUDENTS_PAGE_SIZE = 25;

/** A uuid, or "" / null for "no filter". */
const optionalId = z.union([z.guid(), z.literal(""), z.null()]).transform((value) => value || null);

/** The search form. Sent to a Server Action, never put in the URL (names are personal data). */
export const studentSearchSchema = z.object({
  query: z.string().trim().max(100).default(""),
  programmeId: optionalId.default(null),
  entryTermId: optionalId.default(null),
  status: z
    .enum(STUDENT_STATUSES)
    .or(z.literal("").transform(() => null))
    .nullable()
    .default(null),
  sort: z.enum(["name", "matric", "newest"]).catch("name").default("name"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
});

export type StudentSearch = z.output<typeof studentSearchSchema>;
export type StudentSearchInput = z.input<typeof studentSearchSchema>;

export const DEFAULT_STUDENT_SEARCH: StudentSearch = studentSearchSchema.parse({});

/** Page count for a result total (at least one page). */
export function pageCount(total: number, pageSize = STUDENTS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export const recordNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write the note first.")
    .max(2000, "Keep the note under 2,000 characters."),
});

export type RecordNoteValues = z.input<typeof recordNoteSchema>;

/** A student's request to correct their record (Stage 3, step 3.5). */
export const changeRequestSchema = z.object({
  body: z
    .string()
    .trim()
    .min(10, "Say what is wrong and what it should be (at least 10 characters).")
    .max(1000, "Keep the request under 1,000 characters."),
});

export type ChangeRequestValues = z.input<typeof changeRequestSchema>;

/** An admin's note when resolving a change request; it goes on the student's file. */
export const resolveChangeRequestSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Say what was done, or why nothing was changed.")
    .max(800, "Keep the note under 800 characters."),
});

export type ResolveChangeRequestValues = z.input<typeof resolveChangeRequestSchema>;

/** Kinds of document an admin can add to a student's file. */
export const STUDENT_DOCUMENT_KINDS = ["transcript", "id_card", "photo", "other"] as const;

export const studentStatusSchema = z.object({
  status: z.enum(STUDENT_STATUSES, "Choose a status."),
  note: z.string().trim().max(1000, "Keep the reason under 1,000 characters.").default(""),
});

export type StudentStatusValues = z.input<typeof studentStatusSchema>;
