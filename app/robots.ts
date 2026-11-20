import type { MetadataRoute } from "next";

import { DISALLOWED_PATHS } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

/**
 * /robots.txt. Production allows the public pages; preview deployments (and
 * anything that is not the canonical site) ask crawlers to stay away
 * entirely, so previews never compete with the real site in search results.
 */
function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  const production = process.env.VERCEL_ENV === "production" || !process.env.VERCEL_ENV;
  return production
    ? {
        rules: { userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] },
        sitemap: `${base}/sitemap.xml`,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}

export default robots;
