import { describe, expect, test } from "bun:test";

import { describeSheetSave, planGradeSheet, type CurrentRow } from "@/lib/grade-sheet";

const typed = (entries: [string, string, string][]) =>
  new Map(entries.map(([id, ca, exam]) => [id, { ca, exam }]));

const none: CurrentRow[] = [
  { registrationId: "r1", grade: null },
  { registrationId: "r2", grade: null },
];

describe("planGradeSheet", () => {
  test("new scores become draft grades; empty rows are skipped", () => {
    const plan = planGradeSheet(
      none,
      typed([
        ["r1", "28", "41.5"],
        ["r2", "", ""],
      ]),
      {
        publish: false,
        reason: "",
      },
    );
    expect(plan.inserts).toEqual([
      { registration_id: "r1", ca_score: 28, exam_score: 41.5, status: "draft" },
    ]);
    expect(plan.errors).toEqual({});
  });

  test("publishing publishes complete rows and keeps incomplete ones as drafts", () => {
    const plan = planGradeSheet(
      none,
      typed([
        ["r1", "30", "50"],
        ["r2", "20", ""],
      ]),
      {
        publish: true,
        reason: "",
      },
    );
    expect(plan.inserts.map((row) => row.status)).toEqual(["published", "draft"]);
    expect(plan.newlyPublished).toBe(1);
    expect(plan.incomplete).toBe(1);
    expect(describeSheetSave(plan, true)).toBe(
      "Saved 2 grades. Published 1. 1 still misses a score and stays a draft.",
    );
  });

  test("scores above the split or badly typed are field errors", () => {
    const plan = planGradeSheet(
      none,
      typed([
        ["r1", "41", "61"],
        ["r2", "abc", "10"],
      ]),
      {
        publish: false,
        reason: "",
      },
    );
    expect(Object.keys(plan.errors).sort()).toEqual(["ca:r1", "ca:r2", "exam:r1"]);
    expect(plan.inserts).toEqual([]);
  });

  test("unchanged drafts are left alone; changed ones are updated; cleared ones deleted", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "draft" } },
      { registrationId: "r2", grade: { id: "g2", ca: 20, exam: 30, status: "draft" } },
      { registrationId: "r3", grade: { id: "g3", ca: 10, exam: null, status: "draft" } },
    ];
    const plan = planGradeSheet(
      rows,
      typed([
        ["r1", "20", "30"],
        ["r2", "25", "30"],
        ["r3", "", ""],
      ]),
      {
        publish: false,
        reason: "",
      },
    );
    expect(plan.updates).toEqual([{ id: "g2", ca_score: 25, exam_score: 30, status: "draft" }]);
    expect(plan.deletes).toEqual(["g3"]);
    expect(describeSheetSave(plan, false)).toBe("Saved 2 grades.");
  });

  test("publishing an unchanged complete draft updates only its status", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "draft" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "20", "30"]]), { publish: true, reason: "" });
    expect(plan.updates).toEqual([{ id: "g1", ca_score: 20, exam_score: 30, status: "published" }]);
    expect(plan.newlyPublished).toBe(1);
  });

  test("unchanged published grades need nothing, not even a reason", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "published" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "20", "30"]]), { publish: true, reason: "" });
    expect(plan).toMatchObject({
      updates: [],
      publishedChanges: [],
      errors: {},
      newlyPublished: 0,
    });
    expect(describeSheetSave(plan, true)).toBe("No changes to save.");
  });

  test("changing a published grade needs a reason", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "published" } },
    ];
    const withoutReason = planGradeSheet(rows, typed([["r1", "20", "35"]]), {
      publish: false,
      reason: " ",
    });
    expect(withoutReason.errors.reason).toBeDefined();
    const withReason = planGradeSheet(rows, typed([["r1", "20", "35"]]), {
      publish: false,
      reason: "Re-marked",
    });
    expect(withReason.errors).toEqual({});
    expect(withReason.publishedChanges).toEqual([{ id: "g1", ca_score: 20, exam_score: 35 }]);
    expect(describeSheetSave(withReason, false)).toBe(
      "Saved 1 grade. 1 published grade was changed and logged.",
    );
  });

  test("a published grade cannot be emptied", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "published" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "20", ""]]), { publish: false, reason: "x" });
    expect(plan.errors["ca:r1"]).toBe("A published grade needs both scores");
    expect(plan.publishedChanges).toEqual([]);
  });

  test("rows missing from the form are left alone", () => {
    const plan = planGradeSheet(none, new Map(), { publish: true, reason: "" });
    expect(plan.inserts).toEqual([]);
  });
});
