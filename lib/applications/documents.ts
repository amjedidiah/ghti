import type { Database } from "@/lib/supabase/database.types";

// The documents an applicant uploads (Stage 3, step 3.5; client input #5):
// what each slot is called, whether it is required and how many files it
// holds. Used by the form, by recordDocument and for labels. Required slots
// match submit_application() ("transcript" and "photo").

export type DocumentKind = Database["public"]["Enums"]["document_kind"];

export type DocumentSlot = {
  kind: Exclude<DocumentKind, "other">;
  label: string;
  hint: string;
  required: boolean;
  /** Most files the slot holds; with 1, a new upload replaces the old one. */
  max: number;
};

export const APPLICATION_DOCUMENTS = [
  {
    kind: "transcript",
    label: "Certificates and results",
    hint: "Your certificates, transcripts or WAEC/NECO results. A clear phone photo of each is fine.",
    required: true,
    max: 5,
  },
  {
    kind: "photo",
    label: "Passport photograph",
    hint: "A recent photo of your face against a plain background.",
    required: true,
    max: 1,
  },
  {
    kind: "id_card",
    label: "Means of identification",
    hint: "National ID (NIN slip), international passport, driver's licence or voter's card.",
    required: false,
    max: 1,
  },
  {
    kind: "endorsement",
    label: "Pastor's endorsement",
    hint: "A signed letter or note from your pastor supporting your application.",
    required: false,
    max: 1,
  },
  {
    kind: "payment_proof",
    label: "Proof of payment",
    hint: "The receipt or transfer confirmation for the application fee.",
    required: false,
    max: 1,
  },
] as const satisfies readonly DocumentSlot[];

export type ApplicationDocumentKind = (typeof APPLICATION_DOCUMENTS)[number]["kind"];

export const APPLICATION_DOCUMENT_KINDS = APPLICATION_DOCUMENTS.map((slot) => slot.kind) as [
  ApplicationDocumentKind,
  ...ApplicationDocumentKind[],
];

export function documentSlot(kind: string): DocumentSlot | undefined {
  return APPLICATION_DOCUMENTS.find((slot) => slot.kind === kind);
}
