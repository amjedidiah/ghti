"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

/** A two-step delete (no browser dialog): "Delete", then "Delete" / "Keep". */
function ConfirmDeleteButton({
  label,
  action,
}: {
  /** What is being deleted, for screen readers, e.g. the item's title. */
  label: string;
  action: () => Promise<{ ok: true } | { ok: false; message: string }>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message);
      setConfirming(false);
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-2 text-sm font-semibold text-on-brand hover:opacity-90 disabled:cursor-wait"
          >
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Delete<span className="sr-only"> {label}</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
          >
            Keep
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          Delete<span className="sr-only"> {label}</span>
        </button>
      )}
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

export default ConfirmDeleteButton;
