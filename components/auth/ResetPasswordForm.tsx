"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import PasswordInput from "@/components/forms/PasswordInput";
import SubmitButton from "@/components/forms/SubmitButton";
import { useActionForm } from "@/components/forms/useActionForm";
import { updatePassword } from "@/lib/auth/actions";
import {
  MIN_PASSWORD_LENGTH,
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/lib/validation/auth";

/** Set a new password. Used after a reset link and after a staff invitation. */
function ResetPasswordForm() {
  const { form, state, pending, formAction, onSubmit } = useActionForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    action: updatePassword,
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message && (
        <FormMessage status="error" message={state.message} />
      )}
      <Field
        id="password"
        label="New password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        error={errors.password?.message}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={describedBy("password", { hint: true, error: errors.password })}
          {...form.register("password")}
        />
      </Field>
      <Field id="confirmPassword" label="Type it again" error={errors.confirmPassword?.message}>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={describedBy("confirmPassword", { error: errors.confirmPassword })}
          {...form.register("confirmPassword")}
        />
      </Field>
      <SubmitButton pending={pending}>Save password</SubmitButton>
    </form>
  );
}

export default ResetPasswordForm;
