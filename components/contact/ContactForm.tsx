"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { sendContactForm } from "@/lib/contact/actions";
import { contactSchema, type ContactValues } from "@/lib/validation/contact";

const EMPTY: ContactValues = { name: "", email: "", phone: "", message: "", website: "" };

/** Message to the GHTI office; the sender gets a confirmation email. */
function ContactForm() {
  const { form, state, pending, formAction, onSubmit } = useActionForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    action: sendContactForm,
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (state.status === "success") form.reset(EMPTY);
  }, [state, form]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label="Your name" error={errors.name?.message}>
          <TextInput
            id="contact-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy("contact-name", { error: errors.name })}
            {...form.register("name")}
          />
        </Field>
        <Field id="contact-email" label="Email address" error={errors.email?.message}>
          <TextInput
            id="contact-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy("contact-email", { error: errors.email })}
            {...form.register("email")}
          />
        </Field>
      </div>

      <Field id="contact-phone" label="Phone number (optional)" error={errors.phone?.message}>
        <TextInput
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={describedBy("contact-phone", { error: errors.phone })}
          {...form.register("phone")}
        />
      </Field>

      <Field id="contact-message" label="Message" error={errors.message?.message}>
        <Textarea
          id="contact-message"
          rows={6}
          maxLength={3000}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy("contact-message", { error: errors.message })}
          {...form.register("message")}
        />
      </Field>

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Leave this empty</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...form.register("website")}
        />
      </div>

      <p className="text-sm text-secondary">
        We use your details only to reply to you. See our{" "}
        <Link href="/privacy" className="font-semibold text-accent-strong hover:underline">
          privacy notice
        </Link>
        .
      </p>

      <SubmitButton pending={pending} className="sm:w-auto">
        Send message
      </SubmitButton>
    </form>
  );
}

export default ContactForm;
