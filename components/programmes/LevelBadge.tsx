import { LEVEL_LABELS, type ProgrammeLevel } from "@/lib/programmes";
import { cn } from "@/lib/utils";

const styles: Record<ProgrammeLevel, string> = {
  certificate: "bg-muted text-secondary ring-border",
  diploma: "bg-accent-soft/40 text-accent-strong ring-accent/40",
  postgraduate_diploma: "bg-brand text-on-brand ring-brand",
};

function LevelBadge({ level, className }: { level: ProgrammeLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ring-1 ring-inset",
        styles[level],
        className,
      )}
    >
      {LEVEL_LABELS[level].singular}
    </span>
  );
}

export default LevelBadge;
