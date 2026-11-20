import { describe, expect, test } from "bun:test";

import { lessonSchema, materialSchema, scheduleSchema } from "@/lib/validation/content";

const FILE = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const TERM = "11111111-2222-3333-4444-555555555555";

describe("lessonSchema", () => {
  test("keeps only the YouTube video ID", () => {
    expect(
      lessonSchema.parse({
        title: " Week 1 ",
        body: " Read John 1. ",
        youtubeLink: "https://youtu.be/dQw4w9WgXcQ?si=abc",
      }),
    ).toEqual({ title: "Week 1", body: "Read John 1.", youtubeLink: "dQw4w9WgXcQ" });
  });

  test("the video is optional", () => {
    expect(lessonSchema.parse({ title: "Week 1" })).toEqual({
      title: "Week 1",
      body: "",
      youtubeLink: null,
    });
  });

  test("a link that is not a YouTube video is refused with a helpful message", () => {
    const result = lessonSchema.safeParse({ title: "Week 1", youtubeLink: "https://vimeo.com/1" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("YouTube link");
  });
});

describe("materialSchema", () => {
  test("keeps the Drive kind and file ID; the lesson is optional", () => {
    expect(
      materialSchema.parse({
        title: "Slides",
        driveLink: `https://docs.google.com/presentation/d/${FILE}/edit`,
      }),
    ).toEqual({ title: "Slides", driveLink: { kind: "presentation", id: FILE }, lessonId: null });
  });

  test("a folder link is refused", () => {
    const result = materialSchema.safeParse({
      title: "All files",
      driveLink: `https://drive.google.com/drive/folders/${FILE}`,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("one Google Drive file");
  });
});

describe("scheduleSchema", () => {
  test("needs a term and a Drive file", () => {
    expect(
      scheduleSchema.parse({
        title: "Timetable",
        termId: TERM,
        driveLink: `https://drive.google.com/file/d/${FILE}/view`,
      }),
    ).toEqual({ title: "Timetable", termId: TERM, driveLink: { kind: "file", id: FILE } });
    expect(scheduleSchema.safeParse({ title: "T", termId: "", driveLink: "x" }).success).toBe(
      false,
    );
  });
});
