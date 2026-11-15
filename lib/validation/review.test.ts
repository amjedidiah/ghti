import { describe, expect, test } from "bun:test";

import { decisionSchema } from "@/lib/validation/review";

describe("decisionSchema", () => {
  test("admitting needs no note", () => {
    expect(decisionSchema.safeParse({ decision: "admitted", note: "" }).success).toBe(true);
  });

  test("rejecting needs a note", () => {
    const result = decisionSchema.safeParse({ decision: "rejected", note: "   " });
    expect(result.error?.issues[0]?.message).toBe(
      "Write a note for the applicant before rejecting.",
    );
  });

  test("only admit or reject are allowed", () => {
    expect(decisionSchema.safeParse({ decision: "withdrawn", note: "x" }).success).toBe(false);
  });
});
