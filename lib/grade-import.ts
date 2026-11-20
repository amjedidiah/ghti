import { toCsv } from "@/lib/csv";
import { parseScore } from "@/lib/grades";

// Importing scores from a spreadsheet (Stage 3, step 3.3). A lecturer or admin
// saves their sheet as CSV (matric, ca, exam) and sees what would change
// before anything reaches the form; nothing saves until they press Save.
// Pure; tested in grade-import.test.ts.

/** Largest file we read: a class list as CSV is a few kilobytes. */
export const IMPORT_MAX_BYTES = 200_000;

/**
 * Rows and cells of a CSV file (RFC 4180: quoted cells, doubled quotes, line
 * breaks inside quotes). Strips a byte-order mark; reads `;`-separated files
 * (Excel in some locales) when the first line has semicolons but no commas.
 * Blank lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const separator = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

const HEADERS = {
  matric: /^(matric|matriculation|reg|registration)(\s*(no|number|num))?\.?$/,
  ca: /^(ca|c\.a\.?|continuous assessment|test)(\s*score)?$/,
  exam: /^(exam|examination)(\s*score)?$/,
};

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
// A leading apostrophe is how our own CSVs keep a cell from running as a formula.
const matricKey = (value: string) =>
  value.trim().replace(/^'/, "").toUpperCase().replace(/\s+/g, "");

export type ImportSheetRow = {
  registrationId: string;
  matric: string;
  /** The scores in the sheet now (as typed, not yet saved). */
  ca: string;
  exam: string;
  locked: boolean;
};

export type ScoreChange = {
  registrationId: string;
  matric: string;
  ca: { from: string; to: string };
  exam: { from: string; to: string };
};

export type ImportPlan = {
  changes: ScoreChange[];
  /** Rows that match the sheet already. */
  unchanged: number;
  /** Matric numbers in the file but not on this class list. */
  unknown: string[];
  /** Rows with a score we cannot use, by line number in the file. */
  invalid: { line: number; matric: string; message: string }[];
  /** Matric numbers whose grade is locked (submitted or published). */
  locked: string[];
  /** Matric numbers that appear more than once; only the first is used. */
  duplicates: string[];
};

export type ImportResult = { ok: true; plan: ImportPlan } | { ok: false; message: string };

/**
 * Match a CSV file to the sheet. The first row may name the columns (matric,
 * ca, exam, in any order, with other columns ignored); without such a row the
 * columns are taken as matric, ca, exam. An empty cell leaves that score as
 * it is.
 */
export function planScoreImport(
  text: string,
  sheet: readonly ImportSheetRow[],
  split: { ca: number; exam: number },
): ImportResult {
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, message: "The file is empty." };

  const header = rows[0].map(normalise);
  const hasHeader = header.some((cell) => HEADERS.matric.test(cell));
  let columns = { matric: 0, ca: 1, exam: 2 };
  if (hasHeader) {
    const find = (pattern: RegExp) => header.findIndex((cell) => pattern.test(cell));
    columns = { matric: find(HEADERS.matric), ca: find(HEADERS.ca), exam: find(HEADERS.exam) };
    if (columns.ca < 0 || columns.exam < 0) {
      return {
        ok: false,
        message: "The first row names a matric column, but not both ca and exam columns.",
      };
    }
  }

  const byMatric = new Map(sheet.map((row) => [matricKey(row.matric), row]));
  const seen = new Set<string>();
  const plan: ImportPlan = {
    changes: [],
    unchanged: 0,
    unknown: [],
    invalid: [],
    locked: [],
    duplicates: [],
  };

  rows.slice(hasHeader ? 1 : 0).forEach((cells, index) => {
    const line = index + (hasHeader ? 2 : 1);
    const rawMatric = (cells[columns.matric] ?? "").trim();
    if (!rawMatric) {
      plan.invalid.push({ line, matric: "", message: "No matric number" });
      return;
    }
    const key = matricKey(rawMatric);
    if (seen.has(key)) {
      plan.duplicates.push(rawMatric);
      return;
    }
    seen.add(key);

    const row = byMatric.get(key);
    if (!row) {
      plan.unknown.push(rawMatric);
      return;
    }

    const caText = (cells[columns.ca] ?? "").trim();
    const examText = (cells[columns.exam] ?? "").trim();
    const ca = caText === "" ? null : parseScore(caText, split.ca);
    const exam = examText === "" ? null : parseScore(examText, split.exam);
    const problems = [
      ca === undefined && `CA must be 0 to ${split.ca}`,
      exam === undefined && `Exam must be 0 to ${split.exam}`,
    ].filter(Boolean);
    if (problems.length > 0) {
      plan.invalid.push({ line, matric: row.matric, message: problems.join("; ") });
      return;
    }

    const to = {
      ca: ca === null || ca === undefined ? row.ca : String(ca),
      exam: exam === null || exam === undefined ? row.exam : String(exam),
    };
    const same =
      parseScore(row.ca, split.ca) === parseScore(to.ca, split.ca) &&
      parseScore(row.exam, split.exam) === parseScore(to.exam, split.exam);
    if (same) {
      plan.unchanged += 1;
      return;
    }
    if (row.locked) {
      plan.locked.push(row.matric);
      return;
    }
    plan.changes.push({
      registrationId: row.registrationId,
      matric: row.matric,
      ca: { from: row.ca, to: to.ca },
      exam: { from: row.exam, to: to.exam },
    });
  });

  return { ok: true, plan };
}

/** A CSV to fill in: the class's matric numbers and current scores. No names. */
export function scoreTemplate(sheet: readonly Pick<ImportSheetRow, "matric" | "ca" | "exam">[]) {
  return toCsv(
    ["matric", "ca", "exam"],
    sheet.map((row) => [row.matric, row.ca, row.exam]),
  );
}
