import type { Database } from "@/lib/supabase/database.types";

export type ProgrammeLevel = Database["public"]["Enums"]["programme_level"];

export type ProgrammeSummary = Pick<
  Database["public"]["Tables"]["programmes"]["Row"],
  "slug" | "title" | "level" | "duration" | "description"
>;

export type Programme = ProgrammeSummary &
  Pick<Database["public"]["Tables"]["programmes"]["Row"], "requirements">;

/** Display order of levels, lowest award first. */
export const PROGRAMME_LEVELS = [
  "certificate",
  "diploma",
  "degree",
] as const satisfies readonly ProgrammeLevel[];

export const LEVEL_LABELS: Record<ProgrammeLevel, { singular: string; plural: string }> = {
  certificate: { singular: "Certificate", plural: "Certificate programmes" },
  diploma: { singular: "Diploma", plural: "Diploma programmes" },
  degree: { singular: "Degree", plural: "Degree programmes" },
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
