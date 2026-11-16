"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { LEVEL_LABELS, PROGRAMME_LEVELS } from "@/lib/programmes";
import {
  PROGRAMME_STATUS_LABELS,
  PROGRAMME_STATUSES,
  programmeSchema,
  type ProgrammeValues,
} from "@/lib/validation/academics";
import type { FormState } from "@/lib/validation/auth";

/** Create or edit a programme. Only published programmes appear on the website. */
function ProgrammeForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: ProgrammeValues;
  submitLabel: string;
}) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<ProgrammeValues>({
    resolver: zodResolver(programmeSchema),
    action,
    defaultValues,
  });
  const { errors } = form.formState;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}

      <Field id="title" label="Title" error={errors.title?.message}>
        <TextInput
          id="title"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy("title", { error: errors.title })}
          {...form.register("title")}
        />
      </Field>

      <Field
        id="slug"
        label="Web address"
        hint="The end of the programme's page address, like certificate-in-theology. Leave empty to make it from the title. Changing it breaks links people have shared."
        error={errors.slug?.message}
      >
        <TextInput
          id="slug"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.slug)}
          aria-describedby={describedBy("slug", { hint: true, error: errors.slug })}
          {...form.register("slug")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="level" label="Level" error={errors.level?.message}>
          <Select
            id="level"
            aria-invalid={Boolean(errors.level)}
            aria-describedby={describedBy("level", { error: errors.level })}
            {...form.register("level")}
          >
            {PROGRAMME_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level].singular}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          id="status"
          label="Status"
          hint="Published shows on the website and the application form."
          error={errors.status?.message}
        >
          <Select
            id="status"
            aria-invalid={Boolean(errors.status)}
            aria-describedby={describedBy("status", { hint: true, error: errors.status })}
            {...form.register("status")}
          >
            {PROGRAMME_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROGRAMME_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          id="duration"
          label="Duration"
          hint='For example "1 year (2 semesters)".'
          error={errors.duration?.message}
        >
          <TextInput
            id="duration"
            aria-invalid={Boolean(errors.duration)}
            aria-describedby={describedBy("duration", { hint: true, error: errors.duration })}
            {...form.register("duration")}
          />
        </Field>

        <Field
          id="position"
          label="Order"
          hint="Lower numbers come first within a level."
          error={errors.position?.message}
        >
          <TextInput
            id="position"
            inputMode="numeric"
            aria-invalid={Boolean(errors.position)}
            aria-describedby={describedBy("position", { hint: true, error: errors.position })}
            {...form.register("position")}
          />
        </Field>
      </div>

      <Field
        id="description"
        label="Description"
        hint="Shown on the programme's page. Leave a blank line between paragraphs."
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          rows={6}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy("description", { hint: true, error: errors.description })}
          {...form.register("description")}
        />
      </Field>

      <Field
        id="requirements"
        label="Entry requirements"
        hint="Leave a blank line between paragraphs."
        error={errors.requirements?.message}
      >
        <Textarea
          id="requirements"
          rows={4}
          aria-invalid={Boolean(errors.requirements)}
          aria-describedby={describedBy("requirements", {
            hint: true,
            error: errors.requirements,
          })}
          {...form.register("requirements")}
        />
      </Field>

      <SubmitButton pending={pending} className="sm:w-auto">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export default ProgrammeForm;
