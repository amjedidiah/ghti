"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { inviteStaff } from "@/lib/admin/users";
import {
  inviteStaffSchema,
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  type InviteStaffValues,
} from "@/lib/validation/staff";

const EMPTY: InviteStaffValues = { fullName: "", email: "", role: "lecturer" };

/** Invite a lecturer or admin by email. */
function InviteStaffForm() {
  const { form, state, pending, formAction, onSubmit } = useActionForm<InviteStaffValues>({
    resolver: zodResolver(inviteStaffSchema),
    action: inviteStaff,
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
      <Field id="fullName" label="Full name" error={errors.fullName?.message}>
        <TextInput
          id="fullName"
          autoComplete="off"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={describedBy("fullName", { error: errors.fullName })}
          {...form.register("fullName")}
        />
      </Field>
      <Field
        id="email"
        label="Email address"
        hint="Their own address: an applicant's or student's email cannot become a staff account."
        error={errors.email?.message}
      >
        <TextInput
          id="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email", { hint: true, error: errors.email })}
          {...form.register("email")}
        />
      </Field>
      <Field
        id="role"
        label="Role"
        hint="Admins can do everything, including inviting staff. Lecturers will teach their assigned courses."
        error={errors.role?.message}
      >
        <Select
          id="role"
          aria-invalid={Boolean(errors.role)}
          aria-describedby={describedBy("role", { hint: true, error: errors.role })}
          {...form.register("role")}
        >
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {STAFF_ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton pending={pending} className="sm:w-auto">
        Send invitation
      </SubmitButton>
    </form>
  );
}

export default InviteStaffForm;
