"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import { useActionForm } from "@/components/forms/useActionForm";
import type { FormState } from "@/lib/validation/auth";
import {
  STUDENT_STATUS_LABELS,
  STUDENT_STATUSES,
  studentStatusSchema,
  type StudentStatus,
  type StudentStatusValues,
} from "@/lib/validation/students";

/** Change a student's status. The change and the reason are logged on the file. */
function StudentStatusForm({
  current,
  action,
}: {
  current: StudentStatus;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const { form, state, pending, formAction, onSubmit } = useActionForm<StudentStatusValues>({
    resolver: zodResolver(studentStatusSchema),
    action,
    defaultValues: { status: "" as StudentStatus, note: "" },
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (state.status === "success") form.reset({ status: "" as StudentStatus, note: "" });
  }, [state, form]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <Field id="status" label="New status" error={errors.status?.message}>
        <Select
          id="status"
          aria-invalid={Boolean(errors.status)}
          aria-describedby={describedBy("status", { error: errors.status })}
          {...form.register("status")}
        >
          <option value="">Choose a status</option>
          {STUDENT_STATUSES.filter((status) => status !== current).map((status) => (
            <option key={status} value={status}>
              {STUDENT_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        id="note"
        label="Reason (optional)"
        hint="Saved on the file with the change."
        error={errors.note?.message}
      >
        <Textarea
          id="note"
          rows={2}
          maxLength={1000}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={describedBy("note", { hint: true, error: errors.note })}
          {...form.register("note")}
        />
      </Field>
      <SubmitButton pending={pending} className="sm:w-auto">
        Change status
      </SubmitButton>
    </form>
  );
}

export default StudentStatusForm;
