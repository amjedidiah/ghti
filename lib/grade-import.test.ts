import { describe, expect, test } from "bun:test";

import { parseCsv, planScoreImport, scoreTemplate, type ImportSheetRow } from "@/lib/grade-import";

const split = { ca: 40, exam: 60 };
const sheet: ImportSheetRow[] = [
  { registrationId: "r1", matric: "GHTI/001", ca: "", exam: "", locked: false },
  { registrationId: "r2", matric: "GHTI/002", ca: "20", exam: "30", locked: false },
  { registrationId: "r3", matric: "GHTI/003", ca: "25", exam: "45", locked: true },
];

function plan(text: string) {
  const result = planScoreImport(text, sheet, split);
  if (!result.ok) throw new Error(result.message);
  return result.plan;
}

describe("parseCsv", () => {
  test("reads quoted cells, doubled quotes, CRLF and a byte-order mark", () => {
    expect(parseCsv('﻿matric,name\r\n"GHTI/001","Okafor, ""Chidi"""\r\n\r\n')).toEqual([
      ["matric", "name"],
      ["GHTI/001", 'Okafor, "Chidi"'],
    ]);
  });

  test("reads semicolon-separated files", () => {
    expect(parseCsv("matric;ca;exam\nGHTI/001;30;50")).toEqual([
      ["matric", "ca", "exam"],
      ["GHTI/001", "30", "50"],
    ]);
  });
});

describe("planScoreImport", () => {
  test("matches matric numbers loosely and lists the changes", () => {
    const result = plan("Matric No,Name,CA,Exam\nghti/001,Ada,30,50\n GHTI/002 ,Bayo,20,30\n");
    expect(result.changes).toEqual([
      {
        registrationId: "r1",
        matric: "GHTI/001",
        ca: { from: "", to: "30" },
        exam: { from: "", to: "50" },
      },
    ]);
    expect(result.unchanged).toBe(1);
  });

  test("without a header row, columns are matric, ca, exam", () => {
    expect(plan("GHTI/001,30,50").changes).toHaveLength(1);
  });

  test("columns may come in any order, and empty cells keep the score", () => {
    const result = plan("exam,matric,ca\n35,GHTI/002,\n");
    expect(result.changes).toEqual([
      {
        registrationId: "r2",
        matric: "GHTI/002",
        ca: { from: "20", to: "20" },
        exam: { from: "30", to: "35" },
      },
    ]);
  });

  test("reports unknown, invalid, locked and repeated rows instead of applying them", () => {
    const result = plan(
      [
        "matric,ca,exam",
        "GHTI/999,10,10",
        "GHTI/001,41,50",
        "GHTI/003,26,45",
        "GHTI/002,22,30",
        "GHTI/002,23,30",
        ",10,10",
      ].join("\n"),
    );
    expect(result.unknown).toEqual(["GHTI/999"]);
    expect(result.invalid).toEqual([
      { line: 3, matric: "GHTI/001", message: "CA must be 0 to 40" },
      { line: 7, matric: "", message: "No matric number" },
    ]);
    expect(result.locked).toEqual(["GHTI/003"]);
    expect(result.duplicates).toEqual(["GHTI/002"]);
    expect(result.changes.map((change) => change.ca.to)).toEqual(["22"]);
  });

  test("a header naming matric but not the scores is refused", () => {
    expect(planScoreImport("matric,score\nGHTI/001,70", sheet, split)).toEqual({
      ok: false,
      message: "The first row names a matric column, but not both ca and exam columns.",
    });
  });

  test("an empty file is refused", () => {
    expect(planScoreImport("\n\n", sheet, split).ok).toBe(false);
  });
});

describe("scoreTemplate", () => {
  test("lists matric numbers and current scores, never names, and reads back cleanly", () => {
    const csv = scoreTemplate(sheet);
    expect(csv).toBe("﻿matric,ca,exam\r\nGHTI/001,,\r\nGHTI/002,20,30\r\nGHTI/003,25,45\r\n");
    expect(plan(csv)).toMatchObject({ changes: [], unchanged: 3 });
  });
});
