"use client";

import { ArrowDown, ArrowUp, LoaderCircle, Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { moveContent } from "@/lib/content/actions";

type Result = { ok: true } | { ok: false; message: string };

/**
 * Move up/down, edit and a two-step delete (no browser dialog) for one lesson
 * or material in the content editor.
 */
function ItemControls({
  table,
  itemId,
  label,
  isFirst,
  isLast,
  editing,
  onEdit,
  onDelete,
}: {
  table: "lessons" | "materials";
  itemId: string;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => Promise<Result>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<Result>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.message);
      setConfirming(false);
    });
  }

  const button =
    "inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-primary hover:bg-muted disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={button}
        disabled={isFirst || pending}
        onClick={() => run(() => moveContent(table, itemId, "up"))}
        aria-label={`Move ${label} up`}
      >
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={button}
        disabled={isLast || pending}
        onClick={() => run(() => moveContent(table, itemId, "down"))}
        aria-label={`Move ${label} down`}
      >
        <ArrowDown className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={button}
        onClick={onEdit}
        aria-expanded={editing}
        aria-label={`${editing ? "Close editing" : "Edit"} ${label}`}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      {confirming ? (
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(onDelete)}
            className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-2 text-sm font-semibold text-on-brand hover:opacity-90 disabled:cursor-wait"
          >
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Delete
            <span className="sr-only">{label}</span>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
          >
            Keep
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          Delete
          <span className="sr-only">{label}</span>
        </button>
      )}
      {pending && !confirming && (
        <LoaderCircle className="size-4 animate-spin text-secondary" aria-label="Saving" />
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default ItemControls;
