import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import DocumentViewer from "@/components/admin/DocumentViewer";
import RecordNoteForm from "@/components/admin/RecordNoteForm";
import ResolveChangeRequestForm from "@/components/admin/ResolveChangeRequestForm";
import StudentDocumentUpload from "@/components/admin/StudentDocumentUpload";
import StudentStatusForm from "@/components/admin/StudentStatusForm";
import ApplicationDetails, {
  detailsOf,
  Panel,
  Rows,
} from "@/components/applications/ApplicationDetails";
import ChangeRequestList from "@/components/records/ChangeRequestList";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  addRecordNote,
  changeStudentStatus,
  recordStudentDocument,
  removeStudentDocument,
  resolveChangeRequest,
} from "@/lib/admin/students";
import { requireRole } from "@/lib/auth/session";
import { formatGpa } from "@/lib/grades";
import { LEVEL_LABELS } from "@/lib/programmes";
import { getStudentFile, type StudentFile } from "@/lib/queries/admin-students";
import { studentFileResults, type AdminCourseResult } from "@/lib/student-file";
import { cn } from "@/lib/utils";
import { termLabel } from "@/lib/validation/academics";

// Generic title on purpose: student names never go in titles, URLs or analytics.
export const metadata: Metadata = { title: "Student file", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function StudentFilePage({ params }: PageProps<"/admin/students/[id]">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading student file…</p>
      }
    >
      <StudentFileContent params={params} />
    </Suspense>
  );
}

