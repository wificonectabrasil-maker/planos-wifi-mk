import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site/url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();
  const allowIndexing = process.env.VERCEL_ENV !== "preview" && process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false";

  return {
    rules: [
      {
        userAgent: "*",
        ...(allowIndexing ? { allow: "/", disallow: ["/admin", "/api", "/wp-json"] } : { disallow: "/" }),
      },
    ],
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
