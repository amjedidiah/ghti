"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { requestPasswordReset } from "@/lib/auth/actions";
import { emailOnlySchema, type EmailOnlyValues } from "@/lib/validation/auth";

function ForgotPasswordForm() {
  const { form, state, pending, formAction, onSubmit } = useActionForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    action: requestPasswordReset,
    defaultValues: { email: "" },
  });
  const { errors } = form.formState;

  if (state.status === "success" && state.message) {
    return <FormMessage status="success" message={state.message} />;
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message && (
        <FormMessage status="error" message={state.message} />
      )}
      <Field id="email" label="Email address" error={errors.email?.message}>
        <TextInput
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email", { error: errors.email })}
          {...form.register("email")}
        />
      </Field>
      <SubmitButton pending={pending}>Send reset link</SubmitButton>
    </form>
  );
}

export default ForgotPasswordForm;
