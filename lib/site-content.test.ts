import { describe, expect, test } from "bun:test";

import {
  parseSiteContentForm,
  readSiteContent,
  SITE_CONTENT_FIELDS,
  SITE_CONTENT_GROUPS,
  toEditText,
} from "@/lib/site-content";

function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("SITE_CONTENT_FIELDS", () => {
  test("every field has a group and a key the database accepts", () => {
    const groups = new Set<string>(SITE_CONTENT_GROUPS.map((group) => group.id));
    const keys: string[] = Object.values(SITE_CONTENT_FIELDS).map((field) => field.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const field of Object.values(SITE_CONTENT_FIELDS))
      expect(groups.has(field.group)).toBe(true);
    // Must match the check in supabase/migrations/*_site_content.sql.
    expect(keys.sort()).toEqual(
      [
        "welcome",
        "mission",
        "history",
        "statement_of_faith",
        "contact_address",
        "contact_phone",
        "contact_email",
        "map_query",
        "office_hours",
        "data_controller",
        "privacy_email",
        "application_fee",
      ].sort(),
    );
  });
});

describe("readSiteContent", () => {
  test("reads each stored value, and anything missing or malformed as null", () => {
    const content = readSiteContent([
      { key: "mission", value: "To equip leaders." },
      { key: "history", value: ["Founded.", "Grew."] },
      { key: "statement_of_faith", value: [{ title: "The Bible", body: "Inspired." }] },
      { key: "welcome", value: "   " },
      { key: "office_hours", value: ["not", "text"] },
      { key: "unknown", value: "ignored" },
    ]);
    expect(content.mission).toBe("To equip leaders.");
    expect(content.history).toEqual(["Founded.", "Grew."]);
    expect(content.statementOfFaith).toEqual([{ title: "The Bible", body: "Inspired." }]);
    expect(content.welcome).toBeNull();
    expect(content.officeHours).toBeNull();
    expect(content.contactEmail).toBeNull();
  });
});

describe("parseSiteContentForm", () => {
  test("text is trimmed; empty clears it", () => {
    expect(parseSiteContentForm("mission", form([["value", "  To equip.  "]]))).toEqual({
      ok: true,
      value: "To equip.",
    });
    expect(parseSiteContentForm("mission", form([["value", "  "]]))).toEqual({
      ok: true,
      value: null,
    });
  });

  test("history splits on empty lines into paragraphs, and round-trips for editing", () => {
    const parsed = parseSiteContentForm(
      "history",
      form([["value", "Founded in 1990.\n\n\n  Moved to Owerri.  \n"]]),
    );
    expect(parsed).toEqual({ ok: true, value: ["Founded in 1990.", "Moved to Owerri."] });
    expect(toEditText("history", ["Founded in 1990.", "Moved to Owerri."])).toBe(
      "Founded in 1990.\n\nMoved to Owerri.",
    );
  });

  test("articles pair titles with their text, skip empty rows and refuse half-filled ones", () => {
    expect(
      parseSiteContentForm(
        "statementOfFaith",
        form([
          ["title", "The Bible"],
          ["body", "Inspired."],
          ["title", ""],
          ["body", ""],
        ]),
      ),
    ).toEqual({ ok: true, value: [{ title: "The Bible", body: "Inspired." }] });
    expect(
      parseSiteContentForm(
        "statementOfFaith",
        form([
          ["title", "God"],
          ["body", ""],
        ]),
      ),
    ).toEqual({ ok: false, message: "Each article needs a title and its text." });
    expect(parseSiteContentForm("statementOfFaith", form([]))).toEqual({ ok: true, value: null });
  });

  test("emails, phones and one-line answers are checked", () => {
    expect(parseSiteContentForm("contactEmail", form([["value", "not an email"]])).ok).toBe(false);
    expect(parseSiteContentForm("contactPhone", form([["value", "12345"]])).ok).toBe(false);
    expect(parseSiteContentForm("contactPhone", form([["value", "0803 123 4567"]]))).toEqual({
      ok: true,
      value: "0803 123 4567",
    });
    expect(parseSiteContentForm("officeHours", form([["value", "Mon\nTue"]]))).toEqual({
      ok: false,
      message: "Keep it to one line.",
    });
    expect(parseSiteContentForm("mapQuery", form([["value", "x".repeat(201)]])).ok).toBe(false);
  });
});
