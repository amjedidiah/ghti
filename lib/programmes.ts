import type { Database } from "@/lib/supabase/database.types";

export type ProgrammeLevel = Database["public"]["Enums"]["programme_level"];

export type ProgrammeSummary = Pick<
  Database["public"]["Tables"]["programmes"]["Row"],
  "id" | "slug" | "title" | "level" | "duration" | "description"
>;

export type Programme = ProgrammeSummary &
  Pick<Database["public"]["Tables"]["programmes"]["Row"], "requirements">;

/** Display order of levels, lowest award first. */
export const PROGRAMME_LEVELS = [
  "certificate",
  "diploma",
  "postgraduate_diploma",
] as const satisfies readonly ProgrammeLevel[];

export const LEVEL_LABELS: Record<ProgrammeLevel, { singular: string; plural: string }> = {
  certificate: { singular: "Certificate", plural: "Certificate programmes" },
  diploma: { singular: "Diploma", plural: "Diploma programmes" },
  postgraduate_diploma: {
    singular: "Post Graduate Diploma",
    plural: "Post Graduate Diploma programmes",
  },
};

/**
 * Group programmes by level in award order. Levels with no programmes are
 * left out; programmes keep their incoming order within a level.
 */
export function groupProgrammesByLevel<T extends { level: ProgrammeLevel }>(programmes: T[]) {
  return PROGRAMME_LEVELS.map((level) => ({
    level,
    programmes: programmes.filter((programme) => programme.level === level),
  })).filter((group) => group.programmes.length > 0);
}

/** Split stored plain text into paragraphs on blank lines. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export type CourseListing = Pick<
  Database["public"]["Tables"]["courses"]["Row"],
  "code" | "title" | "credit_units" | "year" | "semester"
>;

const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];

/** "Year 1, first semester" (years and semesters are small positive integers). */
export function courseTermLabel(year: number, semester: number): string {
  const ordinal = ORDINALS[semester - 1]?.toLowerCase() ?? `semester ${semester}`;
  return `Year ${year}, ${ordinal} semester`;
}

/**
 * Group a programme's courses by year, then semester, in study order, with the
 * credit units of each semester. Courses are sorted by code within a semester.
 */
export function groupCoursesByTerm<T extends CourseListing>(courses: readonly T[]) {
  const groups = new Map<string, { year: number; semester: number; courses: T[] }>();
  for (const course of courses) {
    const key = `${course.year}-${course.semester}`;
    const group = groups.get(key) ?? { year: course.year, semester: course.semester, courses: [] };
    group.courses.push(course);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.year - b.year || a.semester - b.semester)
    .map((group) => ({
      ...group,
      label: courseTermLabel(group.year, group.semester),
      courses: [...group.courses].sort((a, b) => a.code.localeCompare(b.code)),
      creditUnits: group.courses.reduce((sum, course) => sum + course.credit_units, 0),
    }));
}
