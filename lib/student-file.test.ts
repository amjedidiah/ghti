import { describe, expect, test } from "bun:test";

import { studentFileResults, type AdminRegistration } from "@/lib/student-file";

const term = { id: "t1", session: "2026/2027", name: "First semester", starts_on: null };

function registration(
  code: string,
  grade: AdminRegistration["grade"],
  credit_units = 3,
): AdminRegistration {
  return { term, course: { code, title: code, credit_units }, grade };
}

describe("studentFileResults", () => {
  test("shows every grade with its status, but GPA counts published grades only", () => {
    const result = studentFileResults([
      registration("BIB 101", { total: 73, letter: "A", grade_point: 5, status: "published" }),
      registration("THE 101", { total: 40, letter: "E", grade_point: 1, status: "draft" }),
      registration("PRA 101", null),
    ]);
    expect(result.terms).toHaveLength(1);
    const [only] = result.terms;
    expect(only.label).toBe("First semester, 2026/2027");
    expect(only.courses.map((course) => [course.code, course.status, course.letter])).toEqual([
      ["BIB 101", "published", "A"],
      ["PRA 101", "none", null],
      ["THE 101", "draft", "E"],
    ]);
    expect(only.gpa).toBe(5);
    expect(result.cgpa).toBe(5);
    expect(result.unitsCounted).toBe(3);
  });

  test("no registrations, no terms", () => {
    expect(studentFileResults([])).toEqual({ cgpa: null, unitsCounted: 0, terms: [] });
  });
});
