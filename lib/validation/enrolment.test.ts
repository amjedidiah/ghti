import { describe, expect, test } from "bun:test";

import { enrolmentSchema } from "@/lib/validation/enrolment";

const TERM = "7a1c2a8e-3d4b-4f5a-9b6c-1d2e3f4a5b6c";

describe("enrolmentSchema", () => {
  test("trims and upper-cases the matric number", () => {
    expect(enrolmentSchema.parse({ matricNo: "  ghti/2026/cert/001 ", entryTermId: TERM })).toEqual(
      {
        matricNo: "GHTI/2026/CERT/001",
        entryTermId: TERM,
      },
    );
  });

  test("refuses spaces, other symbols and an empty number", () => {
    for (const matricNo of ["GHTI 2026", "GHTI#1", "   ", "/GHTI"]) {
      expect(enrolmentSchema.safeParse({ matricNo, entryTermId: TERM }).success).toBe(false);
    }
  });

  test("refuses a number longer than 40 characters", () => {
    expect(enrolmentSchema.safeParse({ matricNo: "A".repeat(41), entryTermId: TERM }).success).toBe(
      false,
    );
  });

  test("requires an entry term", () => {
    const result = enrolmentSchema.safeParse({ matricNo: "GHTI/1", entryTermId: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["entryTermId"]);
  });
});
