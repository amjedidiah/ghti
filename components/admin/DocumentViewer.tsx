"use client";

import { Eye, ExternalLink, FileText, X } from "lucide-react";
import { useState } from "react";

import { DOCUMENT_LABELS } from "@/lib/applications/labels";
import { formatBytes } from "@/lib/files";
import type { Database } from "@/lib/supabase/database.types";

type Doc = {
  id: string;
  kind: Database["public"]["Enums"]["document_kind"];
  file_name: string;
  size_bytes: number;
};

/**
 * Applicant documents for reviewers. Every preview or open goes through
 * /admin/documents/[id], which logs the view and redirects to a signed URL
 * that expires after 10 minutes. Nothing loads until the admin asks.
 */
function DocumentViewer({ documents }: { documents: Doc[] }) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = documents.find((doc) => doc.id === previewId);

  if (documents.length === 0) {
    return <p className="text-sm text-secondary">No documents uploaded.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border">
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3">
            <FileText className="size-5 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">{DOCUMENT_LABELS[doc.kind]}</p>
              <p className="truncate text-xs text-secondary">
                {doc.file_name} · {formatBytes(doc.size_bytes)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewId(doc.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
              >
                <Eye className="size-4" aria-hidden />
                Preview
              </button>
              <a
                href={`/admin/documents/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
                aria-label={`Open ${DOCUMENT_LABELS[doc.kind]} in a new tab`}
              >
                <ExternalLink className="size-4" aria-hidden />
                Open
              </a>
            </div>
          </li>
        ))}
      </ul>

      {preview && (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2">
            <p className="truncate text-sm font-semibold text-primary">
              {DOCUMENT_LABELS[preview.kind]}
            </p>
            <button
              type="button"
              onClick={() => setPreviewId(null)}
              className="inline-flex size-9 items-center justify-center rounded-md text-secondary hover:bg-card hover:text-primary"
              aria-label="Close preview"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <iframe
            key={preview.id}
            src={`/admin/documents/${preview.id}`}
            title={`${DOCUMENT_LABELS[preview.kind]}: ${preview.file_name}`}
            className="h-[70vh] w-full bg-card"
          />
        </div>
      )}
      <p className="text-xs text-secondary">
        Each time a document is opened, it is recorded with your name and the time.
      </p>
    </div>
  );
}

export default DocumentViewer;
