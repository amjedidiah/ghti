// Upload rules for applicant documents (private `documents` bucket).
// Must match the bucket settings and the documents table checks in
// supabase/migrations/*_applications.sql.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXTENSIONS: Record<AllowedMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Photos larger than this are resized and re-encoded in the browser before upload. */
export const COMPRESS_ABOVE_BYTES = 1024 * 1024;
/** Longest side of a compressed photo, in pixels: still sharp enough to read a document. */
export const MAX_IMAGE_DIMENSION = 2000;

export function isAllowedMimeType(type: string): type is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

export function extensionFor(type: AllowedMimeType): string {
  return EXTENSIONS[type];
}

/** A plain-English reason the file cannot be uploaded, or null when it is fine. */
export function fileProblem(file: { type: string; size: number }): string | null {
  if (!isAllowedMimeType(file.type)) {
    return "Upload a PDF, JPG or PNG file.";
  }
  if (file.size === 0) return "That file is empty. Choose another one.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is 5 MB: scan at a lower resolution or upload a photo instead.`;
  }
  return null;
}

/** Scale (width, height) so the longest side is at most `max`, keeping the aspect ratio. */
export function scaledDimensions(width: number, height: number, max = MAX_IMAGE_DIMENSION) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const ratio = max / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The folder for documents admins add to a student's file (no application). */
export const RECORDS_FOLDER = "records";

/**
 * Storage path for a document: {owner_id}/{folder}/{uuid}.{ext}, where the
 * folder is the application's ID, or RECORDS_FOLDER on a student's file.
 */
export function documentPath(ownerId: string, folder: string, id: string, type: AllowedMimeType) {
  return `${ownerId}/${folder}/${id}.${extensionFor(type)}`;
}

/** Does `path` belong in this owner's folder (an application ID or RECORDS_FOLDER)? */
export function isDocumentPathFor(path: string, ownerId: string, folder: string): boolean {
  const pattern = /^([0-9a-f-]{36})\/([0-9a-f-]{36}|records)\/[0-9a-f-]{36}\.(pdf|jpg|png)$/;
  const match = pattern.exec(path);
  return Boolean(match && match[1] === ownerId && match[2] === folder);
}
