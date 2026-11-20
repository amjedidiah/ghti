import {
  Pair,
  TextAreaField,
  TextField,
  type ApplicationForm,
} from "@/components/applications/fields";
import StepSection, { TELL_THEM } from "@/components/applications/steps/StepSection";

/** Step 3: the applicant's addresses and their next of kin. */
function AddressesStep({ form }: { form: ApplicationForm }) {
  return (
    <StepSection step={3}>
      <TextAreaField
        form={form}
        name="address"
        label="Current postal address"
        hint="Where letters reach you now, e.g. a P.O. Box or street address."
        autoComplete="street-address"
      />
      <TextAreaField form={form} name="permanentAddress" label="Permanent home address" />

      <div className="border-t border-border pt-5">
        <h3 className="font-semibold text-primary">Next of kin</h3>
        <p className="mt-1 text-sm text-secondary">{TELL_THEM}</p>
      </div>
      <Pair>
        <TextField form={form} name="nextOfKinName" label="Full name" />
        <TextField
          form={form}
          name="nextOfKinRelationship"
          label="Relationship to you"
          hint="e.g. Mother, Husband, Brother."
        />
      </Pair>
      <Pair>
        <TextField form={form} name="nextOfKinPhone" label="Phone number" type="tel" />
        <TextField form={form} name="nextOfKinEmail" label="Email (optional)" type="email" />
      </Pair>
      <TextField form={form} name="nextOfKinOccupation" label="Occupation (optional)" />
      <TextAreaField form={form} name="nextOfKinAddress" label="Contact address (optional)" />
    </StepSection>
  );
}

export default AddressesStep;
