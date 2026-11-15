import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Shared input styling: 16px text so phones do not zoom in on focus. */
export const inputClassName =
  "block w-full rounded-md border border-border bg-card px-3.5 py-3 text-base text-primary shadow-xs placeholder:text-secondary/70 focus:border-brand focus:outline-2 focus:outline-offset-0 focus:outline-focus disabled:bg-muted disabled:text-secondary aria-invalid:border-danger";

function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClassName, className)} {...props} />;
}

export default TextInput;
