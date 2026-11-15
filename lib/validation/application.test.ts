import { describe, expect, test } from "bun:test";

import {
  applicationDraftSchema,
  applicationSubmitSchema,
  formatPhone,
  normalisePhone,
  type ApplicationValues,
} from "@/lib/validation/application";

const empty: ApplicationValues = {
  programmeId: "",
  intakeTermId: "",
  surname: "",
  firstName: "",
  otherNames: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  stateOfOrigin: "",
  nationality: "",
  crmBranch: "",
  education: [],
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
  refereeName: "",
  refereePosition: "",
  refereePhone: "",
  refereeEmail: "",
  consent: false,
};

const complete: ApplicationValues = {
  ...empty,
  programmeId: "7b0e7f4e-8a51-4c5e-9d4b-2f7f0e3c1a11",
  intakeTermId: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
  surname: "Obi",
  firstName: "Ada",
  dateOfBirth: "2000-05-17",
  gender: "female",
  phone: "0803 123 4567",
  email: "ada@example.com",
  address: "12 Church Road, Enugu",
  stateOfOrigin: "Enugu",
  nationality: "Nigerian",
  education: [{ institution: "Federal Girls College", qualification: "WASSCE", year: "2017" }],
  nextOfKinName: "Ngozi Obi",
  nextOfKinRelationship: "Mother",
  nextOfKinPhone: "+234 805 000 0000",
  consent: true,
};

function messages(result: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("normalisePhone", () => {
  test.each([
    ["0803 123 4567", "+2348031234567"],
    ["+234 803 123 4567", "+2348031234567"],
    ["08031234567", "+2348031234567"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("%s -> %s", (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  test("rejects numbers that cannot be real", () => {
    expect(normalisePhone("12345")).toBeNull();
  });
});

describe("formatPhone", () => {
  test("formats stored numbers for reading", () => {
    expect(formatPhone("+2348031234567")).toBe("+234 803 123 4567");
  });

  test("leaves anything unparseable as it is", () => {
    expect(formatPhone("not a phone")).toBe("not a phone");
  });
});

describe("applicationDraftSchema", () => {
  test("accepts an empty draft", () => {
    expect(applicationDraftSchema.safeParse(empty).success).toBe(true);
  });

  test("still rejects badly formed answers in a draft", () => {
    const result = applicationDraftSchema.safeParse({ ...empty, phone: "123", email: "nope" });
    expect(messages(result)).toEqual({
      phone: "Enter a valid phone number, like 0803 123 4567 or +234 803 123 4567.",
      email: "Enter a valid email address, like name@example.com.",
    });
  });

  test("rejects a future date of birth", () => {
    const result = applicationDraftSchema.safeParse({ ...empty, dateOfBirth: "2999-01-01" });
    expect(messages(result).dateOfBirth).toBe("Enter your real date of birth.");
  });
});

describe("applicationSubmitSchema", () => {
  test("accepts a complete application", () => {
    expect(applicationSubmitSchema.safeParse(complete).success).toBe(true);
  });

  test("lists every missing required answer", () => {
    const found = messages(applicationSubmitSchema.safeParse(empty));
    expect(Object.keys(found).sort()).toEqual(
      [
        "address",
        "consent",
        "dateOfBirth",
        "education",
        "email",
        "firstName",
        "gender",
        "intakeTermId",
        "nationality",
        "nextOfKinName",
        "nextOfKinPhone",
        "nextOfKinRelationship",
        "phone",
        "programmeId",
        "stateOfOrigin",
        "surname",
      ].sort(),
    );
  });

  test("flags half-filled education rows field by field", () => {
    const result = applicationSubmitSchema.safeParse({
      ...complete,
      education: [
        ...complete.education,
        { institution: "Another School", qualification: "", year: "" },
      ],
    });
    expect(messages(result)).toEqual({
      "education.1.qualification": "Enter the qualification.",
      "education.1.year": "Enter the year.",
    });
  });
});
