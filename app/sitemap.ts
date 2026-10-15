import type { MetadataRoute } from "next";
import { listAllPostSitemapEntries, getPublicSilos } from "@/lib/db";
import { resolveSiteUrl } from "@/lib/site/url";
import { commercialPaths } from "@/lib/telecom/catalog";
import { buildPublicSitemap } from "@/lib/seo/sitemap";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolveSiteUrl();

  const [silos, posts] = await Promise.all([getPublicSilos(), listAllPostSitemapEntries()]);

  const staticPaths = [
    "/",
    "/sobre",
    "/colaboradores",
    "/contato",
    "/afiliados",
    "/politica-de-privacidade",
    "/politica-editorial",
    "/politica-de-afiliados",
    ...commercialPaths,
  ];
  return buildPublicSitemap({ siteUrl, staticPaths, silos, posts });
}
