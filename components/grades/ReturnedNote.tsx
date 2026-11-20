import { Undo2 } from "lucide-react";

import type { GradeReturn } from "@/lib/queries/grade-sheet";

const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

/** The office's note on grades it returned, until they are submitted again. */
/** `audience` "admin" is the admin's view; "lecturer" the lecturer's. */
function ReturnedNote({
  returned,
  audience,
  hasLecturer = true,
}: {
  returned: GradeReturn;
  audience: "admin" | "lecturer";
  /** Admin view: whether a lecturer is assigned (and so was emailed). */
  hasLecturer?: boolean;
}) {
  const grades = `${returned.count} grade${returned.count === 1 ? "" : "s"}`;
  return (
    <section
      aria-labelledby="returned-note"
      className="rounded-xl border border-accent/50 bg-accent-soft/20 p-4 sm:p-5"
    >
      <h2 id="returned-note" className="flex items-center gap-2 font-semibold text-primary">
        <Undo2 className="size-5 text-accent-strong" aria-hidden />
        {audience === "lecturer"
          ? `The office returned ${grades} to you`
          : `${grades} returned to the lecturer`}
      </h2>
      <p className="mt-1 text-sm text-secondary">
        {dateTimeFormat.format(new Date(returned.returnedAt))}
      </p>
      <p className="mt-3 whitespace-pre-line text-primary">{returned.note}</p>
      <p className="mt-3 text-sm text-secondary">
        {audience === "lecturer"
          ? "Change what is needed, then submit the grades for approval again."
          : hasLecturer
            ? "The lecturer was emailed this note. The grades are drafts until they submit them again."
            : "No lecturer is assigned, so nobody was emailed. The grades are drafts again."}
      </p>
    </section>
  );
}

export default ReturnedNote;
