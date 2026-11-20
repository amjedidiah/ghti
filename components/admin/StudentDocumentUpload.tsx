"use client";

import { useId, useState } from "react";

import DocumentUpload, { type UploadedFile } from "@/components/applications/DocumentUpload";
import Field from "@/components/forms/Field";
import Select from "@/components/forms/Select";
import type { RecordedDocument } from "@/lib/applications/actions";
import { DOCUMENT_LABELS } from "@/lib/applications/labels";
import { documentPath, RECORDS_FOLDER } from "@/lib/files";
import { STUDENT_DOCUMENT_KINDS } from "@/lib/validation/students";

type Kind = (typeof STUDENT_DOCUMENT_KINDS)[number];

/**
 * Add a document to a student's file: choose what it is, then the file. It
 * uploads to the student's records folder; the page then lists it above.
 */
function StudentDocumentUpload({
  studentId,
  record,
  remove,
}: {
  studentId: string;
  record: (
    input: UploadedFile & { kind: Kind },
  ) => Promise<{ ok: true; document: RecordedDocument } | { ok: false; message: string }>;
  remove: (documentId: string) => Promise<{ ok: boolean }>;
}) {
  const id = useId();
  const [kind, setKind] = useState<Kind>("other");

  return (
    <div className="space-y-4 border-t border-border pt-5">
      <Field id={id} label="Add a document: what is it?">
        <Select id={id} value={kind} onChange={(event) => setKind(event.target.value as Kind)}>
          {STUDENT_DOCUMENT_KINDS.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
      <DocumentUpload
        label="File"
        hint="It goes on this student's file, and a note says you added it."
        // The page lists added documents; this control always offers a new upload.
        documents={[]}
        onChange={() => {}}
        pathFor={(fileId, type) => documentPath(studentId, RECORDS_FOLDER, fileId, type)}
        record={(file) => record({ ...file, kind })}
        remove={remove}
      />
    </div>
  );
}

export default StudentDocumentUpload;
