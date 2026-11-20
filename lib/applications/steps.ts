import type { ApplicationValues } from "@/lib/validation/application";

// The application's steps (Stage 3, step 3.5), in the order of GHTI's paper
// form, and which answers each owns. Pure; tested in steps.test.ts.

type FieldName = keyof ApplicationValues | "transcript" | "photo";

export const APPLICATION_STEPS = [
  { id: "programme", title: "Programme", fields: ["programmeId", "intakeTermId"] },
  {
    id: "about",
    title: "About you",
    fields: [
      "title",
      "surname",
      "firstName",
      "otherNames",
      "dateOfBirth",
      "gender",
      "nationality",
      "maritalStatus",
      "phone",
      "email",
    ],
  },
  {
    id: "addresses",
    title: "Addresses and next of kin",
    fields: [
      "address",
      "permanentAddress",
      "nextOfKinName",
      "nextOfKinRelationship",
      "nextOfKinPhone",
      "nextOfKinEmail",
      "nextOfKinOccupation",
      "nextOfKinAddress",
    ],
  },
  { id: "work", title: "Work", fields: ["occupation", "employer", "natureOfWork"] },
  {
    id: "church",
    title: "Faith and church",
    fields: [
      "bornAgain",
      "bornAgainWhen",
      "church",
      "churchMembership",
      "churchDuties",
      "pastorName",
      "pastorPhone",
    ],
  },
  { id: "education", title: "Education", fields: ["education"] },
  { id: "referees", title: "Referees", fields: ["referees"] },
  { id: "documents", title: "Documents", fields: ["transcript", "photo"] },
  { id: "review", title: "Review and submit", fields: ["pledge", "consent"] },
] as const satisfies readonly { id: string; title: string; fields: readonly FieldName[] }[];

export const STEP_COUNT = APPLICATION_STEPS.length;
export type StepId = (typeof APPLICATION_STEPS)[number]["id"];

/** A step number (1 to STEP_COUNT) from `?step=`; anything else is step 1. */
export function parseStep(value: unknown): number {
  const step = typeof value === "string" && /^\d{1,2}$/.test(value) ? Number(value) : NaN;
  return step >= 1 && step <= STEP_COUNT ? step : 1;
}

/** The step (1-based) that owns a field path such as "referees.1.phone", or null. */
export function stepOfField(path: string): number | null {
  const field = path.split(".")[0];
  const index = APPLICATION_STEPS.findIndex((step) =>
    (step.fields as readonly string[]).includes(field),
  );
  return index < 0 ? null : index + 1;
}

/** One message per field path, from validation issues, for the given step only. */
export function issuesForStep(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  step: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".");
    if (stepOfField(path) === step) errors[path] ??= issue.message;
  }
  return errors;
}

/** The first step that has one of these errors, or null. */
export function firstStepWithError(fieldErrors: Record<string, string>): number | null {
  const steps = Object.keys(fieldErrors)
    .map(stepOfField)
    .filter((step): step is number => step !== null);
  return steps.length > 0 ? Math.min(...steps) : null;
}
