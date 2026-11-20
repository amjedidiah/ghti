import { CalendarDays, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import type { Schedule } from "@/lib/queries/content";
import { termLabel } from "@/lib/validation/academics";

/**
 * Lecture schedules, grouped by term (newest first). Each opens through
 * /schedules/[id], never a raw Drive link. `actions` adds per-item controls
 * (the admin's delete).
 */
function ScheduleList({
  schedules,
  actions,
  headingLevel = 3,
}: {
  schedules: Schedule[];
  actions?: (schedule: Schedule) => ReactNode;
  headingLevel?: 2 | 3;
}) {
  const terms = new Map<string, { label: string; items: Schedule[] }>();
  for (const schedule of schedules) {
    const entry = terms.get(schedule.term.id) ?? { label: termLabel(schedule.term), items: [] };
    entry.items.push(schedule);
    terms.set(schedule.term.id, entry);
  }
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className="space-y-5">
      {[...terms.entries()].map(([termId, term]) => (
        <section key={termId} aria-label={term.label}>
          <Heading className="text-sm font-semibold tracking-wide text-secondary uppercase">
            {term.label}
          </Heading>
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
            {term.items.map((schedule) => (
              <li key={schedule.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <CalendarDays className="size-5 shrink-0 text-accent-strong" aria-hidden />
                <span className="min-w-0 flex-1 font-semibold text-primary">{schedule.title}</span>
                <a
                  href={`/schedules/${schedule.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
                >
                  Open
                  <ExternalLink className="size-3.5" aria-hidden />
                  <span className="sr-only">{schedule.title} (opens in a new tab)</span>
                </a>
                {actions?.(schedule)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default ScheduleList;
