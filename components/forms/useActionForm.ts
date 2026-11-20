"use client";

import { startTransition, useActionState, useEffect } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
} from "react-hook-form";

import { initialFormState, type FormState } from "@/lib/validation/auth";

/**
 * React Hook Form + a Server Action via `useActionState`.
 *
 * - Validates in the browser first (same Zod schema as the server), then
 *   submits the form's FormData to the action.
 * - Without JavaScript the form still posts to the action natively.
 * - Field errors returned by the server are shown on the matching fields.
 * - Schemas may transform what is typed (e.g. a link into an ID): `TOutput` is
 *   what the schema returns; the action still parses the raw FormData itself.
 */
export function useActionForm<TValues extends FieldValues, TOutput extends FieldValues = TValues>({
  resolver,
  action,
  defaultValues,
}: {
  resolver: Resolver<TValues, unknown, TOutput>;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues: DefaultValues<TValues>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const form = useForm<TValues, unknown, TOutput>({ resolver, defaultValues, mode: "onTouched" });

  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      const message = messages?.[0];
      if (message) form.setError(name as Path<TValues>, { type: "server", message });
    }
  }, [state, form]);

  const onSubmit = form.handleSubmit((_values, event) => {
    const formElement = event?.target;
    if (!(formElement instanceof HTMLFormElement)) return;
    const formData = new FormData(formElement);
    startTransition(() => formAction(formData));
  });

  return { form, state, pending, formAction, onSubmit };
}
