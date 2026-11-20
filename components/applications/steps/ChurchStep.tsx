import {
  ChoiceField,
  Pair,
  TextAreaField,
  TextField,
  type ApplicationForm,
} from "@/components/applications/fields";
import StepSection, { TELL_THEM } from "@/components/applications/steps/StepSection";

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

/** Step 5: faith, church and pastor. */
function ChurchStep({ form }: { form: ApplicationForm }) {
  return (
    <StepSection step={5}>
      <ChoiceField form={form} name="bornAgain" legend="Are you born again?" options={YES_NO} />
      <TextField
        form={form}
        name="bornAgainWhen"
        label="If so, when were you born again? (optional)"
        hint="A year is enough, e.g. 2015."
      />
      <TextField form={form} name="church" label="Name and location of your present church" />
      <TextField
        form={form}
        name="churchMembership"
        label="How long have you been a member of this church? (optional)"
        hint="e.g. 6 years."
      />
      <TextAreaField
        form={form}
        name="churchDuties"
        label="What are your duties in the church? (optional)"
      />

      <div className="border-t border-border pt-5">
        <h3 className="font-semibold text-primary">Your pastor</h3>
        <p className="mt-1 text-sm text-secondary">{TELL_THEM}</p>
      </div>
      <Pair>
        <TextField form={form} name="pastorName" label="Pastor's name" />
        <TextField form={form} name="pastorPhone" label="Pastor's phone number" type="tel" />
      </Pair>
    </StepSection>
  );
}

export default ChurchStep;
