"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import PasswordInput from "@/components/forms/PasswordInput";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { sendSignInLink, signIn } from "@/lib/auth/actions";
import {
  emailOnlySchema,
  signInSchema,
  type EmailOnlyValues,
  type SignInValues,
} from "@/lib/validation/auth";

const LINK_ERRORS: Record<string, string> = {
  "link-expired":
    "That link has expired or was already used. Sign in below, or ask for a new link.",
  "link-other-browser":
    "We could not sign you in from that link. If you opened it in a different browser or app, your email is probably confirmed already: sign in below. Otherwise, ask for a new link.",
};

/** Sign in with a password, or switch to "email me a sign-in link". */
function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""];
  const [method, setMethod] = useState<"password" | "link">("password");

  return (
    <div className="space-y-6">
      {linkError && <FormMessage status="error" message={linkError} />}
      {method === "password" ? (
        <PasswordSignIn next={next} onUseLink={() => setMethod("link")} />
      ) : (
        <LinkSignIn onUsePassword={() => setMethod("password")} />
      )}
    </div>
  );
}

function PasswordSignIn({ next, onUseLink }: { next: string; onUseLink: () => void }) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    action: signIn,
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message && (
        <FormMessage status="error" message={state.message} />
      )}
      <input type="hidden" name="next" value={next} />

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

      <Field id="password" label="Password" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={describedBy("password", { error: errors.password })}
          {...form.register("password")}
        />
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-accent-strong hover:underline"
        >
          Forgot your password?
        </Link>
      </div>

      <SubmitButton pending={pending}>Sign in</SubmitButton>

      <button
        type="button"
        onClick={onUseLink}
        className="w-full rounded-md border border-border px-5 py-3 text-sm font-semibold text-primary hover:bg-muted"
      >
        Email me a sign-in link instead
      </button>
    </form>
  );
}

function LinkSignIn({ onUsePassword }: { onUsePassword: () => void }) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    action: sendSignInLink,
    defaultValues: { email: "" },
  });
  const { errors } = form.formState;

  if (state.status === "success" && state.message) {
    return (
      <div className="space-y-5">
        <FormMessage status="success" message={state.message} />
        <button
          type="button"
          onClick={onUsePassword}
          className="w-full rounded-md border border-border px-5 py-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          Back to password sign-in
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message && (
        <FormMessage status="error" message={state.message} />
      )}
      <Field
        id="link-email"
        label="Email address"
        hint="We will email you a link that signs you in. No password needed."
        error={errors.email?.message}
      >
        <TextInput
          id="link-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("link-email", { hint: true, error: errors.email })}
          {...form.register("email")}
        />
      </Field>

      <SubmitButton pending={pending}>Email me a link</SubmitButton>

      <button
        type="button"
        onClick={onUsePassword}
        className="w-full rounded-md border border-border px-5 py-3 text-sm font-semibold text-primary hover:bg-muted"
      >
        Use my password instead
      </button>
    </form>
  );
}

export default SignInForm;
