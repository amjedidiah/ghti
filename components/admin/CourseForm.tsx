"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { courseSchema, type CourseValues } from "@/lib/validation/academics";
import type { FormState } from "@/lib/validation/auth";

const YEARS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SEMESTERS = ["1", "2", "3"] as const;

/** Add or edit a course. When adding, the form clears after each course so several can go in quickly. */
function CourseForm({
  action,
  defaultValues,
  submitLabel,
  clearOnSuccess = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: CourseValues;
  submitLabel: string;
  clearOnSuccess?: boolean;
}) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<CourseValues>({
    resolver: zodResolver(courseSchema),
    action,
    defaultValues,
  });
  const { errors } = form.formState;

  // Keep year and semester, so the next course of the same semester is quick to add.
  useEffect(() => {
    if (!clearOnSuccess || state.status !== "success") return;
    form.reset({
      ...defaultValues,
      year: form.getValues("year"),
      semester: form.getValues("semester"),
    });
    form.setFocus("code");
  }, [state, clearOnSuccess, defaultValues, form]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}

      <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
        <Field id="code" label="Code" hint='Like "BIB 101".' error={errors.code?.message}>
          <TextInput
            id="code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={describedBy("code", { hint: true, error: errors.code })}
            {...form.register("code")}
          />
        </Field>
        <Field id="title" label="Title" error={errors.title?.message}>
          <TextInput
            id="title"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={describedBy("title", { error: errors.title })}
            {...form.register("title")}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Field id="creditUnits" label="Credit units" error={errors.creditUnits?.message}>
          <TextInput
            id="creditUnits"
            inputMode="numeric"
            aria-invalid={Boolean(errors.creditUnits)}
            aria-describedby={describedBy("creditUnits", { error: errors.creditUnits })}
            {...form.register("creditUnits")}
          />
        </Field>
        <Field id="year" label="Year" error={errors.year?.message}>
          <Select
            id="year"
            aria-invalid={Boolean(errors.year)}
            aria-describedby={describedBy("year", { error: errors.year })}
            {...form.register("year")}
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="semester" label="Semester" error={errors.semester?.message}>
          <Select
            id="semester"
            aria-invalid={Boolean(errors.semester)}
            aria-describedby={describedBy("semester", { error: errors.semester })}
            {...form.register("semester")}
          >
            {SEMESTERS.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <SubmitButton pending={pending} className="sm:w-auto">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export default CourseForm;
