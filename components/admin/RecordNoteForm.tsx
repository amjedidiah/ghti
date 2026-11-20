"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import { useActionForm } from "@/components/forms/useActionForm";
import type { FormState } from "@/lib/validation/auth";
import { recordNoteSchema, type RecordNoteValues } from "@/lib/validation/students";

/** Add a dated note to a student's file. Notes cannot be edited afterwards. */
function RecordNoteForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<RecordNoteValues>({
    resolver: zodResolver(recordNoteSchema),
    action,
    defaultValues: { body: "" },
  });
  const { errors } = form.formState;

  // Clear the box once the note is saved.
  useEffect(() => {
    if (state.status === "success") form.reset({ body: "" });
  }, [state, form]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <Field
        id="body"
        label="New note"
        hint="Dated and signed with your name. Notes cannot be edited or deleted, so write a new note to correct one."
        error={errors.body?.message}
      >
        <Textarea
          id="body"
          rows={3}
          maxLength={2000}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={describedBy("body", { hint: true, error: errors.body })}
          {...form.register("body")}
        />
      </Field>
      <SubmitButton pending={pending} className="sm:w-auto">
        Add note
      </SubmitButton>
    </form>
  );
}

export default RecordNoteForm;
