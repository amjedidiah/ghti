import { describe, expect, test } from "bun:test";

import { exportFileName, toCsv } from "@/lib/csv";

const BOM = "﻿";

describe("toCsv", () => {
  test("headers, rows, CRLF line ends and a byte-order mark", () => {
    expect(toCsv(["Name", "Score"], [["Ada", 73]])).toBe(`${BOM}Name,Score\r\nAda,73\r\n`);
  });

  test("quotes cells with commas, quotes or line breaks", () => {
    expect(toCsv(["A"], [['He said "hi", then left'], ["two\nlines"]])).toBe(
      `${BOM}A\r\n"He said ""hi"", then left"\r\n"two\nlines"\r\n`,
    );
  });

  test("empty values become empty cells", () => {
    expect(toCsv(["A", "B", "C"], [[null, undefined, ""]])).toBe(`${BOM}A,B,C\r\n,,\r\n`);
  });

  test("text that would run as a spreadsheet formula is neutralised", () => {
    const csv = toCsv(["A"], [['=HYPERLINK("http://x")'], ["+234 803"], ["@SUM(A1)"], ["-1+1"]]);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain("'+234 803");
    expect(csv).toContain("'@SUM(A1)");
    expect(csv).toContain("'-1+1");
  });

  test("numbers are left as numbers, negative ones included", () => {
    expect(toCsv(["N"], [[-2.5]])).toBe(`${BOM}N\r\n-2.5\r\n`);
  });
});

describe("exportFileName", () => {
  test("names the export and the date only", () => {
    expect(exportFileName("students", new Date("2026-11-20T10:00:00Z"))).toBe(
      "ghti-students-2026-11-20.csv",
    );
  });
});
