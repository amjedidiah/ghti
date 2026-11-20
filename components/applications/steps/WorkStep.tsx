import { TextAreaField, TextField, type ApplicationForm } from "@/components/applications/fields";
import StepSection from "@/components/applications/steps/StepSection";

/** Step 4: present work (all optional). */
function WorkStep({ form }: { form: ApplicationForm }) {
  return (
    <StepSection step={4} description="All optional. Leave blank if it does not apply to you.">
      <TextField
        form={form}
        name="occupation"
        label="Present occupation"
        hint="e.g. Teacher, Trader, Civil servant, Student."
        autoComplete="organization-title"
      />
      <TextAreaField
        form={form}
        name="employer"
        label="Employer's name, postal address, email and phone number"
      />
      <TextAreaField form={form} name="natureOfWork" label="Nature of work" />
    </StepSection>
  );
}

export default WorkStep;
