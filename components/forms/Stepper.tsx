"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Progress through a form in steps: an ordered list of steps, each a button
 * to go there, with the current one marked (aria-current="step"). On phones
 * it shows "Step 3 of 9: Title" and opens the list on demand.
 */
function Stepper({
  steps,
  current,
  done,
  onSelect,
  label = "Steps",
}: {
  steps: readonly { id: string; title: string }[];
  /** 1-based. */
  current: number;
  /** Steps (1-based) to mark as done. */
  done: ReadonlySet<number>;
  onSelect: (step: number) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <nav
      aria-label={label}
      className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1 text-left text-sm font-semibold text-primary md:hidden"
      >
        <span>
          Step {current} of {steps.length}: {steps[current - 1]?.title}
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <ol
        id={listId}
        className={cn(
          "mt-2 space-y-1 md:mt-0 md:grid md:grid-cols-3 md:gap-1 md:space-y-0",
          !open && "hidden md:grid",
        )}
      >
        {steps.map((step, index) => {
          const number = index + 1;
          const isCurrent = number === current;
          const isDone = done.has(number) && !isCurrent;
          return (
            <li key={step.id}>
              <button
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => {
                  setOpen(false);
                  onSelect(number);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
                  isCurrent
                    ? "bg-brand/10 font-semibold text-primary"
                    : "text-secondary hover:bg-muted",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isCurrent
                      ? "bg-brand text-on-brand"
                      : isDone
                        ? "bg-success-soft text-success"
                        : "bg-muted text-secondary",
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : number}
                </span>
                <span className="min-w-0">
                  {step.title}
                  {isDone && <span className="sr-only"> (done)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Stepper;
