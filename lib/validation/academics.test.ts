import { describe, expect, test } from "bun:test";

import {
  courseRowValues,
  courseSchema,
  emptyProgrammeValues,
  programmeRowValues,
  programmeSchema,
  slugify,
  termRowValues,
  termSchema,
  toCourseRow,
  toProgrammeRow,
  toTermRow,
} from "@/lib/validation/academics";

describe("slugify", () => {
  test("turns a title into a URL slug", () => {
    expect(slugify("Ordinary Diploma in Theology")).toBe("ordinary-diploma-in-theology");
  });

  test("drops accents, punctuation and stray hyphens", () => {
    expect(slugify("  Théologie: Post-Graduate (PGD)!  ")).toBe("theologie-post-graduate-pgd");
  });

  test("never ends with a hyphen after trimming to 100 characters", () => {
    const slug = slugify(`${"a".repeat(99)} b`);
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("programmeSchema", () => {
  const valid = { ...emptyProgrammeValues, title: "Certificate in Theology", duration: "1 year" };

  test("accepts a programme and fills the slug from the title", () => {
    const parsed = programmeSchema.parse(valid);
    expect(toProgrammeRow(parsed)).toMatchObject({
      slug: "certificate-in-theology",
      position: 1,
      status: "draft",
    });
  });

  test("keeps a slug the admin typed, lower-cased", () => {
    const parsed = programmeSchema.parse({ ...valid, slug: "Cert-Theology" });
    expect(toProgrammeRow(parsed).slug).toBe("cert-theology");
  });

  test("rejects a slug with spaces or double hyphens", () => {
    expect(programmeSchema.safeParse({ ...valid, slug: "cert theology" }).success).toBe(false);
    expect(programmeSchema.safeParse({ ...valid, slug: "cert--theology" }).success).toBe(false);
  });

  test("requires a title and a duration", () => {
    const result = programmeSchema.safeParse({ ...valid, title: " ", duration: "" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path[0]);
    expect(paths).toContain("title");
    expect(paths).toContain("duration");
  });

  test("round-trips a database row", () => {
    const row = toProgrammeRow(programmeSchema.parse(valid));
    expect(
      programmeRowValues({
        ...row,
        description: row.description ?? "",
        requirements: row.requirements ?? "",
        status: row.status ?? "draft",
        position: row.position ?? 0,
      }),
    ).toEqual({ ...valid, slug: "certificate-in-theology" });
  });
});

describe("courseSchema", () => {
  const valid = {
    code: "bib  101",
    title: "Introduction to the Bible",
    creditUnits: "3",
    year: "1",
    semester: "1" as const,
  };

  test("upper-cases the code and collapses spaces", () => {
    expect(toCourseRow(courseSchema.parse(valid))).toEqual({
      code: "BIB 101",
      title: "Introduction to the Bible",
      credit_units: 3,
      year: 1,
      semester: 1,
    });
  });

  test("rejects codes with other symbols, and too many credit units", () => {
    expect(courseSchema.safeParse({ ...valid, code: "BIB#101" }).success).toBe(false);
    expect(courseSchema.safeParse({ ...valid, creditUnits: "31" }).success).toBe(false);
    expect(courseSchema.safeParse({ ...valid, creditUnits: "-1" }).success).toBe(false);
  });

  test("allows zero credit units (e.g. chapel)", () => {
    expect(courseSchema.safeParse({ ...valid, creditUnits: "0" }).success).toBe(true);
  });

  test("round-trips a database row", () => {
    expect(
      courseRowValues({ code: "BIB 101", title: "X", credit_units: 2, year: 1, semester: 2 }),
    ).toEqual({ code: "BIB 101", title: "X", creditUnits: "2", year: "1", semester: "2" });
  });
});

describe("termSchema", () => {
  const valid = {
    session: "2026/2027",
    name: "First semester",
    startsOn: "2026-09-14",
    endsOn: "2027-01-29",
    acceptingApplications: "no" as const,
  };

  test("accepts a term and maps it to a row", () => {
    expect(toTermRow(termSchema.parse(valid))).toEqual({
      session: "2026/2027",
      name: "First semester",
      starts_on: "2026-09-14",
      ends_on: "2027-01-29",
      accepting_applications: false,
    });
  });

  test("dates are optional", () => {
    const row = toTermRow(termSchema.parse({ ...valid, startsOn: "", endsOn: "" }));
    expect(row.starts_on).toBeNull();
    expect(row.ends_on).toBeNull();
  });

  test("the session's second year follows the first", () => {
    expect(termSchema.safeParse({ ...valid, session: "2026/2028" }).success).toBe(false);
    expect(termSchema.safeParse({ ...valid, session: "2026-2027" }).success).toBe(false);
  });

  test("the end date cannot come before the start date", () => {
    const result = termSchema.safeParse({ ...valid, endsOn: "2026-09-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["endsOn"]);
  });

  test("round-trips a database row", () => {
    expect(
      termRowValues({
        session: "2026/2027",
        name: "First semester",
        starts_on: null,
        ends_on: null,
        accepting_applications: true,
      }),
    ).toEqual({ ...valid, startsOn: "", endsOn: "", acceptingApplications: "yes" });
  });
});
