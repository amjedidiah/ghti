import { cn } from "@/lib/utils";
import { PROGRAMME_STATUS_LABELS, PROGRAMME_STATUSES } from "@/lib/validation/academics";

type ProgrammeStatus = (typeof PROGRAMME_STATUSES)[number];

const DOTS: Record<ProgrammeStatus, string> = {
  published: "bg-success",
  draft: "bg-accent",
  archived: "bg-secondary/50",
};

/** Programme status as a dot and a word, so it never looks like the level pill beside it. */
function ProgrammeStatusBadge({
  status,
  className,
}: {
  status: ProgrammeStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm font-medium text-primary", className)}
    >
      <span aria-hidden className={cn("size-2 rounded-full", DOTS[status])} />
      {PROGRAMME_STATUS_LABELS[status]}
    </span>
  );
}

export default ProgrammeStatusBadge;
