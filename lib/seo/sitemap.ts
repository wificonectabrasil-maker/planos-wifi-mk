import type { MetadataRoute } from "next";
import { buildCanonicalUrl, buildPostCanonicalPath, buildSiloCanonicalPath } from "./canonical";

export type PublicPostSitemapEntry = {
  silo: string;
  slug: string;
  lastModified: string | null;
};

function validDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

// Inputs come from the public database scope, which excludes drafts, deleted posts and inactive silos.
export function buildPublicSitemap({
  siteUrl,
  staticPaths,
  silos,
  posts,
}: {
  siteUrl: string;
  staticPaths: readonly string[];
  silos: ReadonlyArray<{ slug: string }>;
  posts: readonly PublicPostSitemapEntry[];
}): MetadataRoute.Sitemap {
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  const staticUrls = new Set<string>();
  for (const path of staticPaths) {
    const url = buildCanonicalUrl(siteUrl, path);
    staticUrls.add(url);
    // Revalidation does not mean the page's content was modified.
    entries.set(url, { url });
  }

  const publicSiloPaths = new Set(silos.map(silo => buildSiloCanonicalPath(silo.slug)).filter(Boolean));
  const hubDates = new Map<string, Date | undefined>();
  for (const post of posts) {
    const siloPath = buildSiloCanonicalPath(post.silo);
    const postPath = buildPostCanonicalPath(post.silo, post.slug);
    if (!siloPath || !postPath || !publicSiloPaths.has(siloPath)) continue;

    const lastModified = validDate(post.lastModified);
    const url = buildCanonicalUrl(siteUrl, postPath);
    const previousDate = entries.get(url)?.lastModified;
    if (!entries.has(url) || (lastModified && (!previousDate || lastModified > new Date(previousDate)))) {
      entries.set(url, { url, ...(lastModified ? { lastModified } : {}) });
    }

    const previousHubDate = hubDates.get(siloPath);
    if (!hubDates.has(siloPath) || (lastModified && (!previousHubDate || lastModified > previousHubDate))) {
      hubDates.set(siloPath, lastModified);
    }
  }

  // A hub becomes indexable only once its public article collection has content.
  for (const [path, lastModified] of hubDates) {
    const url = buildCanonicalUrl(siteUrl, path);
    if (!staticUrls.has(url)) entries.set(url, { url, ...(lastModified ? { lastModified } : {}) });
  }
  return [...entries.values()];
}
