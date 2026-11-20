// What search engines may crawl (Stage 3, step 3.6). Pure; tested in seo.test.ts.

/** Public pages, in the order they appear in the sitemap. */
export const PUBLIC_PATHS = [
  "/",
  "/about",
  "/academics",
  "/admissions",
  "/contact",
  "/statement-of-faith",
  "/privacy",
] as const;

/**
 * Never crawled: signed-in areas, account pages, auth links, API and cron
 * routes. robots.txt is a request, not access control: every one of these is
 * protected by the proxy, requireRole() and RLS.
 */
export const DISALLOWED_PATHS = [
  "/admin",
  "/portal",
  "/teach",
  "/apply",
  "/materials",
  "/schedules",
  "/sign-in",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api",
] as const;

export type SitemapEntry = {
  url: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
};

/** Sitemap entries for the public pages and each published programme. */
export function sitemapEntries(baseUrl: string, programmeSlugs: readonly string[]): SitemapEntry[] {
  const base = baseUrl.replace(/\/$/, "");
  const pages: SitemapEntry[] = PUBLIC_PATHS.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    changeFrequency: path === "/privacy" || path === "/statement-of-faith" ? "yearly" : "monthly",
    priority: path === "/" ? 1 : path === "/academics" || path === "/admissions" ? 0.9 : 0.6,
  }));
  const programmes: SitemapEntry[] = programmeSlugs.map((slug) => ({
    url: `${base}/academics/${encodeURIComponent(slug)}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [...pages, ...programmes];
}
