"use client";

import { FileText, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";

import { errorId, hintId } from "@/components/forms/Field";
import type { RecordedDocument } from "@/lib/applications/actions";
import { fileProblem, formatBytes, isAllowedMimeType, type AllowedMimeType } from "@/lib/files";
import { compressImage, UploadError, uploadWithProgress } from "@/lib/upload-browser";
import { cn } from "@/lib/utils";

type State =
  | { step: "idle" }
  | { step: "preparing" }
  | { step: "uploading"; progress: number }
  | { step: "saving" };

export type UploadedFile = {
  path: string;
  fileName: string;
  sizeBytes: number;
  mime: AllowedMimeType;
};

/**
 * Upload documents into one slot (FileDrop): choose or drop a file, check type
 * and size, compress photos, upload with progress straight to Storage, record
 * it, and allow removal. A slot holds up to `max` files; with 1, a new file
 * replaces the old one. The parent keeps the list (so it survives moving
 * between steps) and supplies where files go and how they are recorded, so
 * applicants and admins share this control.
 */
function DocumentUpload({
  pathFor,
  record,
  remove,
  label,
  hint,
  required,
  max = 1,
  documents,
  onChange,
  error: externalError,
}: {
  /** Storage path for a new file (a fresh UUID and its type). */
  pathFor: (id: string, type: AllowedMimeType) => string;
  record: (
    file: UploadedFile,
  ) => Promise<{ ok: true; document: RecordedDocument } | { ok: false; message: string }>;
  remove: (documentId: string) => Promise<{ ok: boolean }>;
  label: string;
  hint: ReactNode;
  /** Whether the slot must be filled; omit it to show neither "(required)" nor "(optional)". */
  required?: boolean;
  max?: number;
  documents: RecordedDocument[];
  onChange: (documents: RecordedDocument[]) => void;
  error?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = state.step !== "idle" || removing !== null;
  const room = documents.length < max;
  const shownError = error ?? (documents.length > 0 ? null : externalError);

  async function handleFile(original: File) {
    setError(null);
    if (!isAllowedMimeType(original.type)) return setError("Upload a PDF, JPG or PNG file.");

    setState({ step: "preparing" });
    const file = await compressImage(original);
    const problem = fileProblem(file);
    if (problem || !isAllowedMimeType(file.type)) {
      setState({ step: "idle" });
      return setError(problem ?? "Upload a PDF, JPG or PNG file.");
    }

    const type = file.type as AllowedMimeType;
    const path = pathFor(crypto.randomUUID(), type);
    try {
      setState({ step: "uploading", progress: 0 });
      await uploadWithProgress({
        path,
        file,
        onProgress: (progress) => setState({ step: "uploading", progress }),
      });
      setState({ step: "saving" });
      const result = await record({
        path,
        fileName: file.name.slice(0, 200),
        sizeBytes: file.size,
        mime: type,
      });
      if (!result.ok) throw new UploadError(result.message);
      onChange(max === 1 ? [result.document] : [...documents, result.document]);
    } catch (caught) {
      setError(
        caught instanceof UploadError
          ? caught.message
          : "The upload failed. Check your connection and try again.",
      );
    } finally {
      setState({ step: "idle" });
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(document: RecordedDocument) {
    setError(null);
    setRemoving(document.id);
    const result = await remove(document.id);
    setRemoving(null);
    if (result.ok) onChange(documents.filter((doc) => doc.id !== document.id));
    else setError("We could not remove that file. Refresh the page and try again.");
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) void handleFile(file);
  }

  return (
    <div>
      <p id={`${inputId}-label`} className="block text-sm font-semibold text-primary">
        {label}{" "}
        <span className="font-normal text-secondary">
          {required !== undefined && (required ? "(required)" : "(optional)")}
          {max > 1 && `, up to ${max} files`}
        </span>
      </p>
      <div id={hintId(inputId)} className="mt-1 text-sm text-secondary">
        {hint}
      </div>

      {documents.length > 0 && (
        <ul className="mt-2 space-y-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-3 rounded-md border border-border bg-muted p-3"
            >
              <FileText className="size-6 shrink-0 text-brand" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">{document.fileName}</p>
                <p className="text-xs text-secondary">
                  {formatBytes(document.sizeBytes)} · Uploaded
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(document)}
                disabled={busy}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-card hover:text-danger disabled:opacity-50"
                aria-label={`Remove ${document.fileName}`}
              >
                {removing === document.id ? (
                  <LoaderCircle className="size-5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-5" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {room && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "mt-2 rounded-md border-2 border-dashed p-5 text-center transition-colors",
            dragging ? "border-brand bg-brand/5" : "border-border bg-bg",
            shownError && "border-danger",
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
            className="sr-only"
            disabled={busy}
            aria-labelledby={`${inputId}-label`}
            aria-describedby={[hintId(inputId), shownError ? errorId(inputId) : null]
              .filter(Boolean)
              .join(" ")}
            aria-invalid={Boolean(shownError)}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {state.step !== "idle" ? (
            <div role="status" className="space-y-2">
              <p className="text-sm font-medium text-primary">
                {state.step === "preparing" && "Preparing your file…"}
                {state.step === "uploading" && `Uploading… ${Math.round(state.progress * 100)}%`}
                {state.step === "saving" && "Saving…"}
              </p>
              <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-brand transition-[width]"
                  style={{
                    width: `${state.step === "uploading" ? Math.round(state.progress * 100) : state.step === "saving" ? 100 : 5}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center gap-2">
              <Upload className="size-6 text-secondary" aria-hidden />
              <span className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted">
                {documents.length > 0 ? "Add another file" : "Choose file or take a photo"}
              </span>
              <span className="text-xs text-secondary">PDF, JPG or PNG, up to 5 MB</span>
            </label>
          )}
        </div>
      )}

      {shownError && (
        <p id={errorId(inputId)} role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {shownError}
        </p>
      )}
    </div>
  );
}

export default DocumentUpload;
