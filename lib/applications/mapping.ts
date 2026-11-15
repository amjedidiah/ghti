import type { Database } from "@/lib/supabase/database.types";
import { normalisePhone, type ApplicationValues } from "@/lib/validation/application";

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type ApplicationUpdate = Database["public"]["Tables"]["applications"]["Update"];

type EducationEntry = ApplicationValues["education"][number];

function readEducation(value: ApplicationRow["education"]): EducationEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item as Record<string, unknown>;
    return [
      {
        institution: typeof entry.institution === "string" ? entry.institution : "",
        qualification: typeof entry.qualification === "string" ? entry.qualification : "",
        year: entry.year == null ? "" : String(entry.year),
      },
    ];
  });
}

/** Database row -> form values ("" for empty). */
export function rowToValues(row: ApplicationRow): ApplicationValues {
  return {
    programmeId: row.programme_id ?? "",
    intakeTermId: row.intake_term_id ?? "",
    surname: row.surname ?? "",
    firstName: row.first_name ?? "",
    otherNames: row.other_names ?? "",
    dateOfBirth: row.date_of_birth ?? "",
    gender: row.gender === "male" || row.gender === "female" ? row.gender : "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    stateOfOrigin: row.state_of_origin ?? "",
    nationality: row.nationality ?? "",
    crmBranch: row.crm_branch ?? "",
    education: readEducation(row.education),
    nextOfKinName: row.next_of_kin_name ?? "",
    nextOfKinRelationship: row.next_of_kin_relationship ?? "",
    nextOfKinPhone: row.next_of_kin_phone ?? "",
    refereeName: row.referee_name ?? "",
    refereePosition: row.referee_position ?? "",
    refereePhone: row.referee_phone ?? "",
    refereeEmail: row.referee_email ?? "",
    consent: row.consent_given_at !== null,
  };
}

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());
const phoneOrNull = (value: string) => (value.trim() === "" ? null : normalisePhone(value));

/**
 * Validated form values -> database update. Empty answers become null, phone
 * numbers are stored in E.164, empty education rows are dropped. Consent keeps
 * its original time once given.
 */
export function valuesToUpdate(
  values: ApplicationValues,
  consentGivenAt: string | null,
): ApplicationUpdate {
  return {
    programme_id: orNull(values.programmeId),
    intake_term_id: orNull(values.intakeTermId),
    surname: orNull(values.surname),
    first_name: orNull(values.firstName),
    other_names: orNull(values.otherNames),
    date_of_birth: orNull(values.dateOfBirth),
    gender: values.gender === "" ? null : values.gender,
    phone: phoneOrNull(values.phone),
    email: orNull(values.email)?.toLowerCase() ?? null,
    address: orNull(values.address),
    state_of_origin: orNull(values.stateOfOrigin),
    nationality: orNull(values.nationality),
    crm_branch: orNull(values.crmBranch),
    education: values.education
      .filter(
        (entry) => entry.institution.trim() || entry.qualification.trim() || entry.year.trim(),
      )
      .map((entry) => ({
        institution: entry.institution.trim(),
        qualification: entry.qualification.trim(),
        year: entry.year.trim() === "" ? null : Number(entry.year),
      })),
    next_of_kin_name: orNull(values.nextOfKinName),
    next_of_kin_relationship: orNull(values.nextOfKinRelationship),
    next_of_kin_phone: phoneOrNull(values.nextOfKinPhone),
    referee_name: orNull(values.refereeName),
    referee_position: orNull(values.refereePosition),
    referee_phone: phoneOrNull(values.refereePhone),
    referee_email: orNull(values.refereeEmail)?.toLowerCase() ?? null,
    consent_given_at: values.consent ? (consentGivenAt ?? new Date().toISOString()) : null,
  };
}

/** Split an account name into first name and surname to prefill a new application. */
export function splitFullName(fullName: string): { firstName: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? "", surname: "" };
  return { firstName: parts[0]!, surname: parts[parts.length - 1]! };
}
