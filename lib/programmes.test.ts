import { describe, expect, test } from "bun:test";

import { groupProgrammesByLevel, toParagraphs, type ProgrammeLevel } from "@/lib/programmes";

function programme(slug: string, level: ProgrammeLevel) {
  return { slug, level };
}

describe("groupProgrammesByLevel", () => {
  test("orders groups certificate, diploma, postgraduate diploma regardless of input order", () => {
    const groups = groupProgrammesByLevel([
      programme("pgd", "postgraduate_diploma"),
      programme("cert", "certificate"),
      programme("dip", "diploma"),
    ]);
    expect(groups.map((group) => group.level)).toEqual([
      "certificate",
      "diploma",
      "postgraduate_diploma",
    ]);
  });

  test("leaves out levels with no programmes", () => {
    const groups = groupProgrammesByLevel([programme("dip", "diploma")]);
    expect(groups).toEqual([{ level: "diploma", programmes: [programme("dip", "diploma")] }]);
  });

  test("keeps incoming order within a level", () => {
    const groups = groupProgrammesByLevel([
      programme("dip-2", "diploma"),
      programme("dip-1", "diploma"),
    ]);
    expect(groups[0]?.programmes.map((p) => p.slug)).toEqual(["dip-2", "dip-1"]);
  });

  test("returns no groups for no programmes", () => {
    expect(groupProgrammesByLevel([])).toEqual([]);
  });
});

describe("toParagraphs", () => {
  test("splits on blank lines and trims", () => {
    expect(toParagraphs("  First.\n\n Second.\n   \nThird.  ")).toEqual([
      "First.",
      "Second.",
      "Third.",
    ]);
  });

  test("keeps single line breaks inside a paragraph", () => {
    expect(toParagraphs("Line one\nline two")).toEqual(["Line one\nline two"]);
  });

  test("returns nothing for empty text", () => {
    expect(toParagraphs("   ")).toEqual([]);
  });
});
