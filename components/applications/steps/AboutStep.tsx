import {
  ChoiceField,
  Pair,
  TextField,
  type ApplicationForm,
} from "@/components/applications/fields";
import StepSection from "@/components/applications/steps/StepSection";
import { MARITAL_STATUS_LABELS, MARITAL_STATUSES } from "@/lib/validation/application";

const SEXES = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
] as const;

const MARITAL = MARITAL_STATUSES.map((value) => ({ value, label: MARITAL_STATUS_LABELS[value] }));

/** Step 2: name, birth, sex, nationality, marital status and how to reach the applicant. */
function AboutStep({ form }: { form: ApplicationForm }) {
  return (
    <StepSection step={2} description="As they appear on your official documents.">
      <TextField
        form={form}
        name="title"
        label="Title (optional)"
        hint="e.g. Rev., Pastor, Mr, Mrs, Dr."
        autoComplete="honorific-prefix"
      />
      <Pair>
        <TextField form={form} name="surname" label="Surname" autoComplete="family-name" />
        <TextField form={form} name="firstName" label="First name" autoComplete="given-name" />
      </Pair>
      <TextField
        form={form}
        name="otherNames"
        label="Middle or other names (optional)"
        autoComplete="additional-name"
      />
      <Pair>
        <TextField
          form={form}
          name="dateOfBirth"
          label="Date of birth"
          type="date"
          autoComplete="bday"
        />
        <ChoiceField form={form} name="gender" legend="Sex" options={SEXES} />
      </Pair>
      <TextField form={form} name="nationality" label="Nationality" autoComplete="country-name" />
      <ChoiceField form={form} name="maritalStatus" legend="Marital status" options={MARITAL} />
      <Pair>
        <TextField
          form={form}
          name="phone"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          hint="Nigerian numbers can start with 0 or +234."
        />
        <TextField
          form={form}
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
        />
      </Pair>
    </StepSection>
  );
}

export default AboutStep;
