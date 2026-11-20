import { formatGpa } from "@/lib/grades";
import { LEVEL_LABELS, type ProgrammeLevel } from "@/lib/programmes";
import { groupResults, type RegistrationResult } from "@/lib/results";
import { STUDENT_STATUS_LABELS, type StudentStatus } from "@/lib/validation/students";

// The unofficial transcript (Stage 3, step 3.4): what goes on the PDF.
// Published grades only, as in the portal. Pure; tested in transcript.test.ts.

export type TranscriptInput = {
  name: string;
  record: {
    matric_no: string;
    status: StudentStatus;
    programme: { title: string; level: ProgrammeLevel } | null;
    entry_term: { name: string; session: string } | null;
  };
  registrations: readonly RegistrationResult[];
  now: Date;
};

export type Transcript = ReturnType<typeof buildTranscript>;

const dateFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "long",
  timeZone: "Africa/Lagos",
});

export function buildTranscript({ name, record, registrations, now }: TranscriptInput) {
  const results = groupResults(registrations);
  const terms = results.terms
    .map((term) => ({
      label: term.label,
      gpa: formatGpa(term.gpa),
      unitsCounted: term.unitsCounted,
      courses: term.courses
        .filter((course) => course.published)
        .map((course) => ({
          code: course.code,
          title: course.title,
          creditUnits: course.creditUnits,
          total: course.total === null ? "" : String(course.total),
          letter: course.letter ?? "",
          gradePoint: course.gradePoint === null ? "" : course.gradePoint.toFixed(2),
        })),
    }))
    .filter((term) => term.courses.length > 0);

  return {
    student: {
      name: name || "(no name)",
      matricNo: record.matric_no,
      programme: record.programme
        ? `${record.programme.title} (${LEVEL_LABELS[record.programme.level].singular})`
        : "",
      entryTerm: record.entry_term ? `${record.entry_term.name}, ${record.entry_term.session}` : "",
      status: STUDENT_STATUS_LABELS[record.status],
    },
    terms,
    cgpa: formatGpa(results.cgpa),
    unitsCounted: results.unitsCounted,
    generatedOn: dateFormat.format(now),
  };
}

/** "ghti-transcript-2026-11-20.pdf": no name or matric number in the file name. */
export function transcriptFileName(now: Date): string {
  return `ghti-transcript-${now.toISOString().slice(0, 10)}.pdf`;
}
