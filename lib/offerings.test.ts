import { describe, expect, test } from "bun:test";

import { describeChanges, diffOfferings } from "@/lib/offerings";

describe("diffOfferings", () => {
  test("adds newly ticked courses and removes unticked ones", () => {
    const changes = diffOfferings(
      [
        { courseId: "a", registrations: 0 },
        { courseId: "b", registrations: 0 },
      ],
      ["b", "c"],
    );
    expect(changes).toEqual({ add: ["c"], remove: ["a"], kept: [] });
  });

  test("keeps an unticked offering that has registered students", () => {
    const changes = diffOfferings([{ courseId: "a", registrations: 12 }], []);
    expect(changes).toEqual({ add: [], remove: [], kept: ["a"] });
  });

  test("no change when the selection matches", () => {
    expect(diffOfferings([{ courseId: "a", registrations: 3 }], ["a"])).toEqual({
      add: [],
      remove: [],
      kept: [],
    });
  });

  test("ignores duplicate ticks", () => {
    expect(diffOfferings([], ["a", "a"]).add).toEqual(["a"]);
  });
});

describe("describeChanges", () => {
  test("summarises additions and removals", () => {
    expect(describeChanges({ add: ["a", "b"], remove: ["c"] })).toBe("Saved: 2 added, 1 removed.");
    expect(describeChanges({ add: [], remove: ["c"] })).toBe("Saved: 1 removed.");
    expect(describeChanges({ add: [], remove: [] })).toBe("No changes to save.");
  });
});
