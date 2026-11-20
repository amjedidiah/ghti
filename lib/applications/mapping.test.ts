import { describe, expect, test } from "bun:test";

import { rowToValues, splitFullName, valuesToUpdate } from "@/lib/applications/mapping";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["applications"]["Row"];

const row: Row = {
  id: "a",
  applicant_id: "u",
  programme_id: null,
  intake_term_id: null,
  title: null,
  surname: "Obi",
  first_name: null,
  other_names: null,
  date_of_birth: "2000-05-17",
  gender: "female",
  nationality: null,
  marital_status: "married",
  phone: "+2348031234567",
  email: null,
  address: null,
  permanent_address: null,
  next_of_kin_name: null,
  next_of_kin_relationship: null,
  next_of_kin_phone: null,
  next_of_kin_email: null,
  next_of_kin_occupation: null,
  next_of_kin_address: null,
  occupation: null,
  employer: null,
  nature_of_work: null,
  born_again: true,
  born_again_when: null,
  church: "Grace Chapel, Owerri",
  church_membership: null,
  church_duties: null,
  pastor_name: null,
  pastor_phone: null,
  education: [{ institution: "FGC", certificate: "WASSCE", from: 2011, to: 2017 }, "junk"],
  referees: [{ name: "Rev. Okeke", phone: "+2348030000002" }],
  pledge_given_at: null,
  consent_given_at: "2026-11-15T10:00:00.000Z",
  status: "draft",
  submitted_at: null,
  reviewed_by: null,
  decision_note: null,
  decided_at: null,
  created_at: "2026-11-15T09:00:00.000Z",
  updated_at: "2026-11-15T09:00:00.000Z",
};

const given = { consentGivenAt: row.consent_given_at, pledgeGivenAt: row.pledge_given_at };
const noReferee = { name: "", address: "", occupation: "", email: "", phone: "" };

describe("rowToValues", () => {
  test("turns nulls into empty strings and reads stored JSON safely", () => {
    const values = rowToValues(row);
    expect(values.firstName).toBe("");
    expect(values.surname).toBe("Obi");
    expect(values.gender).toBe("female");
    expect(values.maritalStatus).toBe("married");
    expect(values.bornAgain).toBe("yes");
    expect(values.education).toEqual([
      { institution: "FGC", address: "", from: "2011", to: "2017", certificate: "WASSCE" },
    ]);
    expect(values.consent).toBe(true);
    expect(values.pledge).toBe(false);
  });

  test("always gives the form two referees", () => {
    expect(rowToValues(row).referees).toEqual([
      { ...noReferee, name: "Rev. Okeke", phone: "+2348030000002" },
      noReferee,
    ]);
    expect(rowToValues({ ...row, referees: [] }).referees).toEqual([noReferee, noReferee]);
  });
});

describe("valuesToUpdate", () => {
  test("round-trips, normalising phones and dropping empty entries", () => {
    const values = {
      ...rowToValues(row),
      phone: "0803 123 4567",
      email: " Ada@Example.com ",
      bornAgain: "no" as const,
      education: [
        { institution: "FGC", address: "", from: "", to: "2017", certificate: "WASSCE" },
        { institution: "", address: "", from: "", to: "", certificate: "" },
      ],
      referees: [{ ...noReferee, name: "Rev. Okeke", phone: "0803 000 0002" }, noReferee],
    };
    const update = valuesToUpdate(values, given);
    expect(update.phone).toBe("+2348031234567");
    expect(update.email).toBe("ada@example.com");
    expect(update.first_name).toBeNull();
    expect(update.born_again).toBe(false);
    expect(update.education).toEqual([{ institution: "FGC", to: 2017, certificate: "WASSCE" }]);
    expect(update.referees).toEqual([{ name: "Rev. Okeke", phone: "+2348030000002" }]);
  });

  test("keeps the first consent and pledge times, and clears them when unticked", () => {
    const values = rowToValues(row);
    expect(valuesToUpdate(values, given).consent_given_at).toBe(row.consent_given_at);
    expect(valuesToUpdate({ ...values, consent: false }, given).consent_given_at).toBeNull();
    const pledged = valuesToUpdate({ ...values, pledge: true }, given).pledge_given_at;
    expect(typeof pledged).toBe("string");
    expect(
      valuesToUpdate(
        { ...values, pledge: true },
        { ...given, pledgeGivenAt: "2026-11-16T00:00:00Z" },
      ).pledge_given_at,
    ).toBe("2026-11-16T00:00:00Z");
  });
});

describe("splitFullName", () => {
  test.each([
    ["Ada Obi", { firstName: "Ada", surname: "Obi" }],
    ["  Ada Ngozi  Obi ", { firstName: "Ada", surname: "Obi" }],
    ["Ada", { firstName: "Ada", surname: "" }],
    ["", { firstName: "", surname: "" }],
  ])("%p", (name, expected) => {
    expect(splitFullName(name)).toEqual(expected);
  });
});
