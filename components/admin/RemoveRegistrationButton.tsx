"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { removeRegistration } from "@/lib/admin/registrations";

/** Two-step remove for one registration (no browser dialog). */
function RemoveRegistrationButton({
  registrationId,
  who,
}: {
  registrationId: string;
  who: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeRegistration(registrationId);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  if (error) {
    return (
      <p role="alert" className="max-w-xs text-sm text-danger">
        {error}
      </p>
    );
  }

  return confirming ? (
    <span className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label={`Confirm: remove ${who}`}
        className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-2 text-sm font-semibold text-on-brand hover:opacity-90 disabled:cursor-wait disabled:opacity-80"
      >
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        Remove
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
      >
        Keep
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Remove ${who} from this course`}
      className="rounded-md px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-soft"
    >
      Remove
    </button>
  );
}

export default RemoveRegistrationButton;
