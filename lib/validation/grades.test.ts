import { describe, expect, test } from "bun:test";

import { returnGradesSchema } from "@/lib/validation/grades";

describe("returnGradesSchema", () => {
  test("needs a note, trimmed, up to 1,000 characters", () => {
    expect(returnGradesSchema.safeParse({ note: "   " }).success).toBe(false);
    expect(returnGradesSchema.safeParse({ note: "x".repeat(1001) }).success).toBe(false);
    expect(returnGradesSchema.parse({ note: "  Check GHTI/002's exam. " })).toEqual({
      note: "Check GHTI/002's exam.",
    });
  });
});
