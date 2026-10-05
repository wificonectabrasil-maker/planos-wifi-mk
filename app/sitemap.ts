import type { MetadataRoute } from "next";
import { listAllPostSitemapEntries, getPublicSilos } from "@/lib/db";
import { resolveSiteUrl } from "@/lib/site/url";
import { commercialPaths } from "@/lib/telecom/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolveSiteUrl();

  const [silos, posts] = await Promise.all([getPublicSilos(), listAllPostSitemapEntries()]);

  const now = new Date();
  const silosWithPublishedPosts = new Set(posts.map((post) => post.silo).filter(Boolean));

  const base: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now },
    { url: `${siteUrl}/sobre`, lastModified: now },
    { url: `${siteUrl}/colaboradores`, lastModified: now },
    { url: `${siteUrl}/contato`, lastModified: now },
    { url: `${siteUrl}/afiliados`, lastModified: now },
    { url: `${siteUrl}/politica-de-privacidade`, lastModified: now },
    { url: `${siteUrl}/politica-editorial`, lastModified: now },
    { url: `${siteUrl}/politica-de-afiliados`, lastModified: now },
    ...commercialPaths.filter(path => path !== "/consultar").map(path => ({ url: `${siteUrl}${path}`, lastModified: now })),
  ];

  const siloUrls = silos
    .filter((s) => silosWithPublishedPosts.has(s.slug))
    .map((s) => ({
      url: `${siteUrl}/${s.slug}`,
      lastModified: now,
    }));

  const postUrls = posts.map((p) => ({
    url: `${siteUrl}/${p.silo}/${p.slug}`,
    lastModified: p.lastModified ? new Date(p.lastModified) : now,
  }));

  return [...base, ...siloUrls, ...postUrls];
}
