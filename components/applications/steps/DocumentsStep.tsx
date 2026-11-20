import type { ReactNode } from "react";

import DocumentUpload from "@/components/applications/DocumentUpload";
import StepSection from "@/components/applications/steps/StepSection";
import { recordDocument, removeDocument, type RecordedDocument } from "@/lib/applications/actions";
import { APPLICATION_DOCUMENTS, type ApplicationDocumentKind } from "@/lib/applications/documents";
import { documentPath } from "@/lib/files";

export type DocumentsByKind = Record<ApplicationDocumentKind, RecordedDocument[]>;

/** Step 8: certificates, photo and the optional documents. Files upload as soon as chosen. */
function DocumentsStep({
  applicationId,
  ownerId,
  documents,
  onChange,
  errors,
  fee,
}: {
  applicationId: string;
  ownerId: string;
  documents: DocumentsByKind;
  onChange: (kind: ApplicationDocumentKind, documents: RecordedDocument[]) => void;
  errors: Partial<Record<ApplicationDocumentKind, string>>;
  /** The application fee and how to pay it (site content), shown with proof of payment. */
  fee: ReactNode;
}) {
  return (
    <StepSection
      step={8}
      description="Files upload as soon as you choose them. On a phone you can take a photo instead."
    >
      {APPLICATION_DOCUMENTS.map((slot) => (
        <DocumentUpload
          key={slot.kind}
          pathFor={(id, type) => documentPath(ownerId, applicationId, id, type)}
          record={(file) => recordDocument({ applicationId, kind: slot.kind, ...file })}
          remove={removeDocument}
          label={slot.label}
          hint={
            slot.kind === "payment_proof" ? (
              <>
                <p>{slot.hint}</p>
                <div className="mt-2">{fee}</div>
              </>
            ) : (
              slot.hint
            )
          }
          required={slot.required}
          max={slot.max}
          documents={documents[slot.kind]}
          onChange={(next) => onChange(slot.kind, next)}
          error={errors[slot.kind]}
        />
      ))}
    </StepSection>
  );
}

export default DocumentsStep;
