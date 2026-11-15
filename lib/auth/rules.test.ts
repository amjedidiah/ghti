import { describe, expect, test } from "bun:test";

import { guardRedirect, requiresSignIn, safeNextPath } from "@/lib/auth/rules";

describe("safeNextPath", () => {
  test("keeps same-site paths with query and hash", () => {
    expect(safeNextPath("/apply?step=2#docs", "/x")).toBe("/apply?step=2#docs");
  });

  test.each([
    ["missing", null],
    ["empty", ""],
    ["relative", "apply"],
    ["absolute URL", "https://evil.example/apply"],
    ["protocol-relative", "//evil.example/apply"],
    ["backslash trick", "/\\evil.example"],
    ["javascript scheme", "javascript:alert(1)"],
  ])("falls back for %s", (_label, next) => {
    expect(safeNextPath(next, "/fallback")).toBe("/fallback");
  });
});

describe("requiresSignIn", () => {
  test.each([
    ["/apply", true],
    ["/apply/status", true],
    ["/admin", true],
    ["/admin/applications/1", true],
    ["/reset-password", true],
    ["/apply/register", false],
    ["/applying", false],
    ["/academics", false],
    ["/", false],
  ])("%s -> %p", (path, expected) => {
    expect(requiresSignIn(path)).toBe(expected);
  });
});

describe("guardRedirect", () => {
  test("lets visitors browse public pages", () => {
    expect(guardRedirect("/academics", "", null)).toBeNull();
  });

  test("sends signed-out visitors to sign in, remembering where they were going", () => {
    expect(guardRedirect("/admin/applications", "?status=new", null)).toBe(
      "/sign-in?next=%2Fadmin%2Fapplications%3Fstatus%3Dnew",
    );
  });

  test("lets each role into its own area", () => {
    expect(guardRedirect("/apply", "", "applicant")).toBeNull();
    expect(guardRedirect("/admin", "", "admin")).toBeNull();
  });

  test("sends a role out of another role's area to its own home", () => {
    expect(guardRedirect("/admin", "", "applicant")).toBe("/apply");
    expect(guardRedirect("/apply", "", "admin")).toBe("/admin");
    expect(guardRedirect("/apply/status", "", "student")).toBe("/portal");
  });

  test("keeps registration open to visitors", () => {
    expect(guardRedirect("/apply/register", "", null)).toBeNull();
  });

  test("sends signed-in users away from guest pages", () => {
    expect(guardRedirect("/sign-in", "", "applicant")).toBe("/apply");
    expect(guardRedirect("/apply/register", "", "admin")).toBe("/admin");
    expect(guardRedirect("/forgot-password", "", "lecturer")).toBe("/teach");
  });

  test("lets any signed-in role reset their password", () => {
    expect(guardRedirect("/reset-password", "", "lecturer")).toBeNull();
    expect(guardRedirect("/reset-password", "", null)).toBe("/sign-in?next=%2Freset-password");
  });
});
