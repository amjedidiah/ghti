"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import { useActionForm } from "@/components/forms/useActionForm";
import type { FormState } from "@/lib/validation/auth";
import { changeRequestSchema, type ChangeRequestValues } from "@/lib/validation/students";

/** A student asks the registrar to correct something on their record. */
function ChangeRequestForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<ChangeRequestValues>({
    resolver: zodResolver(changeRequestSchema),
    action,
    defaultValues: { body: "" },
  });
  const { errors } = form.formState;

  // Clear the box once the request is sent.
  useEffect(() => {
    if (state.status === "success") form.reset({ body: "" });
  }, [state, form]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <Field
        id="change-request"
        label="What should be corrected?"
        hint="Say what is wrong and what it should be, e.g. “My date of birth is 14 March 1995, not 1996.” The registrar may ask you for a document."
        error={errors.body?.message}
      >
        <Textarea
          id="change-request"
          rows={3}
          maxLength={1000}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={describedBy("change-request", { hint: true, error: errors.body })}
          {...form.register("body")}
        />
      </Field>
      <SubmitButton pending={pending} className="sm:w-auto">
        Send request
      </SubmitButton>
    </form>
  );
}

export default ChangeRequestForm;
