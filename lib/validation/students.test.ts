import { describe, expect, test } from "bun:test";

import {
  DEFAULT_STUDENT_SEARCH,
  pageCount,
  changeRequestSchema,
  recordNoteSchema,
  resolveChangeRequestSchema,
  studentSearchSchema,
  studentStatusSchema,
} from "@/lib/validation/students";

describe("studentSearchSchema", () => {
  test("defaults: everyone, sorted by name, first page", () => {
    expect(DEFAULT_STUDENT_SEARCH).toEqual({
      query: "",
      programmeId: null,
      entryTermId: null,
      status: null,
      sort: "name",
      page: 1,
    });
  });

  test("empty selects mean no filter; text is trimmed", () => {
    expect(
      studentSearchSchema.parse({
        query: "  ada ",
        programmeId: "",
        entryTermId: "",
        status: "",
        sort: "matric",
        page: "3",
      }),
    ).toEqual({
      query: "ada",
      programmeId: null,
      entryTermId: null,
      status: null,
      sort: "matric",
      page: 3,
    });
  });

  test("unknown sort and bad pages fall back instead of failing", () => {
    const parsed = studentSearchSchema.parse({ sort: "salary", page: "-2" });
    expect(parsed.sort).toBe("name");
    expect(parsed.page).toBe(1);
  });

  test("a malformed id or status is refused", () => {
    expect(studentSearchSchema.safeParse({ programmeId: "not-a-uuid" }).success).toBe(false);
    expect(studentSearchSchema.safeParse({ status: "expelled" }).success).toBe(false);
  });
});

describe("pageCount", () => {
  test("rounds up, never below one", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(25)).toBe(1);
    expect(pageCount(26)).toBe(2);
    expect(pageCount(7, 3)).toBe(3);
  });
});

describe("recordNoteSchema", () => {
  test("needs some text", () => {
    expect(recordNoteSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(recordNoteSchema.parse({ body: " Called the student. " }).body).toBe(
      "Called the student.",
    );
  });

  test("caps the length", () => {
    expect(recordNoteSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("studentStatusSchema", () => {
  test("the reason is optional", () => {
    expect(studentStatusSchema.parse({ status: "deferred" })).toEqual({
      status: "deferred",
      note: "",
    });
  });

  test("a status is required", () => {
    expect(studentStatusSchema.safeParse({ status: "" }).success).toBe(false);
  });
});

describe("changeRequestSchema", () => {
  test("says what is wrong in 10 to 1,000 characters", () => {
    expect(changeRequestSchema.safeParse({ body: " too short " }).success).toBe(false);
    expect(changeRequestSchema.safeParse({ body: "x".repeat(1001) }).success).toBe(false);
    expect(changeRequestSchema.parse({ body: "  My middle name is Chukwuemeka.  " })).toEqual({
      body: "My middle name is Chukwuemeka.",
    });
  });
});

describe("resolveChangeRequestSchema", () => {
  test("needs a note under 800 characters", () => {
    expect(resolveChangeRequestSchema.safeParse({ note: "  " }).success).toBe(false);
    expect(resolveChangeRequestSchema.safeParse({ note: "x".repeat(801) }).success).toBe(false);
    expect(resolveChangeRequestSchema.parse({ note: "Corrected." })).toEqual({
      note: "Corrected.",
    });
  });
});
