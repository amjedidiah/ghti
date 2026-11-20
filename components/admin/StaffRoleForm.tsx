"use client";

import { useActionState } from "react";

import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import { initialFormState, type FormState } from "@/lib/validation/auth";
import { STAFF_ROLE_LABELS, type StaffRole } from "@/lib/validation/staff";

/** Change one staff member's role, or remove their staff access. */
function StaffRoleForm({
  current,
  who,
  action,
}: {
  current: StaffRole;
  who: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const other: StaffRole = current === "admin" ? "lecturer" : "admin";

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`role-${who}`} className="sr-only">
          New role for {who}
        </label>
        <Select id={`role-${who}`} name="role" defaultValue={other} className="py-2 text-sm">
          <option value={other}>Make {STAFF_ROLE_LABELS[other].toLowerCase()}</option>
          <option value="applicant">Remove staff access</option>
        </Select>
        <SubmitButton className="w-auto px-4 py-2 text-sm">Change</SubmitButton>
      </div>
      {state.message && state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error" ? "text-sm text-danger" : "text-sm text-success"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export default StaffRoleForm;
