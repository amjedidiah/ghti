// CSV for admin exports (Stage 3, step 3.5). Pure; tested in csv.test.ts.

export type CsvValue = string | number | boolean | null | undefined;

/**
 * A cell that starts with = + - @ (or a tab or carriage return) can run as a
 * formula when the file is opened in a spreadsheet ("CSV injection"). Such
 * cells get a leading apostrophe, which spreadsheets show as plain text.
 * Numbers are left alone, so negative numbers stay numbers.
 */
function neutralise(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? neutralise(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * RFC 4180 CSV with CRLF line ends and a UTF-8 byte-order mark, so Excel
 * shows names with accents correctly.
 */
export function toCsv(headers: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** "ghti-students-2026-11-20.csv": what and when, never whose. */
export function exportFileName(kind: string, now: Date): string {
  return `ghti-${kind}-${now.toISOString().slice(0, 10)}.csv`;
}
