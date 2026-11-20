import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import { errorFor, TextField, type ApplicationForm } from "@/components/applications/fields";
import StepSection from "@/components/applications/steps/StepSection";
import { MAX_EDUCATION_ENTRIES } from "@/lib/validation/application";

export const EMPTY_EDUCATION = { institution: "", address: "", from: "", to: "", certificate: "" };

/** Step 6: primary, secondary and tertiary institutions attended. */
function EducationStep({ form }: { form: ApplicationForm }) {
  const education = useFieldArray({ control: form.control, name: "education" });
  const error = errorFor(form, "education");

  return (
    <StepSection
      step={6}
      description="The primary, secondary and tertiary institutions you attended, most recent first. Upload the certificates in Documents."
    >
      {education.fields.map((entry, index) => (
        <fieldset key={entry.id} className="rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-primary">
            Institution {index + 1}
          </legend>
          <div className="space-y-4">
            <TextField form={form} name={`education.${index}.institution`} label="Institution" />
            <TextField
              form={form}
              name={`education.${index}.certificate`}
              label="Certificate obtained"
              hint="e.g. FSLC, WASSCE, OND, B.Sc."
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                form={form}
                name={`education.${index}.from`}
                label="From (year, optional)"
                inputMode="numeric"
              />
              <TextField
                form={form}
                name={`education.${index}.to`}
                label="To (year, optional)"
                inputMode="numeric"
              />
            </div>
            <TextField
              form={form}
              name={`education.${index}.address`}
              label="Address (optional)"
              hint="Town and state is enough."
            />
            {education.fields.length > 1 && (
              <button
                type="button"
                onClick={() => education.remove(index)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger hover:underline"
              >
                <Trash2 className="size-4" aria-hidden />
                Remove institution {index + 1}
              </button>
            )}
          </div>
        </fieldset>
      ))}
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      {education.fields.length < MAX_EDUCATION_ENTRIES && (
        <button
          type="button"
          onClick={() => education.append(EMPTY_EDUCATION)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Add another institution
        </button>
      )}
    </StepSection>
  );
}

export default EducationStep;
