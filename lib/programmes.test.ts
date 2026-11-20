import { describe, expect, test } from "bun:test";

import {
  courseTermLabel,
  groupCoursesByTerm,
  groupProgrammesByLevel,
  toParagraphs,
  type ProgrammeLevel,
} from "@/lib/programmes";

function programme(slug: string, level: ProgrammeLevel) {
  return { slug, level };
}

describe("groupProgrammesByLevel", () => {
  test("orders groups certificate, diploma, postgraduate diploma regardless of input order", () => {
    const groups = groupProgrammesByLevel([
      programme("pgd", "postgraduate_diploma"),
      programme("cert", "certificate"),
      programme("dip", "diploma"),
    ]);
    expect(groups.map((group) => group.level)).toEqual([
      "certificate",
      "diploma",
      "postgraduate_diploma",
    ]);
  });

  test("leaves out levels with no programmes", () => {
    const groups = groupProgrammesByLevel([programme("dip", "diploma")]);
    expect(groups).toEqual([{ level: "diploma", programmes: [programme("dip", "diploma")] }]);
  });

  test("keeps incoming order within a level", () => {
    const groups = groupProgrammesByLevel([
      programme("dip-2", "diploma"),
      programme("dip-1", "diploma"),
    ]);
    expect(groups[0]?.programmes.map((p) => p.slug)).toEqual(["dip-2", "dip-1"]);
  });

  test("returns no groups for no programmes", () => {
    expect(groupProgrammesByLevel([])).toEqual([]);
  });
});

describe("toParagraphs", () => {
  test("splits on blank lines and trims", () => {
    expect(toParagraphs("  First.\n\n Second.\n   \nThird.  ")).toEqual([
      "First.",
      "Second.",
      "Third.",
    ]);
  });

  test("keeps single line breaks inside a paragraph", () => {
    expect(toParagraphs("Line one\nline two")).toEqual(["Line one\nline two"]);
  });

  test("returns nothing for empty text", () => {
    expect(toParagraphs("   ")).toEqual([]);
  });
});

describe("groupCoursesByTerm", () => {
  const course = (code: string, year: number, semester: number, credit_units = 2) => ({
    code,
    title: code,
    credit_units,
    year,
    semester,
  });

  test("groups by year then semester, in study order, codes sorted", () => {
    const groups = groupCoursesByTerm([
      course("THE 201", 2, 1),
      course("THE 102", 1, 2),
      course("BIB 101", 1, 1, 3),
      course("ANT 101", 1, 1),
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Year 1, first semester",
      "Year 1, second semester",
      "Year 2, first semester",
    ]);
    expect(groups[0].courses.map((c) => c.code)).toEqual(["ANT 101", "BIB 101"]);
    expect(groups[0].creditUnits).toBe(5);
  });

  test("no courses, no groups", () => {
    expect(groupCoursesByTerm([])).toEqual([]);
  });
});

describe("courseTermLabel", () => {
  test("names the semester", () => {
    expect(courseTermLabel(1, 3)).toBe("Year 1, third semester");
  });
});
