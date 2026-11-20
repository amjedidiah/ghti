"use client";

import Link from "next/link";
import { useActionState } from "react";

import Field from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import { initialFormState, type FormState } from "@/lib/validation/auth";

/** Choose who teaches one offering (or nobody). */
function AssignLecturerForm({
  action,
  lecturers,
  current,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  lecturers: { id: string; name: string }[];
  current: string | null;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const error = state.fieldErrors?.lecturerId?.[0];

  if (lecturers.length === 0 && !current) {
    return (
      <p className="text-sm text-secondary">
        No lecturers yet.{" "}
        <Link href="/admin/users" className="font-semibold text-accent-strong hover:underline">
          Invite one
        </Link>{" "}
        from the Staff page.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <Field
        id="lecturerId"
        label="Lecturer"
        hint="They see this class, share lessons and materials, and enter scores for approval."
        error={error}
      >
        <Select
          id="lecturerId"
          name="lecturerId"
          defaultValue={current ?? ""}
          aria-invalid={Boolean(error)}
        >
          <option value="">No lecturer</option>
          {lecturers.map((lecturer) => (
            <option key={lecturer.id} value={lecturer.id}>
              {lecturer.name}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton className="sm:w-auto">Save</SubmitButton>
    </form>
  );
}

export default AssignLecturerForm;
