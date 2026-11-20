import { describe, expect, test } from "bun:test";

import {
  describeSheetSave,
  isLocked,
  pendingReturn,
  planGradeSheet,
  type CurrentRow,
} from "@/lib/grade-sheet";

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
        mode: "admin",
        finalise: false,
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
        mode: "admin",
        finalise: true,
        reason: "",
      },
    );
    expect(plan.inserts.map((row) => row.status)).toEqual(["published", "draft"]);
    expect(plan.newlyFinal).toBe(1);
    expect(plan.incomplete).toBe(1);
    expect(describeSheetSave(plan, "admin", true)).toBe(
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
        mode: "admin",
        finalise: false,
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
        mode: "admin",
        finalise: false,
        reason: "",
      },
    );
    expect(plan.updates).toEqual([{ id: "g2", ca_score: 25, exam_score: 30, status: "draft" }]);
    expect(plan.deletes).toEqual(["g3"]);
    expect(describeSheetSave(plan, "admin", false)).toBe("Saved 2 grades.");
  });

  test("publishing an unchanged complete draft updates only its status", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "draft" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "20", "30"]]), {
      mode: "admin",
      finalise: true,
      reason: "",
    });
    expect(plan.updates).toEqual([{ id: "g1", ca_score: 20, exam_score: 30, status: "published" }]);
    expect(plan.newlyFinal).toBe(1);
  });

  test("unchanged published grades need nothing, not even a reason", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "published" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "20", "30"]]), {
      mode: "admin",
      finalise: true,
      reason: "",
    });
    expect(plan).toMatchObject({
      updates: [],
      publishedChanges: [],
      errors: {},
      newlyFinal: 0,
    });
    expect(describeSheetSave(plan, "admin", true)).toBe("No changes to save.");
  });

  test("changing a published grade needs a reason", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "published" } },
    ];
    const withoutReason = planGradeSheet(rows, typed([["r1", "20", "35"]]), {
      mode: "admin",
      finalise: false,
      reason: " ",
    });
    expect(withoutReason.errors.reason).toBeDefined();
    const withReason = planGradeSheet(rows, typed([["r1", "20", "35"]]), {
      mode: "admin",
      finalise: false,
      reason: "Re-marked",
    });
    expect(withReason.errors).toEqual({});
    expect(withReason.publishedChanges).toEqual([{ id: "g1", ca_score: 20, exam_score: 35 }]);
    expect(describeSheetSave(withReason, "admin", false)).toBe(
      "Saved 1 grade. 1 published grade was changed and logged.",
    );
  });

  test("a published grade cannot be emptied", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "published" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "20", ""]]), {
      mode: "admin",
      finalise: false,
      reason: "x",
    });
    expect(plan.errors["ca:r1"]).toBe("A published grade needs both scores");
    expect(plan.publishedChanges).toEqual([]);
  });

  test("rows missing from the form are left alone", () => {
    const plan = planGradeSheet(none, new Map(), { mode: "admin", finalise: true, reason: "" });
    expect(plan.inserts).toEqual([]);
  });
});

describe("planGradeSheet for lecturers", () => {
  const lecturer = (finalise: boolean) => ({ mode: "lecturer" as const, finalise, reason: "" });

  test("submitting sends complete grades for approval; incomplete ones stay drafts", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: null },
      { registrationId: "r2", grade: { id: "g2", ca: 20, exam: 30, status: "draft" } },
      { registrationId: "r3", grade: null },
    ];
    const plan = planGradeSheet(
      rows,
      typed([
        ["r1", "30", "50"],
        ["r2", "20", "30"],
        ["r3", "25", ""],
      ]),
      lecturer(true),
    );
    expect(plan.inserts.map((row) => row.status)).toEqual(["submitted", "draft"]);
    expect(plan.updates).toEqual([{ id: "g2", ca_score: 20, exam_score: 30, status: "submitted" }]);
    expect(plan.newlyFinal).toBe(2);
    expect(plan.incomplete).toBe(1);
    expect(describeSheetSave(plan, "lecturer", true)).toBe(
      "Saved 3 grades. Submitted 2 for approval. 1 still misses a score and stays a draft.",
    );
  });

  test("saving a draft never submits", () => {
    const plan = planGradeSheet(none, typed([["r1", "30", "50"]]), lecturer(false));
    expect(plan.inserts.map((row) => row.status)).toEqual(["draft"]);
    expect(describeSheetSave(plan, "lecturer", false)).toBe("Saved 1 grade.");
  });

  test("submitted and published grades are locked: unchanged is fine, changed is an error", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "submitted" } },
      { registrationId: "r2", grade: { id: "g2", ca: 20, exam: 30, status: "published" } },
    ];
    const same = planGradeSheet(
      rows,
      typed([
        ["r1", "20", "30"],
        ["r2", "20", "30"],
      ]),
      lecturer(true),
    );
    expect(same).toMatchObject({ errors: {}, updates: [], publishedChanges: [], newlyFinal: 0 });

    const changed = planGradeSheet(
      rows,
      typed([
        ["r1", "21", "30"],
        ["r2", "20", "31"],
      ]),
      { mode: "lecturer", finalise: false, reason: "Re-marked" },
    );
    expect(Object.keys(changed.errors).sort()).toEqual(["ca:r1", "ca:r2"]);
    expect(changed.updates).toEqual([]);
    expect(changed.publishedChanges).toEqual([]);
  });

  test("an admin publishing a submitted grade counts it as newly published", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "submitted" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "20", "30"]]), {
      mode: "admin",
      finalise: true,
      reason: "",
    });
    expect(plan.updates).toEqual([{ id: "g1", ca_score: 20, exam_score: 30, status: "published" }]);
    expect(plan.newlyFinal).toBe(1);
  });

  test("an admin's edit to a submitted grade keeps it submitted", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "submitted" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "22", "30"]]), {
      mode: "admin",
      finalise: false,
      reason: "",
    });
    expect(plan.updates).toEqual([{ id: "g1", ca_score: 22, exam_score: 30, status: "submitted" }]);
  });

  test("an admin who clears a submitted grade's score turns it back into a draft", () => {
    const rows: CurrentRow[] = [
      { registrationId: "r1", grade: { id: "g1", ca: 20, exam: 30, status: "submitted" } },
    ];
    const plan = planGradeSheet(rows, typed([["r1", "20", ""]]), {
      mode: "admin",
      finalise: false,
      reason: "",
    });
    expect(plan.updates).toEqual([{ id: "g1", ca_score: 20, exam_score: null, status: "draft" }]);
  });
});

describe("isLocked", () => {
  test("lecturers edit empty and draft rows only; admins edit everything", () => {
    expect(
      [null, "draft", "submitted", "published"].map((s) => isLocked("lecturer", s as never)),
    ).toEqual([false, false, true, true]);
    expect(isLocked("admin", "published")).toBe(false);
  });
});

describe("pendingReturn", () => {
  const latest = { returnedAt: "2026-11-20T10:00:00Z", note: "Check WFL/002" };

  test("shows the note while the returned grades are drafts", () => {
    expect(
      pendingReturn(latest, [
        { status: "draft", updatedAt: "2026-11-20T10:00:00Z" },
        { status: "published", updatedAt: "2026-11-19T09:00:00Z" },
      ]),
    ).toBe(latest);
  });

  test("hides it once grades are submitted or published after the return", () => {
    expect(
      pendingReturn(latest, [{ status: "submitted", updatedAt: "2026-11-20T11:00:00Z" }]),
    ).toBe(null);
    expect(pendingReturn(null, [])).toBe(null);
  });
});
