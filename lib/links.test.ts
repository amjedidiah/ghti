import { describe, expect, test } from "bun:test";

import { driveViewUrl, parseDriveLink, parseYouTubeId, youTubeEmbedUrl } from "@/lib/links";

const VIDEO = "dQw4w9WgXcQ";
const FILE = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("parseYouTubeId", () => {
  test.each([
    `https://youtu.be/${VIDEO}`,
    `https://youtu.be/${VIDEO}?si=share-tracking&t=42`,
    `https://www.youtube.com/watch?v=${VIDEO}`,
    `https://www.youtube.com/watch?feature=shared&v=${VIDEO}&list=PL123`,
    `https://m.youtube.com/watch?v=${VIDEO}`,
    `https://www.youtube.com/live/${VIDEO}?si=x`,
    `https://www.youtube.com/embed/${VIDEO}`,
    `https://www.youtube-nocookie.com/embed/${VIDEO}`,
    `https://youtube.com/shorts/${VIDEO}`,
    `youtube.com/watch?v=${VIDEO}`,
    `  www.youtube.com/watch?v=${VIDEO}  `,
  ])("finds the ID in %s", (link) => {
    expect(parseYouTubeId(link)).toBe(VIDEO);
  });

  test.each([
    "",
    "not a link",
    "https://www.youtube.com/",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/@charismaticrenewalministries",
    "https://www.youtube.com/playlist?list=PL123",
    `https://evil.example/watch?v=${VIDEO}`,
    `https://youtube.com.evil.example/watch?v=${VIDEO}`,
    `javascript:alert('${VIDEO}')`,
    `ftp://youtu.be/${VIDEO}`,
  ])("rejects %p", (link) => {
    expect(parseYouTubeId(link)).toBeNull();
  });
});

describe("parseDriveLink", () => {
  test.each([
    [`https://drive.google.com/file/d/${FILE}/view?usp=sharing`, "file"],
    [`https://drive.google.com/file/d/${FILE}`, "file"],
    [`https://drive.google.com/u/0/file/d/${FILE}/view`, "file"],
    [`https://drive.google.com/open?id=${FILE}`, "file"],
    [`https://drive.google.com/uc?id=${FILE}&export=download`, "file"],
    [`https://docs.google.com/document/d/${FILE}/edit?usp=sharing`, "document"],
    [`https://docs.google.com/presentation/d/${FILE}/edit#slide=id.p`, "presentation"],
    [`https://docs.google.com/spreadsheets/d/${FILE}/edit`, "spreadsheet"],
    [`drive.google.com/file/d/${FILE}/view`, "file"],
  ] as const)("finds the file in %s", (link, kind) => {
    expect(parseDriveLink(link)).toEqual({ kind, id: FILE });
  });

  test.each([
    "",
    "https://drive.google.com/",
    `https://drive.google.com/drive/folders/${FILE}`,
    "https://drive.google.com/file/d/tooShort/view",
    `https://docs.google.com/forms/d/${FILE}/viewform`,
    `https://drive.google.com.evil.example/file/d/${FILE}/view`,
    `https://evil.example/file/d/${FILE}/view`,
    `https://drive.google.com/open?id=${FILE}%22%3E`,
  ])("rejects %p", (link) => {
    expect(parseDriveLink(link)).toBeNull();
  });
});

describe("building links from stored IDs", () => {
  test("privacy-enhanced YouTube embed", () => {
    expect(youTubeEmbedUrl(VIDEO)).toBe(
      `https://www.youtube-nocookie.com/embed/${VIDEO}?rel=0&cc_load_policy=1`,
    );
    expect(() => youTubeEmbedUrl("../../evil")).toThrow();
  });

  test("Drive view links by kind", () => {
    expect(driveViewUrl("file", FILE)).toBe(`https://drive.google.com/file/d/${FILE}/view`);
    expect(driveViewUrl("presentation", FILE)).toBe(
      `https://docs.google.com/presentation/d/${FILE}/view`,
    );
    expect(() => driveViewUrl("file", "x/../y")).toThrow();
  });
});
