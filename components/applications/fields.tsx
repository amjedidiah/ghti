"use client";

import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { get, type Path, type UseFormReturn } from "react-hook-form";

import Field, { describedBy, errorId } from "@/components/forms/Field";
import Select from "@/components/forms/Select";
import Textarea from "@/components/forms/Textarea";
import TextInput from "@/components/forms/TextInput";
import type { ApplicationValues } from "@/lib/validation/application";

// Field helpers for the application form's steps: label, hint, control and
// error from React Hook Form, with ids derived from the field path.

export type ApplicationForm = UseFormReturn<ApplicationValues>;
type Name = Path<ApplicationValues>;

export const fieldId = (name: string) => `field-${name.replaceAll(".", "-")}`;

export function errorFor(form: ApplicationForm, name: Name): string | undefined {
  const error = get(form.formState.errors, name) as { message?: string } | undefined;
  return error?.message;
}

export function TextField({
  form,
  name,
  label,
  hint,
  type = "text",
  autoComplete,
  inputMode,
}: {
  form: ApplicationForm;
  name: Name;
  label: string;
  hint?: ReactNode;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
}) {
  const id = fieldId(name);
  const error = errorFor(form, name);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <TextInput
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, { hint, error })}
        {...form.register(name)}
      />
    </Field>
  );
}

export function TextAreaField({
  form,
  name,
  label,
  hint,
  autoComplete,
}: {
  form: ApplicationForm;
  name: Name;
  label: string;
  hint?: ReactNode;
  autoComplete?: string;
}) {
  const id = fieldId(name);
  const error = errorFor(form, name);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <Textarea
        id={id}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, { hint, error })}
        {...form.register(name)}
      />
    </Field>
  );
}

export function SelectField({
  form,
  name,
  label,
  hint,
  children,
}: {
  form: ApplicationForm;
  name: Name;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  const id = fieldId(name);
  const error = errorFor(form, name);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <Select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, { hint, error })}
        {...form.register(name)}
      >
        {children}
      </Select>
    </Field>
  );
}

/** One answer from a few, as radio buttons in a fieldset (sex, marital status, yes/no). */
export function ChoiceField({
  form,
  name,
  legend,
  options,
}: {
  form: ApplicationForm;
  name: Name;
  legend: string;
  options: readonly { value: string; label: string }[];
}) {
  const id = fieldId(name);
  const error = errorFor(form, name);
  return (
    <fieldset aria-describedby={error ? errorId(id) : undefined}>
      <legend className="block text-sm font-semibold text-primary">{legend}</legend>
      <div className="mt-1.5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        {options.map((option, index) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3.5 py-3 text-base text-primary has-checked:border-brand has-checked:bg-brand/5"
          >
            <input
              type="radio"
              value={option.value}
              // The first option takes focus when the step jumps to this answer.
              id={index === 0 ? id : undefined}
              className="size-4 accent-(--brand)"
              {...form.register(name)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId(id)} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** A box to tick (the pledge, consent). */
export function CheckField({
  form,
  name,
  children,
}: {
  form: ApplicationForm;
  name: Name;
  children: ReactNode;
}) {
  const id = fieldId(name);
  const error = errorFor(form, name);
  return (
    <div>
      <label
        htmlFor={id}
        className="flex cursor-pointer gap-3 text-sm leading-relaxed text-primary"
      >
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-(--brand)"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId(id) : undefined}
          {...form.register(name)}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={errorId(id)} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Lay two fields side by side from the small-tablet width up. */
export function Pair({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}
