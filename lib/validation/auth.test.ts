import { describe, expect, test } from "bun:test";

import { registerSchema, resetPasswordSchema, signInSchema } from "@/lib/validation/auth";

describe("registerSchema", () => {
  test("accepts a valid registration and trims name and email", () => {
    const result = registerSchema.safeParse({
      fullName: "  Ada Obi ",
      email: " ada@example.com ",
      password: "long enough",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      fullName: "Ada Obi",
      email: "ada@example.com",
      password: "long enough",
    });
  });

  test("explains each problem", () => {
    const result = registerSchema.safeParse({ fullName: "", email: "nope", password: "short" });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toContain("Enter your full name.");
    expect(messages).toContain("Enter a valid email address, like name@example.com.");
    expect(messages).toContain("Use at least 8 characters.");
  });
});

describe("signInSchema", () => {
  test("asks for the email before checking its format", () => {
    const result = signInSchema.safeParse({ email: "  ", password: "x" });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Enter your email address.",
    ]);
  });
});

describe("resetPasswordSchema", () => {
  test("requires the two passwords to match", () => {
    const result = resetPasswordSchema.safeParse({
      password: "new password",
      confirmPassword: "new passw0rd",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
