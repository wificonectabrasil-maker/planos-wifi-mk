import * as cheerio from "cheerio";

export type LinkRelFlags = {
  nofollow: boolean;
  sponsored: boolean;
  ugc: boolean;
};

export type LinkPositionBucket = "inicio" | "meio" | "fim";

export type ExtractedLink = {
  href: string;
  anchorText: string;
  isInternal: boolean;
  isSiloInternal: boolean;
  isAmazon: boolean;
  rel: LinkRelFlags;
  targetBlank: boolean;
  positionBucket: LinkPositionBucket;
};

type ExtractOptions = {
  siteUrl?: string | null;
  siloSlug?: string | null;
};

type RawLink = Omit<ExtractedLink, "positionBucket"> & {
  position: number;
  _mergeKey?: string;
  _positionEnd?: number;
};

const AMAZON_HINTS = ["amazon.", "amzn.to", "a.co"];
const IGNORE_PREFIXES = ["mailto:", "tel:", "javascript:"];

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/^www\./, "");
}

function getSiteHost(siteUrl?: string | null) {
  if (!siteUrl) return null;
  try {
    return normalizeHost(new URL(siteUrl).hostname);
  } catch {
    return null;
  }
}

function stripHashAndQuery(path: string) {
  return path.split("#")[0].split("?")[0];
}

function normalizePath(path: string) {
  if (!path) return null;
  const cleaned = stripHashAndQuery(path.trim());
  if (!cleaned) return null;
  let normalized = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function safeHref(href: string | null | undefined) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("#")) return null;
  if (IGNORE_PREFIXES.some((prefix) => lower.startsWith(prefix))) return null;
  return trimmed;
}

function parseRel(relValue: string | null | undefined): LinkRelFlags {
  const rel = String(relValue ?? "")
    .split(/\s+/)
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  return {
    nofollow: rel.includes("nofollow"),
    sponsored: rel.includes("sponsored"),
    ugc: rel.includes("ugc"),
  };
}

function getPathFromHref(href: string, siteHost: string | null) {
  if (href.startsWith("/")) return normalizePath(href);
  if (href.startsWith("//")) {
    try {
      const url = new URL(`https:${href}`);
      const host = normalizeHost(url.hostname);
      if (siteHost && host !== siteHost) return null;
      return normalizePath(url.pathname);
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      const host = normalizeHost(url.hostname);
      if (siteHost && host !== siteHost) return null;
      return normalizePath(url.pathname);
    } catch {
      return null;
    }
  }
  return normalizePath(href);
}

function isAmazonHref(href: string) {
  if (/^https?:\/\//i.test(href) || href.startsWith("//")) {
    try {
      const url = href.startsWith("//") ? new URL(`https:${href}`) : new URL(href);
      const host = normalizeHost(url.hostname);
      return AMAZON_HINTS.some((hint) => host.includes(hint));
    } catch {
      return false;
    }
  }
  return false;
}

function buildLink(params: {
  href: string;
  anchorText: string;
  rel: LinkRelFlags;
  targetBlank: boolean;
  siteHost: string | null;
  siloSlug?: string | null;
}) {
  const safe = safeHref(params.href);
  if (!safe) return null;

  const path = getPathFromHref(safe, params.siteHost);
  const isInternal = Boolean(path);
  const isSiloInternal = Boolean(
    path && params.siloSlug && path.startsWith(`/${params.siloSlug}`)
  );

  return {
    href: safe,
    anchorText: params.anchorText,
    isInternal,
    isSiloInternal,
    isAmazon: isAmazonHref(safe),
    rel: params.rel,
    targetBlank: params.targetBlank,
  } satisfies Omit<ExtractedLink, "positionBucket">;
}

function bucketByPosition(position: number, total: number): LinkPositionBucket {
  if (!total) return "inicio";
  const ratio = position / total;
  if (ratio < 0.33) return "inicio";
  if (ratio < 0.66) return "meio";
  return "fim";
}

function applyBuckets(rawLinks: RawLink[], totalText: number): ExtractedLink[] {
  const total = totalText || 1;
  return rawLinks.map((link) => ({
    href: link.href,
    anchorText: link.anchorText,
    isInternal: link.isInternal,
    isSiloInternal: link.isSiloInternal,
    isAmazon: link.isAmazon,
    rel: link.rel,
    targetBlank: link.targetBlank,
    positionBucket: bucketByPosition(link.position, total),
  }));
}

function extractFromHtml(html: string, options: ExtractOptions): ExtractedLink[] {
  const siteHost = getSiteHost(options.siteUrl);
  const $ = cheerio.load(html || "");
  const links: RawLink[] = [];
  let textOffset = 0;

  function walk(node: any) {
    if (!node) return;
    if (node.type === "text") {
      textOffset += node.data?.length ?? 0;
      return;
    }

    if (node.type === "tag" && node.name === "a") {
      const attrs = node.attribs ?? {};
      const href = typeof attrs.href === "string" ? attrs.href : "";
      const anchorText = $(node).text() ?? "";
      const rel = parseRel(attrs.rel);
      const targetBlank = attrs.target === "_blank";
      const link = buildLink({
        href,
        anchorText: anchorText.trim(),
        rel,
        targetBlank,
        siteHost,
        siloSlug: options.siloSlug ?? null,
      });

      if (link) {
        links.push({
          ...link,
          position: textOffset,
        });
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }

      return;
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(walk);
    }
  }

  const root = $.root().get(0);
  if (root) {
    walk(root);
  }

  return applyBuckets(links, textOffset);
}

