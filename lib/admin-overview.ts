// Numbers for the /admin overview (Stage 3, step 3.5). Pure; tested in
// admin-overview.test.ts. Counts only: no names leave the database here.

export type OverviewInput = {
  students: { programme: string; status: string }[];
  /** One entry per grade that is not yet published: a draft, or submitted for approval. */
  unpublishedGrades: { termId: string; status: "draft" | "submitted" }[];
  /** One entry per published grade: whose and which term. */
  publishedGrades: { studentId: string; termId: string }[];
  /** Students already emailed that a term's results are out. */
  notices: { studentId: string; termId: string }[];
  /** Term labels, newest first. */
  terms: { id: string; label: string }[];
};

export function summariseRecords(input: OverviewInput) {
  const byProgramme = new Map<string, number>();
  for (const student of input.students) {
    if (student.status !== "active") continue;
    byProgramme.set(student.programme, (byProgramme.get(student.programme) ?? 0) + 1);
  }

  const notified = new Set(input.notices.map((n) => `${n.termId}:${n.studentId}`));
  const waiting = new Map<string, Set<string>>();
  for (const grade of input.publishedGrades) {
    if (notified.has(`${grade.termId}:${grade.studentId}`)) continue;
    const set = waiting.get(grade.termId) ?? new Set<string>();
    set.add(grade.studentId);
    waiting.set(grade.termId, set);
  }
  const resultsEmails = input.terms.flatMap((term) => {
    const students = waiting.get(term.id)?.size ?? 0;
    return students > 0 ? [{ termId: term.id, label: term.label, students }] : [];
  });

  const unpublishedTerms = new Set(input.unpublishedGrades.map((grade) => grade.termId));
  const submitted = input.unpublishedGrades.filter((grade) => grade.status === "submitted");
  const submittedTerms = new Set(submitted.map((grade) => grade.termId));
  const firstTermWithDrafts = input.terms.find((term) => unpublishedTerms.has(term.id))?.id ?? null;
  const firstTermAwaiting = input.terms.find((term) => submittedTerms.has(term.id))?.id ?? null;

  return {
    activeStudents: [...byProgramme.values()].reduce((sum, count) => sum + count, 0),
    studentsByProgramme: [...byProgramme.entries()]
      .map(([programme, count]) => ({ programme, count }))
      .sort((a, b) => b.count - a.count || a.programme.localeCompare(b.programme)),
    unpublishedGrades: input.unpublishedGrades.length,
    awaitingApproval: submitted.length,
    firstTermWithDrafts,
    firstTermAwaiting,
    resultsEmails,
  };
}
