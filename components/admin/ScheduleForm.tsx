"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import type { FormState } from "@/lib/validation/auth";
import { scheduleSchema, type ScheduleValues } from "@/lib/validation/content";

/** Add a lecture schedule (a Google Drive file) to a programme for a term. */
function ScheduleForm({
  action,
  terms,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  terms: { id: string; label: string }[];
}) {
  const empty: ScheduleValues = { title: "", termId: terms[0]?.id ?? "", driveLink: "" };
  const { form, state, pending, formAction, onSubmit } = useActionForm({
    resolver: zodResolver(scheduleSchema),
    action,
    defaultValues: empty,
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (state.status === "success") form.reset();
  }, [state, form]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <Field id="schedule-title" label="Title" error={errors.title?.message}>
        <TextInput
          id="schedule-title"
          placeholder="e.g. Lecture timetable"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy("schedule-title", { error: errors.title })}
          {...form.register("title")}
        />
      </Field>
      <Field id="schedule-term" label="Term" error={errors.termId?.message}>
        <Select id="schedule-term" {...form.register("termId")}>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        id="schedule-link"
        label="Google Drive link"
        hint="Share the file with “Anyone with the link” as Viewer. It is public once the programme is."
        error={errors.driveLink?.message}
      >
        <TextInput
          id="schedule-link"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.driveLink)}
          aria-describedby={describedBy("schedule-link", { hint: true, error: errors.driveLink })}
          {...form.register("driveLink")}
        />
      </Field>
      <SubmitButton pending={pending} className="sm:w-auto">
        Add schedule
      </SubmitButton>
    </form>
  );
}

export default ScheduleForm;
