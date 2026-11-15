import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

// Application form schemas, shared by the client form and Server Actions.
// The field list follows the plan's defaults until the client's own form
// arrives (docs/client_inputs.md #4). The database (submit_application) is the
// final check on completeness.

export const MAX_EDUCATION_ENTRIES = 5;
const THIS_YEAR = new Date().getFullYear();

/** Nigerian states plus the FCT, for "state of origin". */
export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Outside Nigeria",
] as const;

/** Show a stored E.164 number in a readable international format, e.g. +234 803 123 4567. */
export function formatPhone(value: string): string {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}

/** Normalise a phone number to E.164 (Nigeria by default), or null if it is not valid. */
export function normalisePhone(value: string): string | null {
  const phone = parsePhoneNumberFromString(value.trim(), "NG");
  return phone?.isValid() ? phone.number : null;
}

const text = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer.`);

const phone = z
  .string()
  .trim()
  .refine((value) => value === "" || normalisePhone(value) !== null, {
    message: "Enter a valid phone number, like 0803 123 4567 or +234 803 123 4567.",
  });

const email = z
  .string()
  .trim()
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Enter a valid email address, like name@example.com.",
  });

const educationEntry = z.object({
  institution: text(200),
  qualification: text(200),
  year: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}$/.test(value), "Enter a four-digit year.")
    .refine(
      (value) => value === "" || (Number(value) >= 1950 && Number(value) <= THIS_YEAR + 1),
      `Enter a year between 1950 and ${THIS_YEAR + 1}.`,
    ),
});

/**
 * Draft: every field optional, but anything entered must be well-formed.
 * Strings are kept as strings ("" for empty) so the form stays controlled.
 */
export const applicationDraftSchema = z.object({
  programmeId: z.union([z.uuid("Choose a programme."), z.literal("")]),
  intakeTermId: z.union([z.uuid("Choose an intake."), z.literal("")]),
  surname: text(100),
  firstName: text(100),
  otherNames: text(200),
  dateOfBirth: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date.")
    .refine(
      (value) => value === "" || (value >= "1920-01-01" && value <= todayIso()),
      "Enter your real date of birth.",
    ),
  gender: z.enum(["", "male", "female"]),
  phone,
  email,
  address: text(500),
  stateOfOrigin: text(100),
  nationality: text(100),
  crmBranch: text(200),
  education: z.array(educationEntry).max(MAX_EDUCATION_ENTRIES),
  nextOfKinName: text(200),
  nextOfKinRelationship: text(100),
  nextOfKinPhone: phone,
  refereeName: text(200),
  refereePosition: text(200),
  refereePhone: phone,
  refereeEmail: email,
  consent: z.boolean(),
});

const filled = (value: string) => value.trim() !== "";

/** Submit: the draft rules plus everything the database requires. */
export const applicationSubmitSchema = applicationDraftSchema.superRefine((values, ctx) => {
  const need = (field: keyof typeof values, ok: boolean, message: string) => {
    if (!ok) ctx.addIssue({ code: "custom", path: [field], message });
  };
  need("programmeId", values.programmeId !== "", "Choose a programme.");
  need("intakeTermId", values.intakeTermId !== "", "Choose an intake.");
  need("surname", filled(values.surname), "Enter your surname.");
  need("firstName", filled(values.firstName), "Enter your first name.");
  need("dateOfBirth", values.dateOfBirth !== "", "Enter your date of birth.");
  need("gender", values.gender !== "", "Choose your gender.");
  need("phone", values.phone !== "", "Enter your phone number.");
  need("email", values.email !== "", "Enter your email address.");
  need("address", filled(values.address), "Enter your address.");
  need("stateOfOrigin", values.stateOfOrigin !== "", "Choose your state of origin.");
  need("nationality", filled(values.nationality), "Enter your nationality.");
  need("nextOfKinName", filled(values.nextOfKinName), "Enter your next of kin's name.");
  need(
    "nextOfKinRelationship",
    filled(values.nextOfKinRelationship),
    "Say how they are related to you.",
  );
  need("nextOfKinPhone", values.nextOfKinPhone !== "", "Enter your next of kin's phone number.");
  need("consent", values.consent, "Tick the box to agree before you submit.");

  const completeEntries = values.education.filter(
    (entry) => entry.institution && entry.qualification,
  );
  if (completeEntries.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["education"],
      message: "Add at least one school or qualification.",
    });
  }
  values.education.forEach((entry, index) => {
    const started = entry.institution || entry.qualification || entry.year;
    if (!started) return;
    if (!entry.institution)
      ctx.addIssue({
        code: "custom",
        path: ["education", index, "institution"],
        message: "Enter the school or institution.",
      });
    if (!entry.qualification)
      ctx.addIssue({
        code: "custom",
        path: ["education", index, "qualification"],
        message: "Enter the qualification.",
      });
    if (!entry.year)
      ctx.addIssue({
        code: "custom",
        path: ["education", index, "year"],
        message: "Enter the year.",
      });
  });
});

export type ApplicationValues = z.input<typeof applicationDraftSchema>;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Messages for the fields submit_application() reports as missing. */
export const MISSING_FIELD_MESSAGES: Record<string, { field: string; message: string }> = {
  programme_id: {
    field: "programmeId",
    message: "Choose a programme that is open for applications.",
  },
  intake_term_id: {
    field: "intakeTermId",
    message: "Choose an intake that is open for applications.",
  },
  surname: { field: "surname", message: "Enter your surname." },
  first_name: { field: "firstName", message: "Enter your first name." },
  date_of_birth: { field: "dateOfBirth", message: "Enter your date of birth." },
  gender: { field: "gender", message: "Choose your gender." },
  phone: { field: "phone", message: "Enter your phone number." },
  email: { field: "email", message: "Enter your email address." },
  address: { field: "address", message: "Enter your address." },
  state_of_origin: { field: "stateOfOrigin", message: "Choose your state of origin." },
  nationality: { field: "nationality", message: "Enter your nationality." },
  education: { field: "education", message: "Add at least one school or qualification." },
  next_of_kin_name: { field: "nextOfKinName", message: "Enter your next of kin's name." },
  next_of_kin_relationship: {
    field: "nextOfKinRelationship",
    message: "Say how they are related to you.",
  },
  next_of_kin_phone: { field: "nextOfKinPhone", message: "Enter your next of kin's phone number." },
  consent: { field: "consent", message: "Tick the box to agree before you submit." },
  transcript: { field: "transcript", message: "Upload your transcript." },
};
