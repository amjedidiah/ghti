import FormMessage from "@/components/forms/FormMessage";
import { SelectField, type ApplicationForm } from "@/components/applications/fields";
import StepSection from "@/components/applications/steps/StepSection";
import { LEVEL_LABELS, PROGRAMME_LEVELS, type ProgrammeLevel } from "@/lib/programmes";

export type ProgrammeOption = { id: string; title: string; level: ProgrammeLevel };

/** Step 1: the programme and the intake. */
function ProgrammeStep({
  form,
  programmes,
  intakes,
}: {
  form: ApplicationForm;
  programmes: ProgrammeOption[];
  intakes: { id: string; label: string }[];
}) {
  const byLevel = PROGRAMME_LEVELS.map((level) => ({
    level,
    items: programmes.filter((programme) => programme.level === level),
  })).filter((group) => group.items.length > 0);

  return (
    <StepSection step={1}>
      <SelectField form={form} name="programmeId" label="Programme applied for">
        <option value="">Choose a programme</option>
        {byLevel.map(({ level, items }) => (
          <optgroup key={level} label={LEVEL_LABELS[level].plural}>
            {items.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.title}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>

      {intakes.length > 0 ? (
        <SelectField
          form={form}
          name="intakeTermId"
          label="Intake"
          hint="When you would like to start."
        >
          <option value="">Choose an intake</option>
          {intakes.map((intake) => (
            <option key={intake.id} value={intake.id}>
              {intake.label}
            </option>
          ))}
        </SelectField>
      ) : (
        <FormMessage
          status="error"
          message="Applications are not open right now. You can fill in and save your answers, and submit when the next intake opens."
        />
      )}
    </StepSection>
  );
}

export default ProgrammeStep;
