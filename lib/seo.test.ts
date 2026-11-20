import { describe, expect, test } from "bun:test";

import { DISALLOWED_PATHS, PUBLIC_PATHS, sitemapEntries } from "@/lib/seo";

describe("sitemapEntries", () => {
  test("lists the public pages, then each programme, on the canonical URL", () => {
    const entries = sitemapEntries("https://ghti.example.test/", [
      "certificate-in-theology",
      "ordinary-diploma-in-theology",
    ]);
    expect(entries[0]).toEqual({
      url: "https://ghti.example.test",
      changeFrequency: "monthly",
      priority: 1,
    });
    expect(entries.map((entry) => entry.url)).toContain("https://ghti.example.test/contact");
    expect(entries.slice(-2).map((entry) => entry.url)).toEqual([
      "https://ghti.example.test/academics/certificate-in-theology",
      "https://ghti.example.test/academics/ordinary-diploma-in-theology",
    ]);
  });

  test("no signed-in or account page ever appears in the sitemap", () => {
    const urls = sitemapEntries("https://ghti.example.test", ["x"]).map((entry) =>
      entry.url.replace("https://ghti.example.test", ""),
    );
    for (const blocked of DISALLOWED_PATHS) {
      expect(urls.some((url) => url === blocked || url.startsWith(`${blocked}/`))).toBe(false);
    }
  });

  test("public and blocked paths never overlap", () => {
    for (const path of PUBLIC_PATHS) {
      expect(DISALLOWED_PATHS.some((blocked) => path.startsWith(blocked))).toBe(false);
    }
  });
});
