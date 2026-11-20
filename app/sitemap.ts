import type { MetadataRoute } from "next";

import { getPublishedProgrammes } from "@/lib/queries/programmes";
import { sitemapEntries } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

/** /sitemap.xml: public pages and published programmes (cached with the programmes tag). */
async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const programmes = await getPublishedProgrammes();
  return sitemapEntries(
    siteUrl(),
    programmes.map((programme) => programme.slug),
  );
}

export default sitemap;
