"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { termSchema, type TermValues } from "@/lib/validation/academics";
import type { FormState } from "@/lib/validation/auth";

/** Create or edit a term (semester). A term open for applications is an intake on the application form. */
function TermForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: TermValues;
  submitLabel: string;
}) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<TermValues>({
    resolver: zodResolver(termSchema),
    action,
    defaultValues,
  });
  const { errors } = form.formState;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="session"
          label="Session"
          hint='Two years, like "2026/2027".'
          error={errors.session?.message}
        >
          <TextInput
            id="session"
            inputMode="numeric"
            placeholder="2026/2027"
            aria-invalid={Boolean(errors.session)}
            aria-describedby={describedBy("session", { hint: true, error: errors.session })}
            {...form.register("session")}
          />
        </Field>
        <Field id="name" label="Name" hint='Like "First semester".' error={errors.name?.message}>
          <TextInput
            id="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy("name", { hint: true, error: errors.name })}
            {...form.register("name")}
          />
        </Field>
        <Field id="startsOn" label="Starts on (optional)" error={errors.startsOn?.message}>
          <TextInput
            id="startsOn"
            type="date"
            aria-invalid={Boolean(errors.startsOn)}
            aria-describedby={describedBy("startsOn", { error: errors.startsOn })}
            {...form.register("startsOn")}
          />
        </Field>
        <Field id="endsOn" label="Ends on (optional)" error={errors.endsOn?.message}>
          <TextInput
            id="endsOn"
            type="date"
            aria-invalid={Boolean(errors.endsOn)}
            aria-describedby={describedBy("endsOn", { error: errors.endsOn })}
            {...form.register("endsOn")}
          />
        </Field>
      </div>

      <Field
        id="acceptingApplications"
        label="Open for applications?"
        hint="When yes, applicants can choose this term as their intake."
        error={errors.acceptingApplications?.message}
      >
        <div className="sm:max-w-xs">
          <Select
            id="acceptingApplications"
            aria-invalid={Boolean(errors.acceptingApplications)}
            aria-describedby={describedBy("acceptingApplications", {
              hint: true,
              error: errors.acceptingApplications,
            })}
            {...form.register("acceptingApplications")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </div>
      </Field>

      <SubmitButton pending={pending} className="sm:w-auto">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export default TermForm;
