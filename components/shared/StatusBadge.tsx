import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];
type StudentStatus = Database["public"]["Enums"]["student_status"];

const STATUS: Record<ApplicationStatus | StudentStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-secondary ring-border" },
  submitted: { label: "Submitted", className: "bg-brand/10 text-brand ring-brand/30" },
  under_review: {
    label: "Under review",
    className: "bg-accent-soft/40 text-accent-strong ring-accent/40",
  },
  admitted: { label: "Admitted", className: "bg-success-soft text-success ring-success/30" },
  rejected: { label: "Not admitted", className: "bg-danger-soft text-danger ring-danger/30" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-secondary ring-border" },
  active: { label: "Active", className: "bg-success-soft text-success ring-success/30" },
  deferred: {
    label: "Deferred",
    className: "bg-accent-soft/40 text-accent-strong ring-accent/40",
  },
  graduated: { label: "Graduated", className: "bg-brand/10 text-brand ring-brand/30" },
};

/** Status pill for applications and students. */
function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus | StudentStatus;
  className?: string;
}) {
  const { label, className: tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
