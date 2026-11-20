import { describe, expect, test } from "bun:test";

import {
  APPLICATION_HEADERS,
  applicationRow,
  keepResult,
  parseExportFilters,
  phoneForExport,
  resultRow,
  sortResults,
  STUDENT_HEADERS,
  studentRow,
  type ApplicationExportRow,
  type ResultExportRow,
} from "@/lib/exports";

const params = (values: Record<string, string>) => new URLSearchParams(values);
const TERM = "11111111-2222-3333-4444-555555555555";

describe("parseExportFilters", () => {
  test("applications: an empty status means all", () => {
    expect(parseExportFilters("applications", params({ status: "" }))).toEqual({ status: null });
    expect(parseExportFilters("applications", params({ status: "admitted" }))).toEqual({
      status: "admitted",
    });
    expect(parseExportFilters("applications", params({ status: "everything" }))).toBeNull();
  });

  test("students: status and programme are optional", () => {
    expect(parseExportFilters("students", params({}))).toEqual({
      status: null,
      programmeId: null,
    });
    expect(parseExportFilters("students", params({ programmeId: "not-an-id" }))).toBeNull();
  });

  test("results: a term is required; drafts only when asked", () => {
    expect(parseExportFilters("results", params({}))).toBeNull();
    expect(parseExportFilters("results", params({ termId: TERM }))).toEqual({
      termId: TERM,
      includeDrafts: false,
    });
    expect(parseExportFilters("results", params({ termId: TERM, includeDrafts: "1" }))).toEqual({
      termId: TERM,
      includeDrafts: true,
    });
  });
});

describe("phoneForExport", () => {
  test("Nigerian numbers in national format, so spreadsheets never see a leading +", () => {
    expect(phoneForExport("+2348031234567")).toBe("0803 123 4567");
  });

  test("other countries in international format; empty stays empty", () => {
    expect(phoneForExport("+447911123456")).toBe("+44 7911 123456");
    expect(phoneForExport(null)).toBe("");
  });
});

describe("rows", () => {
  test("an application row has one value per header, with readable labels", () => {
    const row = applicationRow({
      id: "a",
      applicant_id: "u",
      programme_id: "p",
      intake_term_id: "t",
      surname: "Obi",
      first_name: "Ada",
      other_names: null,
      date_of_birth: "1990-05-14",
      gender: "female",
      phone: "+2348031234567",
      email: "ada@example.test",
      address: "1 Road",
      state_of_origin: "Lagos",
      nationality: "Nigerian",
      crm_branch: null,
      education: [{ institution: "Fake College", qualification: "WAEC", year: 2007 }],
      next_of_kin_name: "Femi",
      next_of_kin_relationship: "Brother",
      next_of_kin_phone: "+2348039876543",
      referee_name: null,
      referee_position: null,
      referee_phone: null,
      referee_email: null,
      consent_given_at: null,
      status: "under_review",
      submitted_at: "2026-11-20T01:22:03Z",
      reviewed_by: null,
      decision_note: null,
      decided_at: null,
      created_at: "2026-11-20T01:00:00Z",
      updated_at: "2026-11-20T01:00:00Z",
      programme: { title: "Certificate in Theology" },
      intake: { name: "Second semester", session: "2026/2027" },
    } as ApplicationExportRow);
    expect(row).toHaveLength(APPLICATION_HEADERS.length);
    expect(row.slice(0, 5)).toEqual([
      "Under review",
      "2026-11-20",
      "",
      "Certificate in Theology",
      "Second semester, 2026/2027",
    ]);
    expect(row).toContain("Female");
    expect(row).toContain("0803 123 4567");
    expect(row).toContain("WAEC, Fake College, 2007");
  });

  test("a student row has one value per header", () => {
    const row = studentRow({
      matric_no: "GHTI/2026/CERT/101",
      status: "active",
      created_at: "2026-11-16T10:00:00Z",
      profile: { full_name: "Chidi Eze" },
      programme: { title: "Certificate in Theology" },
      entry_term: { name: "First semester", session: "2026/2027" },
      application: null,
    });
    expect(row).toHaveLength(STUDENT_HEADERS.length);
    expect(row).toEqual([
      "GHTI/2026/CERT/101",
      "Chidi Eze",
      "Certificate in Theology",
      "First semester, 2026/2027",
      "Active",
      "2026-11-16",
      "",
      "",
    ]);
  });

  const result = (matricNo: string, code: string, status: "draft" | "published" | null) =>
    ({
      matricNo,
      name: matricNo,
      code,
      title: code,
      creditUnits: 3,
      grade: status
        ? { ca_score: 28, exam_score: 45, total: 73, letter: "A", grade_point: 5, status }
        : null,
    }) satisfies ResultExportRow;

  test("results: published only unless drafts are asked for; ungraded say so", () => {
    expect(keepResult(result("A", "X", "draft"), false)).toBe(false);
    expect(keepResult(result("A", "X", "draft"), true)).toBe(true);
    expect(keepResult(result("A", "X", "published"), false)).toBe(true);
    expect(keepResult(result("A", "X", null), false)).toBe(false);
    expect(resultRow(result("A", "X", null)).at(-1)).toBe("No grade");
  });

  test("results sort by matric number, then course", () => {
    const sorted = sortResults([
      result("B", "X", null),
      result("A", "Y", null),
      result("A", "X", null),
    ]);
    expect(sorted.map((row) => `${row.matricNo} ${row.code}`)).toEqual(["A X", "A Y", "B X"]);
  });
});
