import { describe, expect, test } from "bun:test";

import {
  MAX_UPLOAD_BYTES,
  documentPath,
  fileProblem,
  formatBytes,
  isDocumentPathFor,
  RECORDS_FOLDER,
  scaledDimensions,
} from "@/lib/files";

const owner = "11111111-1111-4111-8111-111111111111";
const application = "22222222-2222-4222-8222-222222222222";
const doc = "33333333-3333-4333-8333-333333333333";

describe("fileProblem", () => {
  test("accepts PDF, JPG and PNG within the limit", () => {
    expect(fileProblem({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(fileProblem({ type: "image/jpeg", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(fileProblem({ type: "image/png", size: 1 })).toBeNull();
  });

  test("rejects other types", () => {
    expect(fileProblem({ type: "image/heic", size: 1000 })).toBe("Upload a PDF, JPG or PNG file.");
    expect(fileProblem({ type: "application/msword", size: 1000 })).toBe(
      "Upload a PDF, JPG or PNG file.",
    );
  });

  test("rejects empty and oversized files with the size", () => {
    expect(fileProblem({ type: "application/pdf", size: 0 })).toBe(
      "That file is empty. Choose another one.",
    );
    expect(fileProblem({ type: "application/pdf", size: 7 * 1024 * 1024 })).toContain("7.0 MB");
  });
});

describe("scaledDimensions", () => {
  test("leaves small images alone", () => {
    expect(scaledDimensions(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  test("shrinks the longest side to the maximum, keeping the ratio", () => {
    expect(scaledDimensions(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(scaledDimensions(3000, 4000)).toEqual({ width: 1500, height: 2000 });
  });
});

describe("formatBytes", () => {
  test.each([
    [512, "512 B"],
    [2048, "2 KB"],
    [1572864, "1.5 MB"],
  ])("%d -> %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("document paths", () => {
  test("builds {owner}/{application}/{id}.{ext}", () => {
    expect(documentPath(owner, application, doc, "image/jpeg")).toBe(
      `${owner}/${application}/${doc}.jpg`,
    );
  });

  test("accepts only paths in the owner's folder for that application", () => {
    const path = documentPath(owner, application, doc, "application/pdf");
    expect(isDocumentPathFor(path, owner, application)).toBe(true);
    expect(isDocumentPathFor(path, application, owner)).toBe(false);
    expect(isDocumentPathFor(`${path}/../x.pdf`, owner, application)).toBe(false);
    expect(isDocumentPathFor(`${owner}/${application}/evil.exe`, owner, application)).toBe(false);
  });

  test("documents on a student's file go in their records folder", () => {
    const path = documentPath(owner, RECORDS_FOLDER, doc, "application/pdf");
    expect(path).toBe(`${owner}/records/${doc}.pdf`);
    expect(isDocumentPathFor(path, owner, RECORDS_FOLDER)).toBe(true);
    expect(isDocumentPathFor(path, owner, application)).toBe(false);
    expect(isDocumentPathFor(`${owner}/other/${doc}.pdf`, owner, "other")).toBe(false);
  });
});