async function StudentFileContent({ params }: Pick<PageProps<"/admin/students/[id]">, "params">) {
  await requireRole("admin");
  const { id } = await params;
  const file = /^[0-9a-f-]{36}$/.test(id) ? await getStudentFile(id) : null;
  if (!file) notFound();

  const { student, application, notes, fileDocuments, changeRequests } = file;
  const openRequests = changeRequests.filter((request) => request.status === "open").length;
  const results = studentFileResults(
    file.registrations.map((registration) => ({
      term: registration.offering?.term ?? null,
      course: registration.offering?.course ?? null,
      grade: registration.grade
        ? {
            total: registration.grade.total,
            letter: registration.grade.letter,
            grade_point: registration.grade.grade_point,
            status: registration.grade.status,
          }
        : null,
    })),
  );

  return (
    <>
      <div className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-primary"
          >
            <ChevronLeft className="size-4" aria-hidden />
            All students
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
              {student.profile?.full_name || "(no name)"}
            </h1>
            <StatusBadge status={student.status} />
          </div>
          <p className="mt-2 text-lg font-semibold break-all text-primary tabular-nums">
            {student.matric_no}
          </p>
          <p className="mt-1 text-sm text-secondary">
            {student.programme
              ? `${student.programme.title} (${LEVEL_LABELS[student.programme.level].singular})`
              : "No programme"}
            {student.entry_term ? ` · Entered ${termLabel(student.entry_term)}` : ""}
            {` · Enrolled ${dateFormat.format(new Date(student.created_at))}`}
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="space-y-6 lg:col-span-3">
          <Panel title="Courses and grades">
            <Results results={results} />
          </Panel>

          <Panel
            title={
              openRequests > 0 ? `Change requests (${openRequests} waiting)` : "Change requests"
            }
          >
            <ChangeRequestList
              requests={changeRequests}
              empty="The student has not asked for any changes."
              resolve={(requestId) => (
                <ResolveChangeRequestForm
                  action={resolveChangeRequest.bind(null, student.id, requestId)}
                />
              )}
            />
          </Panel>

          <Panel title="Notes">
            <RecordNoteForm action={addRecordNote.bind(null, student.id)} />
            <NotesLog notes={notes} />
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Panel title="Status">
            <StudentStatusForm
              current={student.status}
              action={changeStudentStatus.bind(null, student.id)}
            />
          </Panel>

          <Panel title="Documents">
            <div className="space-y-6">
              <section aria-labelledby="file-documents">
                <h3 id="file-documents" className="mb-2 text-sm font-semibold text-primary">
                  Added to this file
                </h3>
                <DocumentViewer
                  documents={fileDocuments}
                  empty="None yet."
                  onRemove={removeStudentDocument.bind(null, student.id)}
                />
              </section>
              <StudentDocumentUpload
                studentId={student.id}
                record={recordStudentDocument.bind(null, student.id)}
                remove={removeStudentDocument.bind(null, student.id)}
              />
              {application && (
                <section aria-labelledby="application-documents">
                  <h3
                    id="application-documents"
                    className="mb-2 text-sm font-semibold text-primary"
                  >
                    From the application
                  </h3>
                  <DocumentViewer documents={application.documents} />
                </section>
              )}
            </div>
          </Panel>

          {application ? (
            <ApplicationDetails {...detailsOf(application)} />
          ) : (
            <Panel title="Biodata">
              <Rows rows={[["Phone", student.profile?.phone ?? ""]]} />
              <p className="mt-4 text-sm text-secondary">
                This student was not enrolled from an online application, so there is no biodata on
                file.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

const GRADE_STATUS: Record<AdminCourseResult["status"], { label: string; className: string }> = {
  published: { label: "Published", className: "text-success" },
  submitted: { label: "Submitted", className: "text-accent-strong" },
  draft: { label: "Draft", className: "text-secondary" },
  none: { label: "No grade", className: "text-secondary" },
};

function Results({ results }: { results: ReturnType<typeof studentFileResults> }) {
  if (results.terms.length === 0) {
    return <p className="text-sm text-secondary">Not registered on any course yet.</p>;
  }
  return (
    <div className="space-y-6">
      <p className="text-sm text-secondary">
        CGPA{" "}
        <span className="text-base font-bold text-primary tabular-nums">
          {formatGpa(results.cgpa)}
        </span>{" "}
        from {results.unitsCounted} credit unit{results.unitsCounted === 1 ? "" : "s"}. GPA and CGPA
        count published grades only, as the student sees them.
      </p>
      {results.terms.map((term) => (
        <section key={term.termId} aria-label={term.label}>
          <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
            <h3 className="font-semibold text-primary">{term.label}</h3>
            <p className="shrink-0 text-sm text-secondary tabular-nums">
              GPA <span className="font-bold text-primary">{formatGpa(term.gpa)}</span>
            </p>
          </div>
          <ul className="divide-y divide-border">
            {term.courses.map((course) => (
              <li key={course.code} className="flex items-baseline justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-primary tabular-nums">
                    {course.code}{" "}
                    <span className="font-normal text-secondary">· {course.creditUnits} CU</span>
                  </span>
                  <span className="block text-sm text-secondary">{course.title}</span>
                </span>
                <span className="shrink-0 text-right text-sm">
                  <span className="block font-semibold text-primary tabular-nums">
                    {course.total === null ? "—" : `${course.total} ${course.letter ?? ""}`}
                  </span>
                  <span className={cn("block text-xs", GRADE_STATUS[course.status].className)}>
                    {GRADE_STATUS[course.status].label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const NOTE_KINDS = { status_change: "Status change", change_request: "Change request" } as const;

function NotesLog({ notes }: { notes: StudentFile["notes"] }) {
  if (notes.length === 0) {
    return <p className="mt-6 text-sm text-secondary">No notes yet.</p>;
  }
  return (
    <ol className="mt-6 space-y-4 border-t border-border pt-6">
      {notes.map((note) => (
        <li key={note.id} className="border-l-2 border-border pl-4">
          <p className="text-xs text-secondary">
            <time dateTime={note.created_at}>
              {dateTimeFormat.format(new Date(note.created_at))}
            </time>
            {" · "}
            {note.author?.full_name || "Unknown"}
            {note.kind !== "note" && (
              <span className="ml-2 font-semibold whitespace-nowrap text-accent-strong">
                {NOTE_KINDS[note.kind]}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm break-words whitespace-pre-line text-primary">{note.body}</p>
        </li>
      ))}
    </ol>
  );
}

export default StudentFilePage;
