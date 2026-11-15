import { Hourglass } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Visible stand-in for content GHTI has not supplied yet. Deliberately obvious,
 * so nobody mistakes it for final copy. `input` is the row number in
 * docs/client_inputs.md.
 */
function Placeholder({
  what,
  input,
  className,
}: {
  what: string;
  input: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border-2 border-dashed border-accent/60 bg-accent-soft/15 p-4 text-sm text-secondary",
        className,
      )}
    >
      <Hourglass className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
      <p>
        <span className="font-semibold text-primary">Waiting for GHTI:</span> {what}{" "}
        <span className="text-xs">(client input #{input})</span>
      </p>
    </div>
  );
}

export default Placeholder;
