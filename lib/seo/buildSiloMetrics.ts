import type { Post, Silo } from "@/lib/types";
import { extractLinksFromContent, type LinkPositionBucket } from "@/lib/seo/extractLinksFromContent";

export type SiloPostMetrics = {
  postId: string;
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  amazonLinks: number;
  nofollow: number;
  sponsored: number;
  ugc: number;
  targetBlank: number;
  anchorsUnique: number;
  anchorsRepeated: number;
  inboundWithinSilo: number;
  outboundWithinSilo: number;
  internalSiloLinks: number;
};

export type SiloLinkEdge = {
  sourceId: string;
  targetId: string;
  count: number;
};

export type SiloMetrics = {
  totals: {
    totalLinks: number;
    internalLinks: number;
    externalLinks: number;
    amazonLinks: number;
  };
  relCounts: {
    nofollow: number;
    sponsored: number;
    ugc: number;
    targetBlank: number;
  };
  perPostMetrics: SiloPostMetrics[];
  orphanPosts: string[];
  superLinkedPosts: Array<{ postId: string; inbound: number }>;
  distribution: Record<LinkPositionBucket, number>;
  adjacency: SiloLinkEdge[];
};

type BuildArgs = {
  silo: Silo;
  posts: Post[];
  siteUrl?: string | null;
};

function normalizePath(path: string | null | undefined) {
  if (!path) return null;
  const cleaned = path.trim().split("#")[0].split("?")[0];
  if (!cleaned) return null;
  let normalized = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function resolvePathFromHref(href: string, siteUrl?: string | null) {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return normalizePath(trimmed);
  if (trimmed.startsWith("//")) {
    try {
      const base = siteUrl ? new URL(siteUrl) : null;
      const url = new URL(`https:${trimmed}`);
      if (base && url.hostname !== base.hostname) return null;
      return normalizePath(url.pathname);
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const base = siteUrl ? new URL(siteUrl) : null;
      const url = new URL(trimmed);
      if (base && url.hostname !== base.hostname) return null;
      return normalizePath(url.pathname);
    } catch {
      return null;
    }
  }
  return normalizePath(trimmed);
}

export function buildSiloMetrics({ silo, posts, siteUrl }: BuildArgs): SiloMetrics {
  const totals = { totalLinks: 0, internalLinks: 0, externalLinks: 0, amazonLinks: 0 };
  const relCounts = { nofollow: 0, sponsored: 0, ugc: 0, targetBlank: 0 };
  const distribution: Record<LinkPositionBucket, number> = { inicio: 0, meio: 0, fim: 0 };
  const perPostMetrics: SiloPostMetrics[] = [];

  const postPathMap = new Map<string, string>();
  posts.forEach((post) => {
    const canonical = normalizePath(post.canonical_path ?? undefined);
    if (canonical) postPathMap.set(canonical, post.id);
    if (post.slug) {
      const mainPath = normalizePath(`/${silo.slug}/${post.slug}`);
      if (mainPath) postPathMap.set(mainPath, post.id);
    }
  });

  const edgeCounts = new Map<string, number>();
  const inboundCounts = new Map<string, number>();

  posts.forEach((post) => {
    const content = post.content_html || post.content_json || "";
    const links = extractLinksFromContent(content, { siteUrl, siloSlug: silo.slug });

    const anchorCounts = new Map<string, number>();
    let internalLinks = 0;
    let externalLinks = 0;
    let amazonLinks = 0;
    let nofollow = 0;
    let sponsored = 0;
    let ugc = 0;
    let targetBlank = 0;
    let outboundWithinSilo = 0;
    let internalSiloLinks = 0;

    links.forEach((link) => {
      totals.totalLinks += 1;
      distribution[link.positionBucket] += 1;

      if (link.isInternal) {
        internalLinks += 1;
        totals.internalLinks += 1;
      } else {
        externalLinks += 1;
        totals.externalLinks += 1;
      }

      if (link.isAmazon) {
        amazonLinks += 1;
        totals.amazonLinks += 1;
      }

      if (link.rel.nofollow) {
        nofollow += 1;
        relCounts.nofollow += 1;
      }
      if (link.rel.sponsored) {
        sponsored += 1;
        relCounts.sponsored += 1;
      }
      if (link.rel.ugc) {
        ugc += 1;
        relCounts.ugc += 1;
      }
      if (link.targetBlank) {
        targetBlank += 1;
        relCounts.targetBlank += 1;
      }

      const anchorKey = link.anchorText.trim().toLowerCase();
      if (anchorKey) {
        anchorCounts.set(anchorKey, (anchorCounts.get(anchorKey) ?? 0) + 1);
      }

      const path = resolvePathFromHref(link.href, siteUrl);
      if (path) {
        if (path.startsWith(`/${silo.slug}`) || path === `/silos/${silo.slug}`) {
          internalSiloLinks += 1;
        }

        const targetId = postPathMap.get(path);
        if (targetId && targetId !== post.id) {
          outboundWithinSilo += 1;
          const key = `${post.id}|${targetId}`;
          edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
        }
      }
    });

    const uniqueAnchors = anchorCounts.size;
    const anchorsRepeated = Math.max(0, links.length - uniqueAnchors);

    perPostMetrics.push({
      postId: post.id,
      totalLinks: links.length,
      internalLinks,
      externalLinks,
      amazonLinks,
      nofollow,
      sponsored,
      ugc,
      targetBlank,
      anchorsUnique: uniqueAnchors,
      anchorsRepeated,
      inboundWithinSilo: 0,
      outboundWithinSilo,
      internalSiloLinks,
    });
  });

  const adjacency: SiloLinkEdge[] = [];
  edgeCounts.forEach((count, key) => {
    const [sourceId, targetId] = key.split("|");
    adjacency.push({ sourceId, targetId, count });
    inboundCounts.set(targetId, (inboundCounts.get(targetId) ?? 0) + count);
  });

  const perPostWithInbound = perPostMetrics.map((metric) => ({
    ...metric,
    inboundWithinSilo: inboundCounts.get(metric.postId) ?? 0,
  }));

  const orphanPosts = perPostWithInbound.filter((metric) => metric.inboundWithinSilo === 0).map((metric) => metric.postId);
  const superLinkedPosts = [...perPostWithInbound]
    .sort((a, b) => b.inboundWithinSilo - a.inboundWithinSilo)
    .slice(0, 5)
    .map((metric) => ({ postId: metric.postId, inbound: metric.inboundWithinSilo }));

  return {
    totals,
    relCounts,
    perPostMetrics: perPostWithInbound,
    orphanPosts,
    superLinkedPosts,
    distribution,
    adjacency,
  };
}
