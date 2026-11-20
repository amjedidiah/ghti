import { describe, expect, test } from "bun:test";

import { summariseRecords } from "@/lib/admin-overview";

const terms = [
  { id: "t2", label: "Second semester, 2026/2027" },
  { id: "t1", label: "First semester, 2026/2027" },
];

describe("summariseRecords", () => {
  test("counts active students by programme, most first", () => {
    const summary = summariseRecords({
      students: [
        { programme: "Certificate", status: "active" },
        { programme: "Diploma", status: "active" },
        { programme: "Certificate", status: "active" },
        { programme: "Certificate", status: "deferred" },
      ],
      unpublishedGrades: [],
      publishedGrades: [],
      notices: [],
      terms,
    });
    expect(summary.activeStudents).toBe(3);
    expect(summary.studentsByProgramme).toEqual([
      { programme: "Certificate", count: 2 },
      { programme: "Diploma", count: 1 },
    ]);
  });

  test("results emails: students with published grades not yet emailed, per term, newest first", () => {
    const summary = summariseRecords({
      students: [],
      unpublishedGrades: [],
      publishedGrades: [
        { studentId: "a", termId: "t1" },
        { studentId: "a", termId: "t1" },
        { studentId: "b", termId: "t1" },
        { studentId: "a", termId: "t2" },
      ],
      notices: [{ studentId: "b", termId: "t1" }],
      terms,
    });
    expect(summary.resultsEmails).toEqual([
      { termId: "t2", label: "Second semester, 2026/2027", students: 1 },
      { termId: "t1", label: "First semester, 2026/2027", students: 1 },
    ]);
  });

  test("unpublished grades point to the newest term that has them", () => {
    const summary = summariseRecords({
      students: [],
      unpublishedGrades: [{ termId: "t1" }, { termId: "t1" }],
      publishedGrades: [],
      notices: [],
      terms,
    });
    expect(summary.unpublishedGrades).toBe(2);
    expect(summary.firstTermWithDrafts).toBe("t1");
  });
});
