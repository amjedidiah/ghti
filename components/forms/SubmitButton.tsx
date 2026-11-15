"use client";

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Primary submit button. Shows a spinner while the form is submitting:
 * `useFormStatus` covers native submits; pass `pending` when the form submits
 * through `startTransition` (React Hook Form).
 */
function SubmitButton({
  children,
  pending,
  className,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  pending?: boolean;
  className?: string;
  /** "button" with onClick for forms that submit programmatically. */
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy}
      aria-disabled={busy}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-base font-semibold text-on-brand transition-colors hover:bg-brand-deep disabled:cursor-wait disabled:opacity-80",
        className,
      )}
    >
      {busy && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export default SubmitButton;
