// YouTube and Google Drive links for course content (Stage 3, step 3.2).
// Lecturers paste links; we store only the ID (youtube_id, drive_file_id),
// never the raw URL, and rebuild links ourselves. Anything that does not
// parse is rejected. Pure; tested in links.test.ts.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
/** Drive and Docs IDs: long URL-safe strings (usually 33 or 44 characters). */
const DRIVE_ID = /^[A-Za-z0-9_-]{20,100}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

function parseUrl(input: string): URL | null {
  const text = input.trim();
  if (!text || text.length > 2000) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * The 11-character video ID from a YouTube link, or null. Accepts youtu.be/ID,
 * watch?v=ID, /live/ID, /embed/ID, /shorts/ID and /v/ID, with or without
 * "https://" and "www.".
 */
export function parseYouTubeId(input: string): string | null {
  const url = parseUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  let id: string | null | undefined = null;
  if (host === "youtu.be" || host === "www.youtu.be") {
    id = segments[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === "watch") id = url.searchParams.get("v");
    else if (["live", "embed", "shorts", "v"].includes(segments[0] ?? "")) id = segments[1];
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

export type DriveKind = "file" | "document" | "presentation" | "spreadsheet";

const DOCS_KINDS: Record<string, DriveKind> = {
  document: "document",
  presentation: "presentation",
  spreadsheets: "spreadsheet",
  file: "file",
};

/**
 * The file ID (and kind) from a Google Drive or Docs link, or null. Accepts
 * drive.google.com/file/d/ID/…, drive.google.com/open?id=ID, …/uc?id=ID and
 * docs.google.com/{document,presentation,spreadsheets}/d/ID/…. Folder links are
 * refused: materials point at one file.
 */
export function parseDriveLink(input: string): { kind: DriveKind; id: string } | null {
  const url = parseUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  let kind: DriveKind | null = null;
  let id: string | null | undefined = null;

  if (host === "drive.google.com") {
    // Ignore a leading /u/0/ (signed-in with several accounts).
    const parts = segments[0] === "u" ? segments.slice(2) : segments;
    if (parts[0] === "file" && parts[1] === "d") {
      kind = "file";
      id = parts[2];
    } else if (parts[0] === "open" || parts[0] === "uc") {
      kind = "file";
      id = url.searchParams.get("id");
    }
  } else if (host === "docs.google.com") {
    const parts = segments[0] === "u" ? segments.slice(2) : segments;
    const docsKind = DOCS_KINDS[parts[0] ?? ""];
    if (docsKind && parts[1] === "d") {
      kind = docsKind;
      id = parts[2];
    }
  }

  return kind && id && DRIVE_ID.test(id) ? { kind, id } : null;
}

/**
 * Privacy-enhanced embed for a stored video ID: no YouTube cookies until the
 * viewer plays it, related videos from the same channel only, and captions
 * shown by default where the video has them.
 */
export function youTubeEmbedUrl(id: string): string {
  if (!YOUTUBE_ID.test(id)) throw new Error("Not a YouTube video ID");
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&cc_load_policy=1`;
}

/** Where /materials/[id] redirects after its access check. */
export function driveViewUrl(kind: DriveKind, id: string): string {
  if (!DRIVE_ID.test(id)) throw new Error("Not a Drive file ID");
  switch (kind) {
    case "document":
      return `https://docs.google.com/document/d/${id}/view`;
    case "presentation":
      return `https://docs.google.com/presentation/d/${id}/view`;
    case "spreadsheet":
      return `https://docs.google.com/spreadsheets/d/${id}/view`;
    default:
      return `https://drive.google.com/file/d/${id}/view`;
  }
}
