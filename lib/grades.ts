// Grade maths (Stage 2, step 2.3). Pure functions, tested in grades.test.ts.
//
// The database stores each grade's total, letter and grade point (worked out
// by trigger from the grading scale when the scores are saved). These helpers
// preview a grade while an admin types, and compute GPA and CGPA for results.

/**
 * Maximum marks for continuous assessment and the exam. The plan's default
 * until GHTI confirms its split (client input #17); they must add up to 100.
 */
export const GRADE_SPLIT = { ca: 40, exam: 60 } as const;

export type GradeBand = { min_score: number; letter: string; grade_point: number };

/** CA + exam, or null when neither has been entered. */
export function totalScore(ca: number | null, exam: number | null): number | null {
  if (ca === null && exam === null) return null;
  return round2((ca ?? 0) + (exam ?? 0));
}

/** The band with the highest minimum at or below the total, or null. */
export function gradeFor(total: number | null, scale: readonly GradeBand[]): GradeBand | null {
  if (total === null) return null;
  let best: GradeBand | null = null;
  for (const band of scale) {
    if (band.min_score <= total && (!best || band.min_score > best.min_score)) best = band;
  }
  return best;
}

export type GradedCourse = { creditUnits: number; gradePoint: number | null };

/**
 * Grade point average: credit-weighted mean of grade points, to 2 decimals.
 * Courses without a grade point or with no credit units are left out; null
 * when nothing counts.
 */
export function gpa(courses: readonly GradedCourse[]): number | null {
  let units = 0;
  let points = 0;
  for (const course of courses) {
    if (course.gradePoint === null || course.creditUnits <= 0) continue;
    units += course.creditUnits;
    points += course.creditUnits * course.gradePoint;
  }
  return units === 0 ? null : round2(points / units);
}

/** Cumulative GPA over every term's courses. */
export function cgpa(terms: readonly (readonly GradedCourse[])[]): number | null {
  return gpa(terms.flat());
}

/** Credit units that count towards the GPA. */
export function creditUnitsCounted(courses: readonly GradedCourse[]): number {
  return courses.reduce(
    (sum, course) =>
      course.gradePoint === null || course.creditUnits <= 0 ? sum : sum + course.creditUnits,
    0,
  );
}

/** "3.67" (always two decimals), or an em dash when there is nothing to show. */
export function formatGpa(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

/**
 * Parse a score typed by an admin: "" is "not entered" (null), otherwise a
 * number from 0 to `max` with at most two decimals. Returns undefined when
 * the input is not a valid score.
 */
export function parseScore(input: string, max: number): number | null | undefined {
  const value = input.trim();
  if (value === "") return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return undefined;
  const score = Number(value);
  return score <= max ? score : undefined;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
