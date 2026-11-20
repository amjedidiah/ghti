import {
  errorFor,
  Pair,
  TextAreaField,
  TextField,
  type ApplicationForm,
} from "@/components/applications/fields";
import StepSection, { TELL_THEM } from "@/components/applications/steps/StepSection";
import { REFEREE_COUNT } from "@/lib/validation/application";

/** Step 7: two referees who can vouch for the applicant's Christian character. */
function RefereesStep({ form }: { form: ApplicationForm }) {
  const error = errorFor(form, "referees");
  return (
    <StepSection
      step={7}
      description={`Two people who can vouch for your Christian character. ${TELL_THEM}`}
    >
      {Array.from({ length: REFEREE_COUNT }, (_, index) => (
        <fieldset key={index} className="rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-primary">Referee {index + 1}</legend>
          <div className="space-y-4">
            <Pair>
              <TextField form={form} name={`referees.${index}.name`} label="Full name" />
              <TextField
                form={form}
                name={`referees.${index}.phone`}
                label="Phone number"
                type="tel"
              />
            </Pair>
            <Pair>
              <TextField
                form={form}
                name={`referees.${index}.email`}
                label="Email (optional)"
                type="email"
              />
              <TextField
                form={form}
                name={`referees.${index}.occupation`}
                label="Occupation (optional)"
              />
            </Pair>
            <TextAreaField
              form={form}
              name={`referees.${index}.address`}
              label="Complete postal address (optional)"
            />
          </div>
        </fieldset>
      ))}
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </StepSection>
  );
}

export default RefereesStep;
