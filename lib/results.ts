import { cgpa, creditUnitsCounted, gpa, type GradedCourse } from "@/lib/grades";

// A student's results (Stage 2, step 2.4): their registrations grouped by
// term, oldest first, with each term's GPA and the overall CGPA. Only
// published grades count; RLS never even returns the others.

export type RegistrationResult = {
  term: { id: string; session: string; name: string; starts_on: string | null } | null;
  course: { code: string; title: string; credit_units: number } | null;
  grade: { total: number | null; letter: string | null; grade_point: number | null } | null;
};

export type CourseResult = {
  code: string;
  title: string;
  creditUnits: number;
  total: number | null;
  letter: string | null;
  gradePoint: number | null;
  /** True when a published grade exists. */
  published: boolean;
};

export type TermResults = {
  termId: string;
  label: string;
  courses: CourseResult[];
  gpa: number | null;
  /** Credit units of courses with a published grade. */
  unitsCounted: number;
  unitsRegistered: number;
};

function termOrder(a: TermKey, b: TermKey): number {
  return (
    a.session.localeCompare(b.session) ||
    (a.starts_on ?? "9999").localeCompare(b.starts_on ?? "9999") ||
    a.name.localeCompare(b.name)
  );
}

type TermKey = NonNullable<RegistrationResult["term"]>;

export function groupResults(registrations: readonly RegistrationResult[]): {
  terms: TermResults[];
  cgpa: number | null;
  unitsCounted: number;
} {
  const byTerm = new Map<string, { term: TermKey; courses: CourseResult[] }>();
  for (const registration of registrations) {
    if (!registration.term || !registration.course) continue;
    const entry = byTerm.get(registration.term.id) ?? { term: registration.term, courses: [] };
    const published = registration.grade !== null && registration.grade.total !== null;
    entry.courses.push({
      code: registration.course.code,
      title: registration.course.title,
      creditUnits: registration.course.credit_units,
      total: published ? Number(registration.grade?.total) : null,
      letter: published ? (registration.grade?.letter ?? null) : null,
      gradePoint:
        published && registration.grade?.grade_point != null
          ? Number(registration.grade.grade_point)
          : null,
      published,
    });
    byTerm.set(registration.term.id, entry);
  }

  const terms = [...byTerm.values()]
    .sort((a, b) => termOrder(a.term, b.term))
    .map(({ term, courses }) => {
      const sorted = [...courses].sort((a, b) => a.code.localeCompare(b.code));
      const graded: GradedCourse[] = sorted.map((course) => ({
        creditUnits: course.creditUnits,
        gradePoint: course.gradePoint,
      }));
      return {
        termId: term.id,
        label: `${term.name}, ${term.session}`,
        courses: sorted,
        gpa: gpa(graded),
        unitsCounted: creditUnitsCounted(graded),
        unitsRegistered: sorted.reduce((sum, course) => sum + course.creditUnits, 0),
      };
    });

  const allGraded = terms.map((term) =>
    term.courses.map((course) => ({
      creditUnits: course.creditUnits,
      gradePoint: course.gradePoint,
    })),
  );
  return {
    terms,
    cgpa: cgpa(allGraded),
    unitsCounted: terms.reduce((sum, term) => sum + term.unitsCounted, 0),
  };
}
