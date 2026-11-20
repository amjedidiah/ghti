import { z } from "zod";

// Grade approval (Stage 3, step 3.3). Pure; tested in grades.test.ts.

/** An admin's note when returning submitted grades to the lecturer. */
export const returnGradesSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Say what the lecturer should look at. They get this note by email.")
    .max(1000, "Keep the note under 1,000 characters."),
});

export type ReturnGradesValues = z.input<typeof returnGradesSchema>;
