import type { Database } from "@/lib/supabase/database.types";
import { groupResults, type RegistrationResult } from "@/lib/results";

// The grades part of a student's file for admins (Stage 2, step 2.5). Admins
// see every grade with its status; GPA and CGPA still count published grades
// only, exactly as the student sees them. Pure; tested in student-file.test.ts.

type GradeStatus = Database["public"]["Enums"]["grade_status"];

export type AdminRegistration = {
  term: RegistrationResult["term"];
  course: RegistrationResult["course"];
  grade: {
    total: number | null;
    letter: string | null;
    grade_point: number | null;
    status: GradeStatus;
  } | null;
};

export type AdminCourseResult = {
  code: string;
  title: string;
  creditUnits: number;
  total: number | null;
  letter: string | null;
  /** "none" when no grade has been entered yet. */
  status: GradeStatus | "none";
};

export function studentFileResults(registrations: readonly AdminRegistration[]) {
  // Published grades only, for GPA and CGPA.
  const published = groupResults(
    registrations.map((registration) => ({
      term: registration.term,
      course: registration.course,
      grade: registration.grade?.status === "published" ? registration.grade : null,
    })),
  );

  const byTermAndCode = new Map<string, AdminRegistration["grade"]>();
  for (const registration of registrations) {
    if (registration.term && registration.course) {
      byTermAndCode.set(`${registration.term.id}:${registration.course.code}`, registration.grade);
    }
  }

  return {
    cgpa: published.cgpa,
    unitsCounted: published.unitsCounted,
    terms: published.terms.map((term) => ({
      termId: term.termId,
      label: term.label,
      gpa: term.gpa,
      unitsRegistered: term.unitsRegistered,
      courses: term.courses.map((course): AdminCourseResult => {
        const grade = byTermAndCode.get(`${term.termId}:${course.code}`) ?? null;
        return {
          code: course.code,
          title: course.title,
          creditUnits: course.creditUnits,
          total: grade?.total == null ? null : Number(grade.total),
          letter: grade?.letter ?? null,
          status: grade?.status ?? "none",
        };
      }),
    })),
  };
}
