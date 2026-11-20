import { describe, expect, test } from "bun:test";

import { rejectedDocumentsCutoff } from "@/lib/retention";

const now = new Date("2026-11-20T05:30:00Z");

describe("rejectedDocumentsCutoff", () => {
  test("no period set: nothing is due", () => {
    expect(rejectedDocumentsCutoff(now, null)).toBeNull();
  });

  test("counts whole days back from now", () => {
    expect(rejectedDocumentsCutoff(now, 90)?.toISOString()).toBe("2026-08-22T05:30:00.000Z");
  });

  test("a zero, negative or broken period deletes nothing, rather than everything", () => {
    expect(rejectedDocumentsCutoff(now, 0)).toBeNull();
    expect(rejectedDocumentsCutoff(now, -5)).toBeNull();
    expect(rejectedDocumentsCutoff(now, Number.NaN)).toBeNull();
  });
});
