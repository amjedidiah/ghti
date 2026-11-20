import { describe, expect, test } from "bun:test";

import {
  APPLICATION_STEPS,
  firstStepWithError,
  issuesForStep,
  parseStep,
  STEP_COUNT,
  stepOfField,
} from "@/lib/applications/steps";

describe("APPLICATION_STEPS", () => {
  test("nine steps, ending with review, each field owned once", () => {
    expect(STEP_COUNT).toBe(9);
    expect(APPLICATION_STEPS.at(-1)?.id).toBe("review");
    const fields = APPLICATION_STEPS.flatMap((step) => step.fields as readonly string[]);
    expect(new Set(fields).size).toBe(fields.length);
  });
});

describe("parseStep", () => {
  test.each([
    ["3", 3],
    ["9", 9],
    ["0", 1],
    ["10", 1],
    ["two", 1],
    [undefined, 1],
    [["4"], 1],
  ])("%p -> %p", (value, expected) => {
    expect(parseStep(value)).toBe(expected);
  });
});

describe("stepOfField", () => {
  test("finds the step of plain and nested fields, and documents", () => {
    expect(stepOfField("surname")).toBe(2);
    expect(stepOfField("referees.1.phone")).toBe(7);
    expect(stepOfField("education")).toBe(6);
    expect(stepOfField("photo")).toBe(8);
    expect(stepOfField("pledge")).toBe(9);
    expect(stepOfField("nothing")).toBeNull();
  });
});

describe("issuesForStep", () => {
  test("keeps the first message per field, for that step only", () => {
    const issues = [
      { path: ["surname"], message: "Enter your surname." },
      { path: ["surname"], message: "Second message" },
      { path: ["referees", 0, "name"], message: "Enter the referee's name." },
    ];
    expect(issuesForStep(issues, 2)).toEqual({ surname: "Enter your surname." });
    expect(issuesForStep(issues, 7)).toEqual({ "referees.0.name": "Enter the referee's name." });
    expect(issuesForStep(issues, 1)).toEqual({});
  });
});

describe("firstStepWithError", () => {
  test("the earliest step with an error, or null", () => {
    expect(firstStepWithError({ consent: "x", photo: "y", church: "z" })).toBe(5);
    expect(firstStepWithError({})).toBeNull();
  });
});
