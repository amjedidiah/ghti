import { describe, expect, test } from "bun:test";

import {
  applicationDraftSchema,
  applicationSubmitSchema,
  formatPhone,
  normalisePhone,
  type ApplicationValues,
} from "@/lib/validation/application";

const noReferee = { name: "", address: "", occupation: "", email: "", phone: "" };

const empty: ApplicationValues = {
  programmeId: "",
  intakeTermId: "",
  title: "",
  surname: "",
  firstName: "",
  otherNames: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  maritalStatus: "",
  phone: "",
  email: "",
  address: "",
  permanentAddress: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
  nextOfKinEmail: "",
  nextOfKinOccupation: "",
  nextOfKinAddress: "",
  occupation: "",
  employer: "",
  natureOfWork: "",
  bornAgain: "",
  bornAgainWhen: "",
  church: "",
  churchMembership: "",
  churchDuties: "",
  pastorName: "",
  pastorPhone: "",
  education: [],
  referees: [noReferee, noReferee],
  pledge: false,
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
  nationality: "Nigerian",
  maritalStatus: "married",
  phone: "0803 123 4567",
  email: "ada@example.com",
  address: "PO Box 12, Owerri",
  permanentAddress: "12 Church Road, Enugu",
  nextOfKinName: "Ngozi Obi",
  nextOfKinRelationship: "Mother",
  nextOfKinPhone: "+234 805 000 0000",
  bornAgain: "yes",
  church: "Grace Chapel, Owerri",
  pastorName: "Pastor John Eze",
  pastorPhone: "0803 000 0001",
  education: [
    {
      institution: "Federal Girls College",
      address: "",
      from: "2011",
      to: "2017",
      certificate: "WASSCE",
    },
  ],
  referees: [
    { ...noReferee, name: "Rev. Uche Okeke", phone: "0803 000 0002" },
    { ...noReferee, name: "Mrs Ifeoma Nwosu", phone: "0803 000 0003" },
  ],
  pledge: true,
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
        "bornAgain",
        "church",
        "consent",
        "dateOfBirth",
        "education",
        "email",
        "firstName",
        "gender",
        "intakeTermId",
        "maritalStatus",
        "nationality",
        "nextOfKinName",
        "nextOfKinPhone",
        "nextOfKinRelationship",
        "pastorName",
        "pastorPhone",
        "permanentAddress",
        "phone",
        "pledge",
        "programmeId",
        "referees.0.name",
        "referees.0.phone",
        "referees.1.name",
        "referees.1.phone",
        "surname",
      ].sort(),
    );
  });

  test("flags half-filled education rows field by field", () => {
    const result = applicationSubmitSchema.safeParse({
      ...complete,
      education: [
        ...complete.education,
        { institution: "Another School", address: "", from: "", to: "", certificate: "" },
      ],
    });
    expect(messages(result)).toEqual({
      "education.1.certificate": "Enter the certificate obtained.",
    });
  });

  test("the year left cannot come before the year started", () => {
    const result = applicationDraftSchema.safeParse({
      ...complete,
      education: [{ ...complete.education[0], from: "2017", to: "2011" }],
    });
    expect(messages(result)).toEqual({
      "education.0.to": "The year you left cannot be before the year you started.",
    });
  });

  test("a referee needs a name and a phone number; the rest is optional", () => {
    const result = applicationSubmitSchema.safeParse({
      ...complete,
      referees: [complete.referees[0], { ...noReferee, name: "Only a name" }],
    });
    expect(messages(result)).toEqual({ "referees.1.phone": "Enter the referee's phone number." });
  });
});
