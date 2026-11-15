import { describe, expect, test } from "bun:test";

import { rowToValues, splitFullName, valuesToUpdate } from "@/lib/applications/mapping";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["applications"]["Row"];

const row: Row = {
  id: "a",
  applicant_id: "u",
  programme_id: null,
  intake_term_id: null,
  surname: "Obi",
  first_name: null,
  other_names: null,
  date_of_birth: "2000-05-17",
  gender: "female",
  phone: "+2348031234567",
  email: null,
  address: null,
  state_of_origin: null,
  nationality: null,
  crm_branch: null,
  education: [{ institution: "FGC", qualification: "WASSCE", year: 2017 }, "junk"],
  next_of_kin_name: null,
  next_of_kin_relationship: null,
  next_of_kin_phone: null,
  referee_name: null,
  referee_position: null,
  referee_phone: null,
  referee_email: null,
  consent_given_at: "2026-11-15T10:00:00.000Z",
  status: "draft",
  submitted_at: null,
  reviewed_by: null,
  decision_note: null,
  decided_at: null,
  created_at: "2026-11-15T09:00:00.000Z",
  updated_at: "2026-11-15T09:00:00.000Z",
};

describe("rowToValues", () => {
  test("turns nulls into empty strings and reads education safely", () => {
    const values = rowToValues(row);
    expect(values.firstName).toBe("");
    expect(values.surname).toBe("Obi");
    expect(values.gender).toBe("female");
    expect(values.education).toEqual([
      { institution: "FGC", qualification: "WASSCE", year: "2017" },
    ]);
    expect(values.consent).toBe(true);
  });
});

describe("valuesToUpdate", () => {
  test("round-trips, normalising phones and dropping empty education rows", () => {
    const values = {
      ...rowToValues(row),
      phone: "0803 123 4567",
      email: " Ada@Example.com ",
      education: [
        { institution: "FGC", qualification: "WASSCE", year: "2017" },
        { institution: "", qualification: "", year: "" },
      ],
    };
    const update = valuesToUpdate(values, row.consent_given_at);
    expect(update.phone).toBe("+2348031234567");
    expect(update.email).toBe("ada@example.com");
    expect(update.first_name).toBeNull();
    expect(update.education).toEqual([{ institution: "FGC", qualification: "WASSCE", year: 2017 }]);
  });

  test("keeps the original consent time, and clears it when unticked", () => {
    const values = rowToValues(row);
    expect(valuesToUpdate(values, row.consent_given_at).consent_given_at).toBe(
      row.consent_given_at,
    );
    expect(
      valuesToUpdate({ ...values, consent: false }, row.consent_given_at).consent_given_at,
    ).toBeNull();
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
