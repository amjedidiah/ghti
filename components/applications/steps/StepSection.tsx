import type { ReactNode } from "react";

import FormSection from "@/components/forms/FormSection";
import { APPLICATION_STEPS } from "@/lib/applications/steps";

/** People whose details the applicant gives us (NDPA 2023: tell them). */
export const TELL_THEM =
  "Let them know you have given us their details: we may contact them about your application.";

/** One step of the application, titled and numbered from APPLICATION_STEPS. */
function StepSection({
  step,
  description,
  children,
}: {
  step: number;
  description?: ReactNode;
  children: ReactNode;
}) {
  const { id, title } = APPLICATION_STEPS[step - 1];
  return (
    <FormSection id={id} step={step} title={title} description={description}>
      {children}
    </FormSection>
  );
}

export default StepSection;
