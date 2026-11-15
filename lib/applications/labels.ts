import type { Database } from "@/lib/supabase/database.types";

type DocumentKind = Database["public"]["Enums"]["document_kind"];

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  transcript: "Transcript or result",
  id_card: "Means of identification",
  photo: "Passport photograph",
  other: "Other document",
};

/** Applicant's name as written on the form: first, other names, surname. */
export function applicantName(row: {
  first_name: string | null;
  other_names: string | null;
  surname: string | null;
}): string {
  return [row.first_name, row.other_names, row.surname].filter(Boolean).join(" ");
}
