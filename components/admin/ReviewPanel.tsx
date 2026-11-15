"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import Field from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import { decideApplication, startReview } from "@/lib/admin/actions";
import { decisionSchema } from "@/lib/validation/review";
import { cn } from "@/lib/utils";

type Decision = "admitted" | "rejected";

/** Start a review, then admit or reject with a note the applicant will see. */
function ReviewPanel({
  applicationId,
  status,
}: {
  applicationId: string;
  status: "submitted" | "under_review";
}) {
  const router = useRouter();
  const noteId = useId();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.message);
    });
  }

  function confirm() {
    setNoteError(undefined);
    const parsed = decisionSchema.safeParse({ decision, note });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.path[0] === "note") setNoteError(issue.message);
      else setError(issue?.message ?? "Choose admit or not admit.");
      return;
    }
    run(() => decideApplication(applicationId, parsed.data));
  }

  return (
    <div className="space-y-5">
      {error && <FormMessage status="error" message={error} />}

      {status === "submitted" && (
        <div className="rounded-md border border-border bg-muted p-4 text-sm text-secondary">
          <p>
            Mark it as under review so the applicant knows it is being looked at. You can also
            decide straight away.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => startReview(applicationId))}
            className="mt-3 inline-flex items-center justify-center rounded-md border border-brand bg-card px-4 py-2.5 text-sm font-semibold text-brand hover:bg-muted disabled:opacity-60"
          >
            Mark as under review
          </button>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-semibold text-primary">Decision</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(
            [
              ["admitted", "Admit"],
              ["rejected", "Do not admit"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3.5 py-3 text-base font-medium",
                decision === value
                  ? value === "admitted"
                    ? "border-success bg-success-soft text-success"
                    : "border-danger bg-danger-soft text-danger"
                  : "border-border bg-card text-primary",
              )}
            >
              <input
                type="radio"
                name="decision"
                value={value}
                checked={decision === value}
                onChange={() => setDecision(value)}
                className="size-4 accent-(--brand)"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        id={noteId}
        label={
          decision === "rejected"
            ? "Note to the applicant (required)"
            : "Note to the applicant (optional)"
        }
        hint="The applicant sees this on their status page. Keep it kind and clear."
        error={noteError}
      >
        <Textarea
          id={noteId}
          rows={4}
          value={note}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          aria-invalid={Boolean(noteError)}
        />
      </Field>

      <SubmitButton type="button" onClick={confirm} pending={pending}>
        {decision === "rejected"
          ? "Confirm: do not admit"
          : decision === "admitted"
            ? "Confirm: admit"
            : "Confirm decision"}
      </SubmitButton>
      <p className="text-xs text-secondary">
        A decision is final here. Matric numbers are assigned when admitted applicants become
        students (coming next stage).
      </p>
    </div>
  );
}

export default ReviewPanel;
