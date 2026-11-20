"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import { useActionForm } from "@/components/forms/useActionForm";
import type { FormState } from "@/lib/validation/auth";
import {
  resolveChangeRequestSchema,
  type ResolveChangeRequestValues,
} from "@/lib/validation/students";

/** Resolve one change request with a note (the student sees it; it goes on the file). */
function ResolveChangeRequestForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const id = useId();
  const { form, state, pending, formAction, onSubmit } = useActionForm<ResolveChangeRequestValues>({
    resolver: zodResolver(resolveChangeRequestSchema),
    action,
    defaultValues: { note: "" },
  });
  const { errors } = form.formState;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-3">
      {state.message && state.status === "error" && (
        <FormMessage status="error" message={state.message} />
      )}
      <Field
        id={id}
        label="What was done?"
        hint="The student sees this note, and it goes on their file with the request."
        error={errors.note?.message}
      >
        <Textarea
          id={id}
          rows={2}
          maxLength={800}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={describedBy(id, { hint: true, error: errors.note })}
          {...form.register("note")}
        />
      </Field>
      <SubmitButton pending={pending} className="sm:w-auto">
        Resolve
      </SubmitButton>
    </form>
  );
}

export default ResolveChangeRequestForm;
