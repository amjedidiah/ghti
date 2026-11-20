import { APPLICATION_DOCUMENTS, type DocumentKind } from "@/lib/applications/documents";

export const DOCUMENT_LABELS = {
  ...(Object.fromEntries(APPLICATION_DOCUMENTS.map((slot) => [slot.kind, slot.label])) as Record<
    Exclude<DocumentKind, "other">,
    string
  >),
  other: "Other document",
} satisfies Record<DocumentKind, string>;

/** Applicant's name as written on the form: first, other names, surname. */
export function applicantName(row: {
  first_name: string | null;
  other_names: string | null;
  surname: string | null;
}): string {
  return [row.first_name, row.other_names, row.surname].filter(Boolean).join(" ");
}
