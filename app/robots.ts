import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site/url";
import { publicIndexingAllowed } from "@/lib/site/indexing";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();
  const allowIndexing = publicIndexingAllowed();

  return {
    rules: [
      {
        userAgent: "*",
        ...(allowIndexing ? { allow: "/", disallow: ["/admin", "/api", "/wp-json"] } : { disallow: "/" }),
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
