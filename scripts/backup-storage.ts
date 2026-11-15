/**
 * Download every file in the private `documents` bucket into a folder, for
 * the weekly encrypted backup (development plan, step 1.5: Backups). Run by
 * the workflow in the private amjedidiah/ghti-backups repository.
 *
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... bun scripts/backup-storage.ts <out-dir>
 *
 * Uses the Storage REST API directly (no dependencies). Prints counts only,
 * never file names or paths: they contain user IDs.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const BUCKET = "documents";
const PAGE = 1000;

const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SECRET_KEY;
const outDir = process.argv[2];

if (!url || !key || !outDir) {
  console.error(
    "Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... bun scripts/backup-storage.ts <out-dir>",
  );
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

type Entry = { name: string; id: string | null };

async function list(prefix: string): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const response = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix,
        limit: PAGE,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    });
    if (!response.ok) throw new Error(`List failed: HTTP ${response.status}`);
    const page = (await response.json()) as Entry[];
    entries.push(...page);
    if (page.length < PAGE) return entries;
  }
}

/** Every file path in the bucket. Folders come back with id = null. */
async function walk(prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await list(prefix)) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) files.push(...(await walk(path)));
    else if (entry.name !== ".emptyFolderPlaceholder") files.push(path);
  }
  return files;
}

const files = await walk();
let bytes = 0;

for (const path of files) {
  const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, { headers });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  const target = join(outDir, BUCKET, path);
  await mkdir(dirname(target), { recursive: true });
  await Bun.write(target, data);
  bytes += data.byteLength;
}

console.log(`Backed up ${files.length} file(s), ${(bytes / 1024 / 1024).toFixed(2)} MB.`);
