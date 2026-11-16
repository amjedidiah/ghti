import { describe, expect, test } from "bun:test";

import {
  cgpa,
  creditUnitsCounted,
  formatGpa,
  GRADE_SPLIT,
  gpa,
  gradeFor,
  parseScore,
  totalScore,
  type GradeBand,
} from "@/lib/grades";

const SCALE: GradeBand[] = [
  { min_score: 70, letter: "A", grade_point: 5 },
  { min_score: 60, letter: "B", grade_point: 4 },
  { min_score: 50, letter: "C", grade_point: 3 },
  { min_score: 45, letter: "D", grade_point: 2 },
  { min_score: 40, letter: "E", grade_point: 1 },
  { min_score: 0, letter: "F", grade_point: 0 },
];

test("the CA and exam split adds up to 100", () => {
  expect(GRADE_SPLIT.ca + GRADE_SPLIT.exam).toBe(100);
});

describe("totalScore", () => {
  test("adds CA and exam", () => {
    expect(totalScore(28, 41.5)).toBe(69.5);
    expect(totalScore(0.1, 0.2)).toBe(0.3);
  });
  test("counts a missing part as zero, and nothing entered as null", () => {
    expect(totalScore(30, null)).toBe(30);
    expect(totalScore(null, null)).toBeNull();
  });
});

describe("gradeFor", () => {
  test("finds the highest band at or below the total", () => {
    expect(gradeFor(70, SCALE)?.letter).toBe("A");
    expect(gradeFor(69.5, SCALE)?.letter).toBe("B");
    expect(gradeFor(44.99, SCALE)?.letter).toBe("E");
    expect(gradeFor(0, SCALE)?.letter).toBe("F");
  });
  test("works whatever order the scale is in", () => {
    expect(gradeFor(55, [...SCALE].reverse())?.letter).toBe("C");
  });
  test("null without a total or a matching band", () => {
    expect(gradeFor(null, SCALE)).toBeNull();
    expect(gradeFor(30, [{ min_score: 40, letter: "E", grade_point: 1 }])).toBeNull();
  });
});

describe("gpa", () => {
  test("weights grade points by credit units", () => {
    // (3×5 + 2×4 + 3×3) / 8 = 32 / 8 = 4.00
    expect(
      gpa([
        { creditUnits: 3, gradePoint: 5 },
        { creditUnits: 2, gradePoint: 4 },
        { creditUnits: 3, gradePoint: 3 },
      ]),
    ).toBe(4);
  });
  test("rounds to two decimals", () => {
    // (3×5 + 3×4 + 3×2) / 9 = 33 / 9 = 3.666…
    expect(
      gpa([
        { creditUnits: 3, gradePoint: 5 },
        { creditUnits: 3, gradePoint: 4 },
        { creditUnits: 3, gradePoint: 2 },
      ]),
    ).toBe(3.67);
  });
  test("leaves out ungraded and zero-credit courses", () => {
    const courses = [
      { creditUnits: 3, gradePoint: 4 },
      { creditUnits: 2, gradePoint: null },
      { creditUnits: 0, gradePoint: 0 },
    ];
    expect(gpa(courses)).toBe(4);
    expect(creditUnitsCounted(courses)).toBe(3);
  });
  test("null when nothing counts", () => {
    expect(gpa([])).toBeNull();
    expect(gpa([{ creditUnits: 3, gradePoint: null }])).toBeNull();
  });
});

describe("cgpa", () => {
  test("is the GPA over every term, not the average of term GPAs", () => {
    const first = [{ creditUnits: 6, gradePoint: 5 }]; // GPA 5.00
    const second = [{ creditUnits: 2, gradePoint: 1 }]; // GPA 1.00
    // (30 + 2) / 8 = 4.00, not (5 + 1) / 2 = 3.00
    expect(cgpa([first, second])).toBe(4);
  });
});

describe("formatGpa", () => {
  test("always two decimals", () => {
    expect(formatGpa(4)).toBe("4.00");
    expect(formatGpa(3.5)).toBe("3.50");
    expect(formatGpa(null)).toBe("—");
  });
});

describe("parseScore", () => {
  test("empty is not entered", () => {
    expect(parseScore("  ", 40)).toBeNull();
  });
  test("accepts whole and two-decimal scores up to the maximum", () => {
    expect(parseScore("28", 40)).toBe(28);
    expect(parseScore("41.5", 60)).toBe(41.5);
    expect(parseScore("40", 40)).toBe(40);
  });
  test("refuses too high, negative, three decimals and text", () => {
    for (const input of ["41", "-1", "12.345", "ten", "1e2"]) {
      expect(parseScore(input, 40)).toBeUndefined();
    }
  });
});
