import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeZone: "Africa/Lagos",
});

type ChangeRequest = {
  id: string;
  body: string;
  status: "open" | "resolved";
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
};

/**
 * Change requests with their status and outcome: the student's own in the
 * portal, and a student's in their file, where `resolve` adds the admin's
 * Resolve form to each open one.
 */
function ChangeRequestList({
  requests,
  empty,
  resolve,
}: {
  requests: ChangeRequest[];
  empty: string;
  resolve?: (requestId: string) => ReactNode;
}) {
  if (requests.length === 0) return <p className="text-sm text-secondary">{empty}</p>;
  return (
    <ul className="space-y-4">
      {requests.map((request) => {
        const open = request.status === "open";
        return (
          <li key={request.id} className="rounded-md border border-border p-4">
            <p className="flex flex-wrap items-center gap-2 text-xs text-secondary">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset",
                  open
                    ? "bg-accent-soft/40 text-accent-strong ring-accent/40"
                    : "bg-success-soft text-success ring-success/30",
                )}
              >
                {open ? "Waiting" : "Resolved"}
              </span>
              Asked {dateFormat.format(new Date(request.created_at))}
              {request.resolved_at &&
                ` · resolved ${dateFormat.format(new Date(request.resolved_at))}`}
            </p>
            <p className="mt-2 text-sm break-words whitespace-pre-line text-primary">
              {request.body}
            </p>
            {request.resolution && (
              <p className="mt-2 border-l-2 border-success/40 pl-3 text-sm break-words whitespace-pre-line text-secondary">
                <span className="font-semibold text-primary">Registrar: </span>
                {request.resolution}
              </p>
            )}
            {open && resolve && <div className="mt-3">{resolve(request.id)}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export default ChangeRequestList;
