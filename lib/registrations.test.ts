import { describe, expect, test } from "bun:test";

import { describeRegistrations, planRegistrations } from "@/lib/registrations";

describe("planRegistrations", () => {
  test("registers every student on every offering", () => {
    const { add, alreadyRegistered } = planRegistrations(["s1", "s2"], ["o1", "o2"], []);
    expect(add).toEqual([
      { student_id: "s1", offering_id: "o1" },
      { student_id: "s1", offering_id: "o2" },
      { student_id: "s2", offering_id: "o1" },
      { student_id: "s2", offering_id: "o2" },
    ]);
    expect(alreadyRegistered).toBe(0);
  });

  test("skips pairs that already exist", () => {
    const { add, alreadyRegistered } = planRegistrations(
      ["s1", "s2"],
      ["o1"],
      [{ student_id: "s1", offering_id: "o1" }],
    );
    expect(add).toEqual([{ student_id: "s2", offering_id: "o1" }]);
    expect(alreadyRegistered).toBe(1);
  });

  test("ignores duplicate ticks and empty selections", () => {
    expect(planRegistrations(["s1", "s1"], ["o1", "o1"], []).add).toHaveLength(1);
    expect(planRegistrations([], ["o1"], []).add).toEqual([]);
    expect(planRegistrations(["s1"], [], []).add).toEqual([]);
  });
});

describe("describeRegistrations", () => {
  test("summarises the result", () => {
    expect(describeRegistrations(6, 2)).toBe("6 registrations added; 2 were already registered.");
    expect(describeRegistrations(1, 0)).toBe("1 registration added.");
    expect(describeRegistrations(0, 1)).toBe("No new registrations; 1 was already registered.");
  });
});
