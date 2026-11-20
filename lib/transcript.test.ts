import { describe, expect, test } from "bun:test";

import { buildTranscript, transcriptFileName } from "@/lib/transcript";

const term1 = { id: "t1", session: "2026/2027", name: "First semester", starts_on: "2026-09-01" };
const term2 = { id: "t2", session: "2026/2027", name: "Second semester", starts_on: "2027-02-01" };
const record = {
  matric_no: "GHTI/2026/CERT/101",
  status: "active" as const,
  programme: { title: "Certificate in Theology", level: "certificate" as const },
  entry_term: { name: "First semester", session: "2026/2027" },
};
const course = (code: string, credit_units = 3) => ({ code, title: `${code} title`, credit_units });
const now = new Date("2026-11-20T10:00:00Z");

describe("buildTranscript", () => {
  test("published grades only; terms without any are left out", () => {
    const transcript = buildTranscript({
      name: "Chidi Eze",
      record,
      now,
      registrations: [
        {
          term: term1,
          course: course("BIB 101"),
          grade: { total: 73, letter: "A", grade_point: 5 },
        },
        { term: term1, course: course("THE 101"), grade: null },
        { term: term2, course: course("PRA 102", 2), grade: null },
      ],
    });
    expect(transcript.terms).toHaveLength(1);
    expect(transcript.terms[0]).toEqual({
      label: "First semester, 2026/2027",
      gpa: "5.00",
      unitsCounted: 3,
      courses: [
        {
          code: "BIB 101",
          title: "BIB 101 title",
          creditUnits: 3,
          total: "73",
          letter: "A",
          gradePoint: "5.00",
        },
      ],
    });
    expect(transcript.cgpa).toBe("5.00");
  });

  test("student details read as on the record", () => {
    const transcript = buildTranscript({ name: "Chidi Eze", record, now, registrations: [] });
    expect(transcript.student).toEqual({
      name: "Chidi Eze",
      matricNo: "GHTI/2026/CERT/101",
      programme: "Certificate in Theology (Certificate)",
      entryTerm: "First semester, 2026/2027",
      status: "Active",
    });
    expect(transcript.terms).toEqual([]);
    expect(transcript.cgpa).toBe("—");
    expect(transcript.generatedOn).toBe("20 November 2026");
  });
});

describe("transcriptFileName", () => {
  test("carries the date only", () => {
    expect(transcriptFileName(now)).toBe("ghti-transcript-2026-11-20.pdf");
  });
});
