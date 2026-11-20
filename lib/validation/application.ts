import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

// Application form schemas, shared by the client form and Server Actions.
// The questions follow GHTI's paper "Application for Admission" (client input
// #4, received 20 Nov 2026). The database (submit_application) is the final
// check on completeness; its list of required answers matches the submit
// schema here.

export const MAX_EDUCATION_ENTRIES = 5;
/** The paper form asks for two referees who can vouch for the applicant's Christian character. */
export const REFEREE_COUNT = 2;
const THIS_YEAR = new Date().getFullYear();

export const MARITAL_STATUSES = [
  "unmarried",
  "married",
  "divorced",
  "separated",
  "widowed",
] as const satisfies readonly Database["public"]["Enums"]["marital_status"][];

export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  unmarried: "Unmarried",
  married: "Married",
  divorced: "Divorced",
  separated: "Separated",
  widowed: "Widowed",
};

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

const year = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}$/.test(value), "Enter a four-digit year.")
  .refine(
    (value) => value === "" || (Number(value) >= 1950 && Number(value) <= THIS_YEAR + 1),
    `Enter a year between 1950 and ${THIS_YEAR + 1}.`,
  );

const educationEntry = z
  .object({
    institution: text(200),
    address: text(300),
    from: year,
    to: year,
    certificate: text(200),
  })
  .refine((entry) => !entry.from || !entry.to || entry.from <= entry.to, {
    path: ["to"],
    message: "The year you left cannot be before the year you started.",
  });

const refereeEntry = z.object({
  name: text(200),
  address: text(500),
  occupation: text(200),
  email,
  phone,
});

/**
 * Draft: every answer optional, but anything entered must be well formed.
 * Strings stay strings ("" for empty) so the form stays controlled.
 */
export const applicationDraftSchema = z.object({
  programmeId: z.union([z.uuid("Choose a programme."), z.literal("")]),
  intakeTermId: z.union([z.uuid("Choose an intake."), z.literal("")]),
  title: text(30),
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
  nationality: text(100),
  maritalStatus: z.enum(["", ...MARITAL_STATUSES]),
  phone,
  email,
  address: text(500),
  permanentAddress: text(500),
  nextOfKinName: text(200),
  nextOfKinRelationship: text(100),
  nextOfKinPhone: phone,
  nextOfKinEmail: email,
  nextOfKinOccupation: text(200),
  nextOfKinAddress: text(500),
  occupation: text(200),
  employer: text(1000),
  natureOfWork: text(1000),
  bornAgain: z.enum(["", "yes", "no"]),
  bornAgainWhen: text(100),
  church: text(300),
  churchMembership: text(100),
  churchDuties: text(1000),
  pastorName: text(200),
  pastorPhone: phone,
  education: z.array(educationEntry).max(MAX_EDUCATION_ENTRIES),
  referees: z.array(refereeEntry).max(REFEREE_COUNT),
  pledge: z.boolean(),
  consent: z.boolean(),
});

const filled = (value: string) => value.trim() !== "";

/** Submit: the draft rules plus every answer the database requires. */
export const applicationSubmitSchema = applicationDraftSchema.superRefine((values, ctx) => {
  const need = (path: (string | number)[], ok: boolean, message: string) => {
    if (!ok) ctx.addIssue({ code: "custom", path, message });
  };
  need(["programmeId"], values.programmeId !== "", "Choose a programme.");
  need(["intakeTermId"], values.intakeTermId !== "", "Choose an intake.");
  need(["surname"], filled(values.surname), "Enter your surname.");
  need(["firstName"], filled(values.firstName), "Enter your first name.");
  need(["dateOfBirth"], values.dateOfBirth !== "", "Enter your date of birth.");
  need(["gender"], values.gender !== "", "Choose your sex.");
  need(["nationality"], filled(values.nationality), "Enter your nationality.");
  need(["maritalStatus"], values.maritalStatus !== "", "Choose your marital status.");
  need(["phone"], values.phone !== "", "Enter your phone number.");
  need(["email"], values.email !== "", "Enter your email address.");
  need(["address"], filled(values.address), "Enter your current postal address.");
  need(["permanentAddress"], filled(values.permanentAddress), "Enter your permanent home address.");
  need(["nextOfKinName"], filled(values.nextOfKinName), "Enter your next of kin's name.");
  need(
    ["nextOfKinRelationship"],
    filled(values.nextOfKinRelationship),
    "Say how they are related to you.",
  );
  need(["nextOfKinPhone"], values.nextOfKinPhone !== "", "Enter your next of kin's phone number.");
  need(["bornAgain"], values.bornAgain !== "", "Answer yes or no.");
  need(["church"], filled(values.church), "Enter the name and location of your church.");
  need(["pastorName"], filled(values.pastorName), "Enter your pastor's name.");
  need(["pastorPhone"], values.pastorPhone !== "", "Enter your pastor's phone number.");

  const started = (entry: Record<string, string>) => Object.values(entry).some(filled);
  if (!values.education.some((entry) => filled(entry.institution) && filled(entry.certificate))) {
    need(["education"], false, "Add at least one school and the certificate you obtained.");
  }
  values.education.forEach((entry, index) => {
    if (!started(entry)) return;
    need(["education", index, "institution"], filled(entry.institution), "Enter the institution.");
    need(
      ["education", index, "certificate"],
      filled(entry.certificate),
      "Enter the certificate obtained.",
    );
  });

  for (let index = 0; index < REFEREE_COUNT; index += 1) {
    const referee = values.referees[index];
    need(["referees", index, "name"], filled(referee?.name ?? ""), "Enter the referee's name.");
    need(
      ["referees", index, "phone"],
      (referee?.phone ?? "") !== "",
      "Enter the referee's phone number.",
    );
  }

  need(["pledge"], values.pledge, "Tick the box to make the pledge before you submit.");
  need(["consent"], values.consent, "Tick the box to agree before you submit.");
});

export type ApplicationValues = z.input<typeof applicationDraftSchema>;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Messages for the answers submit_application() reports as missing, by the
 * database's name. "transcript" and "photo" are documents, not form fields.
 */
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
  gender: { field: "gender", message: "Choose your sex." },
  nationality: { field: "nationality", message: "Enter your nationality." },
  marital_status: { field: "maritalStatus", message: "Choose your marital status." },
  phone: { field: "phone", message: "Enter your phone number." },
  email: { field: "email", message: "Enter your email address." },
  address: { field: "address", message: "Enter your current postal address." },
  permanent_address: { field: "permanentAddress", message: "Enter your permanent home address." },
  next_of_kin_name: { field: "nextOfKinName", message: "Enter your next of kin's name." },
  next_of_kin_relationship: {
    field: "nextOfKinRelationship",
    message: "Say how they are related to you.",
  },
  next_of_kin_phone: { field: "nextOfKinPhone", message: "Enter your next of kin's phone number." },
  born_again: { field: "bornAgain", message: "Answer yes or no." },
  church: { field: "church", message: "Enter the name and location of your church." },
  pastor_name: { field: "pastorName", message: "Enter your pastor's name." },
  pastor_phone: { field: "pastorPhone", message: "Enter your pastor's phone number." },
  education: {
    field: "education",
    message: "Add at least one school and the certificate you obtained.",
  },
  referees: { field: "referees", message: "Give two referees, each with a name and phone number." },
  transcript: { field: "transcript", message: "Upload your certificates or results." },
  photo: { field: "photo", message: "Upload a passport photograph." },
  pledge: { field: "pledge", message: "Tick the box to make the pledge before you submit." },
  consent: { field: "consent", message: "Tick the box to agree before you submit." },
};
