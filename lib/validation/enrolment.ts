import { z } from "zod";

// Enrolling an admitted applicant as a student (Stage 2, step 2.2). The final
// matric number format comes from GHTI (client input #18); until then any
// upper-case letters, digits, "/" and "-" are accepted, matching the database.

export const MATRIC_PATTERN = /^[A-Z0-9][A-Z0-9/-]{0,39}$/;

export const enrolmentSchema = z.object({
  matricNo: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(
      z
        .string()
        .min(1, "Enter the student's matric number.")
        .regex(
          MATRIC_PATTERN,
          'Use letters, numbers, "/" and "-" only (up to 40), like GHTI/2026/CERT/001.',
        ),
    ),
  entryTermId: z.uuid({ message: "Choose the term the student starts in." }),
});

export type EnrolmentValues = z.input<typeof enrolmentSchema>;
