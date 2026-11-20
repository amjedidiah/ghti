import { describe, expect, test } from "bun:test";

import { contactSchema, isLikelyBot } from "@/lib/validation/contact";

const valid = {
  name: " Ada Obi ",
  email: " ada@example.test ",
  message: "When does the next intake start?",
};

describe("contactSchema", () => {
  test("trims and accepts a complete message; phone is optional", () => {
    expect(contactSchema.parse(valid)).toEqual({
      name: "Ada Obi",
      email: "ada@example.test",
      phone: "",
      message: "When does the next intake start?",
      website: "",
    });
  });

  test("line breaks in the name become spaces (it goes into an email subject)", () => {
    expect(contactSchema.parse({ ...valid, name: "Ada\r\nBcc: x@example.test" }).name).toBe(
      "Ada Bcc: x@example.test",
    );
  });

  test("needs a valid email to reply to", () => {
    const result = contactSchema.safeParse({ ...valid, email: "ada at example" });
    expect(result.success).toBe(false);
  });

  test("refuses a very short message", () => {
    expect(contactSchema.safeParse({ ...valid, message: "Hi" }).success).toBe(false);
  });

  test("caps the message length", () => {
    expect(contactSchema.safeParse({ ...valid, message: "x".repeat(3001) }).success).toBe(false);
  });
});

describe("isLikelyBot", () => {
  test("a filled honeypot means a bot", () => {
    expect(isLikelyBot({ website: "https://spam.example" })).toBe(true);
    expect(isLikelyBot({ website: "  " })).toBe(false);
    expect(isLikelyBot({})).toBe(false);
  });
});
