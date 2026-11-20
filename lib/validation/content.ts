import { z } from "zod";

import { parseDriveLink, parseYouTubeId } from "@/lib/links";

// Course content forms (Stage 3, step 3.2). Lecturers paste links; these
// schemas keep only the IDs (lib/links.ts), which is all the database stores.
// Pure; tested in content.test.ts.

const title = z
  .string()
  .trim()
  .min(1, "Give it a title.")
  .max(200, "Keep the title under 200 characters.");

/** An optional YouTube link → its video ID, or null when left empty. */
const youTubeLink = z
  .string()
  .trim()
  .max(2000)
  .transform((value, ctx) => {
    if (value === "") return null;
    const id = parseYouTubeId(value);
    if (!id) {
      ctx.addIssue({
        code: "custom",
        message: "Paste the video's YouTube link, like https://youtu.be/…",
      });
      return z.NEVER;
    }
    return id;
  });

/** A required Google Drive, Docs, Slides or Sheets link → its kind and file ID. */
const driveLink = z
  .string()
  .trim()
  .min(1, "Paste the file's Google Drive link.")
  .max(2000)
  .transform((value, ctx) => {
    const file = parseDriveLink(value);
    if (!file) {
      ctx.addIssue({
        code: "custom",
        message:
          "That is not a link to one Google Drive file. In Drive, choose Share → Copy link on the file (not a folder).",
      });
      return z.NEVER;
    }
    return file;
  });

export const lessonSchema = z.object({
  title,
  body: z.string().trim().max(5000, "Keep the notes under 5,000 characters.").default(""),
  youtubeLink: youTubeLink.prefault(""),
});

export type LessonValues = z.input<typeof lessonSchema>;

export const materialSchema = z.object({
  title,
  driveLink,
  lessonId: z
    .union([z.guid(), z.literal("")])
    .transform((value) => value || null)
    .prefault(""),
});

export type MaterialValues = z.input<typeof materialSchema>;

export const scheduleSchema = z.object({
  title,
  termId: z.guid("Choose the term."),
  driveLink,
});

export type ScheduleValues = z.input<typeof scheduleSchema>;
