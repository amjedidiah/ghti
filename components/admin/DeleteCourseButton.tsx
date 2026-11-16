"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import FormMessage from "@/components/forms/FormMessage";
import { deleteCourse } from "@/lib/admin/academics";

/** Two-step delete (no browser dialog). The database refuses courses that have been offered. */
function DeleteCourseButton({ courseId, code }: { courseId: string; code: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCourse(courseId);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <FormMessage status="error" message={error} />}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-primary">Delete {code} for good?</p>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-danger px-4 py-2.5 text-sm font-semibold text-on-brand hover:opacity-90 disabled:cursor-wait disabled:opacity-80"
          >
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Yes, delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted"
          >
            Keep it
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-md border border-danger/40 bg-card px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete course
        </button>
      )}
    </div>
  );
}

export default DeleteCourseButton;
