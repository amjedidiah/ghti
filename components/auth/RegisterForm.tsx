"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import PasswordInput from "@/components/forms/PasswordInput";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { register as registerAction } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH, registerSchema, type RegisterValues } from "@/lib/validation/auth";

/** Applicant registration: full name, email, password. Staff never register here. */
function RegisterForm() {
  const { form, state, pending, formAction, onSubmit } = useActionForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    action: registerAction,
    defaultValues: { fullName: "", email: "", password: "" },
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

      <Field
        id="fullName"
        label="Full name"
        hint="As it appears on your certificates."
        error={errors.fullName?.message}
      >
        <TextInput
          id="fullName"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={describedBy("fullName", { hint: true, error: errors.fullName })}
          {...form.register("fullName")}
        />
      </Field>

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

      <Field
        id="password"
        label="Password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. A short phrase is easy to remember.`}
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

      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}

export default RegisterForm;