function extractFromJson(doc: any, options: ExtractOptions): ExtractedLink[] {
  if (!doc) return [];
  const siteHost = getSiteHost(options.siteUrl);
  const links: RawLink[] = [];
  const state = { offset: 0 };

  function appendLinkSegment(params: {
    href: string;
    text: string;
    rel: LinkRelFlags;
    targetBlank: boolean;
  }) {
    const anchorText = params.text ?? "";
    const length = anchorText.length;
    const start = state.offset;
    const end = state.offset + length;
    state.offset = end;

    const link = buildLink({
      href: params.href,
      anchorText: anchorText.trim(),
      rel: params.rel,
      targetBlank: params.targetBlank,
      siteHost,
      siloSlug: options.siloSlug ?? null,
    });
    if (!link) return;

    const mergeKey = `${link.href}|${link.targetBlank ? "1" : "0"}|${link.rel.nofollow ? "1" : "0"}|${link.rel.sponsored ? "1" : "0"}|${link.rel.ugc ? "1" : "0"}`;
    const last = links[links.length - 1];
    if (last && last._mergeKey === mergeKey && last._positionEnd === start) {
      last.anchorText = `${last.anchorText}${anchorText}`.trim();
      last._positionEnd = end;
      return;
    }

    links.push({
      ...link,
      position: start,
      _mergeKey: mergeKey,
      _positionEnd: end,
    });
  }

  function walk(node: any, activeMarks: any[] = []) {
    if (!node) return;

    if (node.type === "mention") {
      const attrs = node.attrs ?? {};
      const href = typeof attrs.href === "string" ? attrs.href : "";
      const label = typeof attrs.label === "string" ? attrs.label : attrs.text ?? "";
      appendLinkSegment({
        href,
        text: label ?? "",
        rel: { nofollow: false, sponsored: false, ugc: false },
        targetBlank: false,
      });
      return;
    }

    if (node.type === "affiliateCta") {
      const attrs = node.attrs ?? {};
      const href = typeof attrs.url === "string" ? attrs.url : typeof attrs.href === "string" ? attrs.href : "";
      const label = typeof attrs.label === "string" ? attrs.label : "CTA";
      appendLinkSegment({
        href,
        text: label ?? "",
        rel: { nofollow: true, sponsored: true, ugc: false },
        targetBlank: true,
      });
      return;
    }

    if (node.type === "affiliateProductCard" || node.type === "affiliateProduct") {
      const attrs = node.attrs ?? {};
      const href = typeof attrs.url === "string" ? attrs.url : typeof attrs.href === "string" ? attrs.href : "";
      const label = typeof attrs.title === "string" ? attrs.title : "Produto";
      appendLinkSegment({
        href,
        text: label ?? "",
        rel: { nofollow: true, sponsored: true, ugc: false },
        targetBlank: true,
      });
      return;
    }

    if (node.type === "cta_button") {
      const attrs = node.attrs ?? {};
      const href = typeof attrs.href === "string" ? attrs.href : typeof attrs.url === "string" ? attrs.url : "";
      const label = typeof attrs.label === "string" ? attrs.label : "CTA";
      const relRaw = typeof attrs.rel === "string" ? attrs.rel : "";
      const relFlags = parseRel(relRaw);
      appendLinkSegment({
        href,
        text: label ?? "",
        rel: relFlags,
        targetBlank: attrs.target === "_blank",
      });
      return;
    }

    const marks = Array.isArray(node.marks) ? node.marks : activeMarks;
    if (node.type === "text") {
      const text = typeof node.text === "string" ? node.text : "";
      const linkMark = marks?.find((m: any) => m.type === "link");
      if (linkMark) {
        const attrs = linkMark.attrs ?? {};
        appendLinkSegment({
          href: typeof attrs.href === "string" ? attrs.href : "",
          text,
          rel: parseRel(attrs.rel),
          targetBlank: attrs.target === "_blank",
        });
      } else {
        state.offset += text.length;
      }
      return;
    }

    if (Array.isArray(node.content)) {
      node.content.forEach((child: any) => walk(child, marks ?? []));
    }
  }

  walk(doc, []);
  return applyBuckets(links, state.offset);
}

export function extractLinksFromContent(content: string | any | null | undefined, options: ExtractOptions = {}): ExtractedLink[] {
  if (!content) return [];
  if (typeof content === "string") {
    return extractFromHtml(content, options);
  }
  return extractFromJson(content, options);
}

