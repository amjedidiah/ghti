"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import { useActionForm } from "@/components/forms/useActionForm";
import type { FormState } from "@/lib/validation/auth";
import { returnGradesSchema, type ReturnGradesValues } from "@/lib/validation/grades";

/** Send submitted grades back to the lecturer as drafts, with a note they get by email. */
function ReturnGradesForm({
  action,
  hasLecturer,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  hasLecturer: boolean;
}) {
  const { form, state, pending, formAction, onSubmit } = useActionForm({
    resolver: zodResolver(returnGradesSchema),
    action,
    defaultValues: { note: "" } satisfies ReturnGradesValues,
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (state.status === "success") form.reset({ note: "" });
  }, [state, form]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <Field
        id="return-note"
        label="What should the lecturer look at?"
        hint={
          hasLecturer
            ? "The submitted grades go back to them as drafts, and they get this note by email."
            : "No lecturer is assigned, so the grades only go back to draft."
        }
        error={errors.note?.message}
      >
        <Textarea
          id="return-note"
          rows={3}
          maxLength={1000}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={describedBy("return-note", { hint: true, error: errors.note })}
          {...form.register("note")}
        />
      </Field>
      <SubmitButton pending={pending} className="sm:w-auto">
        Return to the lecturer
      </SubmitButton>
    </form>
  );
}

export default ReturnGradesForm;
