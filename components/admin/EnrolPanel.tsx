"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import type { FormState } from "@/lib/validation/auth";
import { enrolmentSchema, type EnrolmentValues } from "@/lib/validation/enrolment";

/**
 * Enrol an admitted applicant: matric number and entry term. The account
 * becomes a student account and signs in to the student portal from then on.
 */
function EnrolPanel({
  action,
  terms,
  intakeTermId,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  terms: { id: string; label: string }[];
  intakeTermId: string | null;
}) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<EnrolmentValues>({
    resolver: zodResolver(enrolmentSchema),
    action,
    defaultValues: { matricNo: "", entryTermId: intakeTermId ?? "" },
  });
  const { errors } = form.formState;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      <p className="text-sm text-secondary">
        Enrolling creates the student record and turns this account into a student account. The
        applicant signs in to the student portal from then on.
      </p>

      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}

      <Field
        id="matricNo"
        label="Matric number"
        hint="Like GHTI/2026/CERT/001. Upper case is applied for you."
        error={errors.matricNo?.message}
      >
        <TextInput
          id="matricNo"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.matricNo)}
          aria-describedby={describedBy("matricNo", { hint: true, error: errors.matricNo })}
          {...form.register("matricNo")}
        />
      </Field>

      <Field
        id="entryTermId"
        label="Entry term"
        hint="The term the student starts in. Defaults to the intake they applied for."
        error={errors.entryTermId?.message}
      >
        <Select
          id="entryTermId"
          aria-invalid={Boolean(errors.entryTermId)}
          aria-describedby={describedBy("entryTermId", { hint: true, error: errors.entryTermId })}
          {...form.register("entryTermId")}
        >
          <option value="">Choose a term</option>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.label}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pending={pending}>Enrol as student</SubmitButton>
    </form>
  );
}

export default EnrolPanel;
