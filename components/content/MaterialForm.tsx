"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import type { FormState } from "@/lib/validation/auth";
import { materialSchema, type MaterialValues } from "@/lib/validation/content";

const EMPTY: MaterialValues = { title: "", driveLink: "", lessonId: "" };

/** Add or edit a material: a title, one Google Drive file, and optionally its lesson. */
function MaterialForm({
  action,
  lessons,
  initial,
  submitLabel,
  onSaved,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  lessons: { id: string; title: string }[];
  initial?: MaterialValues;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const uid = useId();
  const ids = { title: `${uid}-title`, driveLink: `${uid}-link`, lessonId: `${uid}-lesson` };
  const { form, state, pending, formAction, onSubmit } = useActionForm({
    resolver: zodResolver(materialSchema),
    action,
    defaultValues: initial ?? EMPTY,
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (state.status !== "success") return;
    if (!initial) form.reset(EMPTY);
    onSaved?.();
  }, [state, form, initial, onSaved]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <Field id={ids.title} label="Title" error={errors.title?.message}>
        <TextInput
          id={ids.title}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy(ids.title, { error: errors.title })}
          {...form.register("title")}
        />
      </Field>
      <Field
        id={ids.driveLink}
        label="Google Drive link"
        hint="Share the file with “Anyone with the link” as Viewer, then Copy link."
        error={errors.driveLink?.message}
      >
        <TextInput
          id={ids.driveLink}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://drive.google.com/file/d/…"
          aria-invalid={Boolean(errors.driveLink)}
          aria-describedby={describedBy(ids.driveLink, { hint: true, error: errors.driveLink })}
          {...form.register("driveLink")}
        />
      </Field>
      {lessons.length > 0 && (
        <Field id={ids.lessonId} label="Lesson (optional)" error={errors.lessonId?.message}>
          <Select id={ids.lessonId} {...form.register("lessonId")}>
            <option value="">For the whole course</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <SubmitButton pending={pending} className="sm:w-auto">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export default MaterialForm;
