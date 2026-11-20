// Who gets the "results are out" email for a term (Stage 2, step 2.3).
// Pure; tested in result-notices.test.ts.

/**
 * Most "results are out" emails one click sends. Resend's free tier allows 100
 * emails a day, shared with the sign-in emails Supabase sends, so one run
 * leaves room for those; the rest go on the next click (or the next day).
 */
export const RESULT_NOTICES_PER_RUN = 80;

export type ResultNoticePlan = {
  /** Students with at least one published grade this term. */
  withResults: number;
  /** Already emailed for this term. */
  notified: number;
  /** Not yet emailed, in send order. */
  pending: string[];
  /** The part of `pending` this run sends. */
  toSend: string[];
};

/**
 * @param publishedStudentIds one entry per published grade this term (repeats are fine)
 * @param notifiedStudentIds students already emailed for this term
 */
export function planResultNotices(
  publishedStudentIds: readonly string[],
  notifiedStudentIds: readonly string[],
  limit = RESULT_NOTICES_PER_RUN,
): ResultNoticePlan {
  const withResults = [...new Set(publishedStudentIds)];
  const notified = new Set(notifiedStudentIds);
  const pending = withResults.filter((studentId) => !notified.has(studentId));
  return {
    withResults: withResults.length,
    notified: withResults.length - pending.length,
    pending,
    toSend: pending.slice(0, Math.max(0, limit)),
  };
}

/** What to tell the admin after a run. */
export function describeNoticeRun(run: {
  sent: number;
  failed: number;
  left: number;
  quotaReached: boolean;
}): { status: "success" | "error"; message: string } {
  const emailed = `${run.sent} student${run.sent === 1 ? "" : "s"} emailed.`;
  if (run.quotaReached) {
    return {
      status: "error",
      message: `${run.sent > 0 ? `${emailed} ` : ""}Today's email limit is used up. Try again tomorrow for the remaining ${run.left}.`,
    };
  }
  if (run.failed > 0) {
    return {
      status: "error",
      message: `${run.sent > 0 ? `${emailed} ` : ""}${run.failed} email${run.failed === 1 ? "" : "s"} could not be sent. Try again in a few minutes.`,
    };
  }
  if (run.left > 0) {
    return {
      status: "success",
      message: `${emailed} ${run.left} still to go: press the button again (up to ${RESULT_NOTICES_PER_RUN} at a time).`,
    };
  }
  return { status: "success", message: emailed };
}
