import { FileText } from "lucide-react";

import ApplicationDetails, { Panel } from "@/components/applications/ApplicationDetails";
import { CheckField, type ApplicationForm } from "@/components/applications/fields";
import type { DocumentsByKind } from "@/components/applications/steps/DocumentsStep";
import type { ProgrammeOption } from "@/components/applications/steps/ProgrammeStep";
import StepSection from "@/components/applications/steps/StepSection";
import { APPLICATION_DOCUMENTS } from "@/lib/applications/documents";
import type { ApplicationValues } from "@/lib/validation/application";

/** Step 9: check every answer, make the pledge, agree, and submit. */
function ReviewStep({
  form,
  values,
  programmes,
  intakes,
  documents,
  onEdit,
}: {
  form: ApplicationForm;
  /** The current answers (the form watches them). */
  values: ApplicationValues;
  programmes: ProgrammeOption[];
  intakes: { id: string; label: string }[];
  documents: DocumentsByKind;
  onEdit: (step: number) => void;
}) {
  const programme = programmes.find((item) => item.id === values.programmeId) ?? null;
  const intake = intakes.find((item) => item.id === values.intakeTermId);

  return (
    <div className="space-y-6">
      <StepSection step={9}>
        <p className="text-secondary">
          Check your answers. Use Change to correct anything, then make the pledge and submit at the
          bottom of the page.
        </p>
      </StepSection>
      <ApplicationDetails
        values={values}
        programme={programme}
        intake={intake?.label ?? null}
        onEdit={onEdit}
      />
      <Panel
        title="Documents"
        action={
          <button
            type="button"
            onClick={() => onEdit(8)}
            className="text-sm font-semibold text-accent-strong hover:underline"
          >
            Change<span className="sr-only"> documents</span>
          </button>
        }
      >
        <ul className="space-y-2 text-sm">
          {APPLICATION_DOCUMENTS.map((slot) => {
            const files = documents[slot.kind];
            return (
              <li key={slot.kind} className="flex gap-2">
                <FileText className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="font-semibold text-primary">{slot.label}:</span>{" "}
                  <span className="text-secondary">
                    {files.length > 0
                      ? files.map((file) => file.fileName).join(", ")
                      : slot.required
                        ? "Not uploaded yet (required)"
                        : "None"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Pledge and declaration">
        <div className="space-y-5">
          <CheckField form={form} name="pledge">
            I agree to abide by the rules and regulations of Great Harvest Theological Institute,
            and by any additional rules the Institute may make during my studentship at GHTI.
          </CheckField>
          <CheckField form={form} name="consent">
            The information I have given is true and complete. I agree that GHTI may store and use
            it, and the documents I upload, to consider my application for admission, as described
            in the{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent-strong underline"
            >
              privacy notice
            </a>
            .
          </CheckField>
        </div>
      </Panel>
    </div>
  );
}

export default ReviewStep;
