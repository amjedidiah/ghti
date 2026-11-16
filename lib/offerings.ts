// Which courses run in a term (Stage 2, step 2.1). Admins tick the courses for
// a term; this works out what to add and remove. An offering with registered
// students is never removed: its registrations (and later grades) depend on it.

export type ExistingOffering = { courseId: string; registrations: number };

export type OfferingChanges = {
  /** Courses to offer that are not offered yet. */
  add: string[];
  /** Offerings to remove: unticked and nobody registered. */
  remove: string[];
  /** Unticked, but students are registered, so they stay. */
  kept: string[];
};

export function diffOfferings(
  existing: ExistingOffering[],
  selected: Iterable<string>,
): OfferingChanges {
  const wanted = new Set(selected);
  const current = new Map(existing.map((offering) => [offering.courseId, offering.registrations]));

  const add = [...wanted].filter((courseId) => !current.has(courseId));
  const remove: string[] = [];
  const kept: string[] = [];
  for (const [courseId, registrations] of current) {
    if (wanted.has(courseId)) continue;
    (registrations > 0 ? kept : remove).push(courseId);
  }
  return { add, remove, kept };
}

/** "2 added, 1 removed" or "No changes". */
export function describeChanges({ add, remove }: Pick<OfferingChanges, "add" | "remove">): string {
  const parts = [
    add.length > 0 ? `${add.length} added` : null,
    remove.length > 0 ? `${remove.length} removed` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `Saved: ${parts.join(", ")}.` : "No changes to save.";
}
