// How long GHTI keeps personal data it no longer needs (NDPA 2023).
// Pure; tested in retention.test.ts.

/**
 * Days to keep a rejected applicant's documents after the decision, then
 * delete them. null until GHTI decides (client input #19): while it is null
 * the clean-up job deletes nothing. Changing it is the whole switch.
 */
export const REJECTED_DOCUMENTS_KEEP_DAYS: number | null = null;

/** Most files one run removes; the rest go on the next day's run. */
export const CLEANUP_BATCH_LIMIT = 100;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Documents of applications rejected before this moment are due for
 * deletion. null when no retention period is set (delete nothing).
 */
export function rejectedDocumentsCutoff(now: Date, keepDays: number | null): Date | null {
  if (keepDays === null || !Number.isFinite(keepDays) || keepDays < 1) return null;
  return new Date(now.getTime() - Math.floor(keepDays) * DAY_MS);
}
