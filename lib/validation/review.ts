import { z } from "zod";

/** Admin decision on an application. A rejection needs a note for the applicant. */
export const decisionSchema = z
  .object({
    decision: z.enum(["admitted", "rejected"], "Choose admit or not admit."),
    note: z.string().trim().max(2000, "Keep the note under 2,000 characters."),
  })
  .refine((value) => value.decision === "admitted" || value.note.length > 0, {
    message: "Write a note for the applicant before rejecting.",
    path: ["note"],
  });

export type DecisionValues = z.input<typeof decisionSchema>;
