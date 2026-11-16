import { z } from "zod";

import { PROGRAMME_LEVELS } from "@/lib/programmes";
import type { Database } from "@/lib/supabase/database.types";

// Admin forms for programmes, courses and terms (Stage 2, step 2.1). Form
// values are strings, as submitted; the to*Row helpers turn them into database
// rows and the row*Values helpers go the other way. The database constraints
// are the final check.

type Tables = Database["public"]["Tables"];

export const PROGRAMME_STATUSES = ["draft", "published", "archived"] as const;

export const PROGRAMME_STATUS_LABELS: Record<(typeof PROGRAMME_STATUSES)[number], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const text = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer.`);
const required = (max: number, message: string) => text(max).min(1, message);

/** URL slug from a title: "Ordinary Diploma in Theology" → "ordinary-diploma-in-theology". */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");
}

// Programmes -----------------------------------------------------------------------

export const programmeSchema = z.object({
  title: required(200, "Enter the programme's title."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, "Use 100 characters or fewer.")
    .refine((value) => value === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value), {
      message: "Use lower-case letters, numbers and single hyphens, like certificate-in-theology.",
    }),
  level: z.enum(PROGRAMME_LEVELS, { message: "Choose a level." }),
  duration: required(100, 'Enter the duration, like "1 year (2 semesters)".'),
  description: text(5000),
  requirements: text(5000),
  status: z.enum(PROGRAMME_STATUSES, { message: "Choose a status." }),
  position: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Enter a whole number from 0 to 999."),
});

export type ProgrammeValues = z.infer<typeof programmeSchema>;

export function toProgrammeRow(values: ProgrammeValues): Tables["programmes"]["Insert"] {
  return {
    title: values.title,
    slug: values.slug || slugify(values.title),
    level: values.level,
    duration: values.duration,
    description: values.description,
    requirements: values.requirements,
    status: values.status,
    position: Number(values.position),
  };
}

export function programmeRowValues(
  row: Pick<
    Tables["programmes"]["Row"],
    "title" | "slug" | "level" | "duration" | "description" | "requirements" | "status" | "position"
  >,
): ProgrammeValues {
  return {
    title: row.title,
    slug: row.slug,
    level: row.level,
    duration: row.duration,
    description: row.description,
    requirements: row.requirements,
    status: row.status,
    position: String(row.position),
  };
}

export const emptyProgrammeValues: ProgrammeValues = {
  title: "",
  slug: "",
  level: "certificate",
  duration: "",
  description: "",
  requirements: "",
  status: "draft",
  position: "1",
};

// Courses --------------------------------------------------------------------------

export const courseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value.replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, 'Enter the course code, like "BIB 101".')
        .regex(
          /^[A-Z0-9][A-Z0-9 ./-]{1,19}$/,
          'Use 2 to 20 letters, numbers, spaces, ".", "/" or "-", like "BIB 101".',
        ),
    ),
  title: required(200, "Enter the course title."),
  creditUnits: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, "Enter a whole number of credit units.")
    .refine((value) => Number(value) <= 30, { message: "Use 30 credit units or fewer." }),
  year: z
    .string()
    .trim()
    .regex(/^[1-8]$/, "Choose a year from 1 to 8."),
  semester: z.enum(["1", "2", "3"], { message: "Choose a semester." }),
});

export type CourseValues = z.input<typeof courseSchema>;

export function toCourseRow(
  values: z.output<typeof courseSchema>,
): Omit<Tables["courses"]["Insert"], "programme_id"> {
  return {
    code: values.code,
    title: values.title,
    credit_units: Number(values.creditUnits),
    year: Number(values.year),
    semester: Number(values.semester),
  };
}

export function courseRowValues(
  row: Pick<Tables["courses"]["Row"], "code" | "title" | "credit_units" | "year" | "semester">,
): CourseValues {
  return {
    code: row.code,
    title: row.title,
    creditUnits: String(row.credit_units),
    year: String(row.year),
    semester: String(row.semester) as CourseValues["semester"],
  };
}

export const emptyCourseValues: CourseValues = {
  code: "",
  title: "",
  creditUnits: "3",
  year: "1",
  semester: "1",
};

// Terms ----------------------------------------------------------------------------

const isoDate = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Enter a date, or leave it empty.",
  });

export const termSchema = z
  .object({
    session: z
      .string()
      .trim()
      .regex(/^\d{4}\/\d{4}$/, 'Enter the session as two years, like "2026/2027".')
      .refine(
        (value) => {
          const [first, second] = value.split("/").map(Number);
          return second === first + 1;
        },
        { message: 'The second year follows the first, like "2026/2027".' },
      ),
    name: required(100, 'Enter the term name, like "First semester".'),
    startsOn: isoDate,
    endsOn: isoDate,
    acceptingApplications: z.enum(["yes", "no"], { message: "Choose yes or no." }),
  })
  .refine((values) => !values.startsOn || !values.endsOn || values.endsOn >= values.startsOn, {
    message: "The end date must be on or after the start date.",
    path: ["endsOn"],
  });

export type TermValues = z.infer<typeof termSchema>;

export function toTermRow(values: TermValues): Tables["terms"]["Insert"] {
  return {
    session: values.session,
    name: values.name,
    starts_on: values.startsOn || null,
    ends_on: values.endsOn || null,
    accepting_applications: values.acceptingApplications === "yes",
  };
}

export function termRowValues(
  row: Pick<
    Tables["terms"]["Row"],
    "session" | "name" | "starts_on" | "ends_on" | "accepting_applications"
  >,
): TermValues {
  return {
    session: row.session,
    name: row.name,
    startsOn: row.starts_on ?? "",
    endsOn: row.ends_on ?? "",
    acceptingApplications: row.accepting_applications ? "yes" : "no",
  };
}

export const emptyTermValues: TermValues = {
  session: "",
  name: "",
  startsOn: "",
  endsOn: "",
  acceptingApplications: "no",
};

/** "First semester, 2026/2027". */
export function termLabel(term: { name: string; session: string }): string {
  return `${term.name}, ${term.session}`;
}
