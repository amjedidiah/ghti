import type { Database, Json } from "@/lib/supabase/database.types";
import {
  normalisePhone,
  REFEREE_COUNT,
  type ApplicationValues,
} from "@/lib/validation/application";

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type ApplicationUpdate = Database["public"]["Tables"]["applications"]["Update"];

type EducationEntry = ApplicationValues["education"][number];
type RefereeEntry = ApplicationValues["referees"][number];

const EMPTY_REFEREE: RefereeEntry = { name: "", address: "", occupation: "", email: "", phone: "" };

/** The objects in a stored JSON array (anything else is skipped). */
function objects(value: Json): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? [item as Record<string, unknown>]
      : [],
  );
}

const asText = (value: unknown) =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

function readEducation(value: ApplicationRow["education"]): EducationEntry[] {
  return objects(value).map((entry) => ({
    institution: asText(entry.institution),
    address: asText(entry.address),
    from: asText(entry.from),
    to: asText(entry.to),
    certificate: asText(entry.certificate),
  }));
}

/** Always two referees in the form, however many are stored. */
function readReferees(value: ApplicationRow["referees"]): RefereeEntry[] {
  const stored = objects(value).map((entry) => ({
    name: asText(entry.name),
    address: asText(entry.address),
    occupation: asText(entry.occupation),
    email: asText(entry.email),
    phone: asText(entry.phone),
  }));
  return Array.from({ length: REFEREE_COUNT }, (_, index) => stored[index] ?? EMPTY_REFEREE);
}

const yesNo = (value: boolean | null) => (value === null ? "" : value ? "yes" : "no");

/** Database row -> form values ("" for empty). */
export function rowToValues(row: ApplicationRow): ApplicationValues {
  return {
    programmeId: row.programme_id ?? "",
    intakeTermId: row.intake_term_id ?? "",
    title: row.title ?? "",
    surname: row.surname ?? "",
    firstName: row.first_name ?? "",
    otherNames: row.other_names ?? "",
    dateOfBirth: row.date_of_birth ?? "",
    gender: row.gender === "male" || row.gender === "female" ? row.gender : "",
    nationality: row.nationality ?? "",
    maritalStatus: row.marital_status ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    permanentAddress: row.permanent_address ?? "",
    nextOfKinName: row.next_of_kin_name ?? "",
    nextOfKinRelationship: row.next_of_kin_relationship ?? "",
    nextOfKinPhone: row.next_of_kin_phone ?? "",
    nextOfKinEmail: row.next_of_kin_email ?? "",
    nextOfKinOccupation: row.next_of_kin_occupation ?? "",
    nextOfKinAddress: row.next_of_kin_address ?? "",
    occupation: row.occupation ?? "",
    employer: row.employer ?? "",
    natureOfWork: row.nature_of_work ?? "",
    bornAgain: yesNo(row.born_again),
    bornAgainWhen: row.born_again_when ?? "",
    church: row.church ?? "",
    churchMembership: row.church_membership ?? "",
    churchDuties: row.church_duties ?? "",
    pastorName: row.pastor_name ?? "",
    pastorPhone: row.pastor_phone ?? "",
    education: readEducation(row.education),
    referees: readReferees(row.referees),
    pledge: row.pledge_given_at !== null,
    consent: row.consent_given_at !== null,
  };
}

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());
const phoneOrNull = (value: string) => (value.trim() === "" ? null : normalisePhone(value));
const emailOrNull = (value: string) => orNull(value)?.toLowerCase() ?? null;
const yearOrNull = (value: string) => (value.trim() === "" ? null : Number(value));
const started = (entry: Record<string, string>) =>
  Object.values(entry).some((value) => value.trim() !== "");

/** Drop null fields from a JSON entry, so stored entries stay small. */
function compact(entry: Record<string, string | number | null>): { [key: string]: Json } {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== null));
}

/**
 * Validated form values -> database update. Empty answers become null, phone
 * numbers are stored in E.164, empty education and referee entries are
 * dropped. Consent and the pledge keep their original time once given.
 */
export function valuesToUpdate(
  values: ApplicationValues,
  given: { consentGivenAt: string | null; pledgeGivenAt: string | null },
): ApplicationUpdate {
  const now = new Date().toISOString();
  return {
    programme_id: orNull(values.programmeId),
    intake_term_id: orNull(values.intakeTermId),
    title: orNull(values.title),
    surname: orNull(values.surname),
    first_name: orNull(values.firstName),
    other_names: orNull(values.otherNames),
    date_of_birth: orNull(values.dateOfBirth),
    gender: values.gender === "" ? null : values.gender,
    nationality: orNull(values.nationality),
    marital_status: values.maritalStatus === "" ? null : values.maritalStatus,
    phone: phoneOrNull(values.phone),
    email: emailOrNull(values.email),
    address: orNull(values.address),
    permanent_address: orNull(values.permanentAddress),
    next_of_kin_name: orNull(values.nextOfKinName),
    next_of_kin_relationship: orNull(values.nextOfKinRelationship),
    next_of_kin_phone: phoneOrNull(values.nextOfKinPhone),
    next_of_kin_email: emailOrNull(values.nextOfKinEmail),
    next_of_kin_occupation: orNull(values.nextOfKinOccupation),
    next_of_kin_address: orNull(values.nextOfKinAddress),
    occupation: orNull(values.occupation),
    employer: orNull(values.employer),
    nature_of_work: orNull(values.natureOfWork),
    born_again: values.bornAgain === "" ? null : values.bornAgain === "yes",
    born_again_when: orNull(values.bornAgainWhen),
    church: orNull(values.church),
    church_membership: orNull(values.churchMembership),
    church_duties: orNull(values.churchDuties),
    pastor_name: orNull(values.pastorName),
    pastor_phone: phoneOrNull(values.pastorPhone),
    education: values.education.filter(started).map((entry) =>
      compact({
        institution: orNull(entry.institution),
        address: orNull(entry.address),
        from: yearOrNull(entry.from),
        to: yearOrNull(entry.to),
        certificate: orNull(entry.certificate),
      }),
    ),
    referees: values.referees.filter(started).map((entry) =>
      compact({
        name: orNull(entry.name),
        address: orNull(entry.address),
        occupation: orNull(entry.occupation),
        email: emailOrNull(entry.email),
        phone: phoneOrNull(entry.phone),
      }),
    ),
    pledge_given_at: values.pledge ? (given.pledgeGivenAt ?? now) : null,
    consent_given_at: values.consent ? (given.consentGivenAt ?? now) : null,
  };
}

/** Split an account name into first name and surname to prefill a new application. */
export function splitFullName(fullName: string): { firstName: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? "", surname: "" };
  return { firstName: parts[0]!, surname: parts[parts.length - 1]! };
}
