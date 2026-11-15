"use client";

import { FileText, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";

import { errorId, hintId } from "@/components/forms/Field";
import { recordDocument, removeDocument, type RecordedDocument } from "@/lib/applications/actions";
import { documentPath, fileProblem, formatBytes, isAllowedMimeType } from "@/lib/files";
import { compressImage, UploadError, uploadWithProgress } from "@/lib/upload-browser";
import { cn } from "@/lib/utils";

type Kind = "transcript" | "id_card" | "photo";

type State =
  | { step: "idle" }
  | { step: "preparing" }
  | { step: "uploading"; progress: number }
  | { step: "saving" };

/**
 * Upload one document (FileDrop): choose or drop a file, check type and size,
 * compress photos, upload with progress, record it, and allow removal.
 */
function DocumentUpload({
  applicationId,
  ownerId,
  kind,
  label,
  hint,
  required,
  initial,
  error: externalError,
}: {
  applicationId: string;
  ownerId: string;
  kind: Kind;
  label: string;
  hint: string;
  required?: boolean;
  initial: RecordedDocument | null;
  error?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [document, setDocument] = useState<RecordedDocument | null>(initial);
  const [state, setState] = useState<State>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = state.step !== "idle";
  const shownError = error ?? (document ? null : externalError);

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

    const path = documentPath(ownerId, applicationId, crypto.randomUUID(), file.type);
    try {
      setState({ step: "uploading", progress: 0 });
      await uploadWithProgress({
        path,
        file,
        onProgress: (progress) => setState({ step: "uploading", progress }),
      });
      setState({ step: "saving" });
      const result = await recordDocument({
        applicationId,
        kind,
        path,
        fileName: file.name.slice(0, 200),
        sizeBytes: file.size,
        mime: file.type,
      });
      if (!result.ok) throw new UploadError(result.message);
      setDocument(result.document);
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

  async function handleRemove() {
    if (!document) return;
    setError(null);
    setState({ step: "saving" });
    const result = await removeDocument(document.id);
    setState({ step: "idle" });
    if (result.ok) setDocument(null);
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
        <span className="font-normal text-secondary">{required ? "(required)" : "(optional)"}</span>
      </p>
      <p id={hintId(inputId)} className="mt-1 text-sm text-secondary">
        {hint}
      </p>

      {document ? (
        <div className="mt-2 flex items-center gap-3 rounded-md border border-border bg-muted p-3">
          <FileText className="size-6 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary">{document.fileName}</p>
            <p className="text-xs text-secondary">{formatBytes(document.sizeBytes)} · Uploaded</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-card hover:text-danger disabled:opacity-50"
            aria-label={`Remove ${document.fileName}`}
          >
            {busy ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-5" aria-hidden />
            )}
          </button>
        </div>
      ) : (
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
          {busy ? (
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
                Choose file or take a photo
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
