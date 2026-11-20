import { describe, expect, test } from "bun:test";

import { inviteBlocker, inviteStaffSchema, staffStatus } from "@/lib/validation/staff";

describe("inviteStaffSchema", () => {
  test("trims the name, lower-cases the email", () => {
    expect(
      inviteStaffSchema.parse({
        fullName: "  Rev. Ada Obi ",
        email: " Ada@Example.TEST ",
        role: "lecturer",
      }),
    ).toEqual({ fullName: "Rev. Ada Obi", email: "ada@example.test", role: "lecturer" });
  });

  test("only lecturer or admin; a valid email", () => {
    expect(
      inviteStaffSchema.safeParse({ fullName: "Ada", email: "ada@x.test", role: "student" })
        .success,
    ).toBe(false);
    expect(
      inviteStaffSchema.safeParse({ fullName: "Ada", email: "ada", role: "admin" }).success,
    ).toBe(false);
  });
});

describe("inviteBlocker", () => {
  test("a new email can be invited", () => {
    expect(inviteBlocker(null)).toBeNull();
  });

  test("students and applicants keep their accounts; staff need their own email", () => {
    expect(inviteBlocker({ role: "student", confirmed: true })).toContain("student");
    expect(inviteBlocker({ role: "applicant", confirmed: true })).toContain("applicant");
  });

  test("existing staff: already listed, or point to resending", () => {
    expect(inviteBlocker({ role: "admin", confirmed: true })).toContain(
      "already on the staff list",
    );
    expect(inviteBlocker({ role: "lecturer", confirmed: false })).toContain("Resend invitation");
  });
});

describe("staffStatus", () => {
  test("invited until they confirm or sign in", () => {
    expect(staffStatus({ confirmed_at: null, last_sign_in_at: null })).toBe("invited");
    expect(staffStatus({ confirmed_at: "2026-11-20T10:00:00Z", last_sign_in_at: null })).toBe(
      "active",
    );
  });
});
