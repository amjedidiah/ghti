import { describe, expect, test } from "bun:test";

import { describeNoticeRun, planResultNotices } from "@/lib/result-notices";

describe("planResultNotices", () => {
  test("counts each student once and skips those already emailed", () => {
    const plan = planResultNotices(["a", "b", "a", "c", "b"], ["b"]);
    expect(plan.withResults).toBe(3);
    expect(plan.notified).toBe(1);
    expect(plan.pending).toEqual(["a", "c"]);
    expect(plan.toSend).toEqual(["a", "c"]);
  });

  test("sends at most `limit` per run", () => {
    const plan = planResultNotices(["a", "b", "c", "d"], [], 3);
    expect(plan.pending).toEqual(["a", "b", "c", "d"]);
    expect(plan.toSend).toEqual(["a", "b", "c"]);
  });

  test("a notice for a student without results this term is ignored", () => {
    const plan = planResultNotices(["a"], ["a", "z"]);
    expect(plan.withResults).toBe(1);
    expect(plan.notified).toBe(1);
    expect(plan.pending).toEqual([]);
  });

  test("nothing published means nothing to send", () => {
    expect(planResultNotices([], [])).toEqual({
      withResults: 0,
      notified: 0,
      pending: [],
      toSend: [],
    });
  });
});

describe("describeNoticeRun", () => {
  test("all sent", () => {
    expect(describeNoticeRun({ sent: 1, failed: 0, left: 0, quotaReached: false })).toEqual({
      status: "success",
      message: "1 student emailed.",
    });
  });

  test("more to send", () => {
    const result = describeNoticeRun({ sent: 80, failed: 0, left: 12, quotaReached: false });
    expect(result.status).toBe("success");
    expect(result.message).toContain("12 still to go");
  });

  test("daily limit reached", () => {
    const result = describeNoticeRun({ sent: 0, failed: 40, left: 40, quotaReached: true });
    expect(result.status).toBe("error");
    expect(result.message).toBe(
      "Today's email limit is used up. Try again tomorrow for the remaining 40.",
    );
  });

  test("some failed", () => {
    const result = describeNoticeRun({ sent: 3, failed: 2, left: 2, quotaReached: false });
    expect(result.status).toBe("error");
    expect(result.message).toBe(
      "3 students emailed. 2 emails could not be sent. Try again in a few minutes.",
    );
  });
});
