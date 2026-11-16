import { describe, expect, test } from "bun:test";

import { groupResults, type RegistrationResult } from "@/lib/results";

const first = { id: "t1", session: "2026/2027", name: "First semester", starts_on: "2026-09-14" };
const second = { id: "t2", session: "2026/2027", name: "Second semester", starts_on: "2027-02-01" };

function reg(
  term: typeof first,
  code: string,
  units: number,
  grade: [number, string, number] | null,
): RegistrationResult {
  return {
    term,
    course: { code, title: `${code} title`, credit_units: units },
    grade: grade ? { total: grade[0], letter: grade[1], grade_point: grade[2] } : null,
  };
}

describe("groupResults", () => {
  test("groups by term, oldest first, courses by code", () => {
    const { terms } = groupResults([
      reg(second, "NTS 202", 3, [65, "B", 4]),
      reg(first, "THE 101", 3, [55, "C", 3]),
      reg(first, "BIB 101", 3, [72, "A", 5]),
    ]);
    expect(terms.map((term) => term.label)).toEqual([
      "First semester, 2026/2027",
      "Second semester, 2026/2027",
    ]);
    expect(terms[0].courses.map((course) => course.code)).toEqual(["BIB 101", "THE 101"]);
  });

  test("term GPA and CGPA count only published grades", () => {
    const result = groupResults([
      reg(first, "BIB 101", 3, [72, "A", 5]),
      reg(first, "THE 101", 3, null),
      reg(second, "NTS 202", 2, [42, "E", 1]),
    ]);
    expect(result.terms[0]).toMatchObject({ gpa: 5, unitsCounted: 3, unitsRegistered: 6 });
    expect(result.terms[0].courses[1]).toMatchObject({ published: false, letter: null });
    // (3×5 + 2×1) / 5 = 3.40
    expect(result.cgpa).toBe(3.4);
    expect(result.unitsCounted).toBe(5);
  });

  test("a term with nothing published has no GPA yet", () => {
    const result = groupResults([reg(first, "BIB 101", 3, null)]);
    expect(result.terms[0].gpa).toBeNull();
    expect(result.cgpa).toBeNull();
  });

  test("rows missing a term or course are skipped", () => {
    expect(groupResults([{ term: null, course: null, grade: null }]).terms).toEqual([]);
  });
});
