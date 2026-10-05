import * as cheerio from "cheerio";

type CheerioNode = any;
import { renderEditorDocToHtml } from "@/lib/editor/docRenderer";
import { EditorDocSchema } from "@/lib/editor/blockSchema";
import type { ContentorCta } from "@/lib/editor/contentorMeta";

type Mark = { type: string; attrs?: Record<string, any> };
type EditorNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: EditorNode[];
  text?: string;
  marks?: Mark[];
  meta?: Record<string, any>;
};

type CtaVariant = "primary" | "secondary" | "outline";

type CtaInfo = {
  label: string;
  url: string;
  variant: CtaVariant;
  vendor: "amazon" | "generic";
  size?: string | null;
  align?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  tracking?: string | null;
  note?: string | null;
};

type StructuredCta = {
  id: string;
  label: string;
  url: string;
  variant: CtaVariant;
  vendor: "amazon" | "generic";
  size?: string | null;
  align?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  tracking?: string | null;
  note?: string | null;
  used: boolean;
};

type ImportStats = {
  ctaDetected: number;
  ctaConverted: number;
  ctaFromPayload: number;
  ctaMatchedPayload: number;
  ctaAppended: number;
  ctaUnmatchedPayload: number;
  sampleUnmatchedPayload: string[];
};

type ImportOptions = {
  ctas?: ContentorCta[];
};

type ImportResult = {
  title: string | null;
  doc: EditorNode;
  html: string;
  warnings: string[];
  stats: ImportStats;
};

type ImportContext = {
  stats: ImportStats;
  warnings: string[];
  structuredCtas: StructuredCta[];
};

const CTA_MATCHERS: Array<{ match: RegExp; variant: CtaVariant; vendor: "amazon" | "generic" }> = [
  { match: /^compre agora$/i, variant: "primary", vendor: "amazon" },
  { match: /^verificar disponibilidade$/i, variant: "secondary", vendor: "amazon" },
  { match: /^ver preco na amazon$/i, variant: "primary", vendor: "amazon" },
  { match: /^ver preco$/i, variant: "primary", vendor: "generic" },
  { match: /^ver oferta$/i, variant: "primary", vendor: "generic" },
];

const INLINE_TAGS = new Set(["span", "strong", "b", "em", "i", "u", "a", "mark", "small", "code", "br"]);

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizePlainText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string) {
  return stripDiacritics(value).replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function parseTokenAttributes(raw: string) {
  const attrs: Record<string, string> = {};
  if (!raw) return attrs;
  const regex = /(\w+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(raw))) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function expandContentorTokens(html: string, warnings: string[]) {
  if (!html) return html;
  let output = html;

  output = output.replace(/\[\[LINK_CANDIDATE([^\]]*)\]\]/gi, (_match, rawAttrs) => {
    const attrs = parseTokenAttributes(String(rawAttrs || ""));
    const slug = attrs.slug || attrs.target || "";
    const href = attrs.href || "";
    const status = attrs.status || "pending";
    const confidence = attrs.confidence || "";
    const reason = attrs.reason || "";
    const parts = [
      `data-link-candidate=\"true\"`,
      slug ? `data-slug=\"${escapeAttr(slug)}\"` : "",
      href ? `data-href=\"${escapeAttr(href)}\"` : "",
      status ? `data-status=\"${escapeAttr(status)}\"` : "",
      confidence ? `data-confidence=\"${escapeAttr(confidence)}\"` : "",
      reason ? `data-reason=\"${escapeAttr(reason)}\"` : "",
      `class=\"internal-link-candidate internal-link-candidate-${escapeAttr(status)}\"`,
    ]
      .filter(Boolean)
      .join(" ");
    return `<span ${parts}>`;
  });

  output = output.replace(/\[\[\/LINK_CANDIDATE\]\]/gi, "</span>");

  if (output !== html) {
    warnings.push("Tokens LINK_CANDIDATE convertidos para spans");
  }

  return output;
}

function textMatchesCta(label: string) {
  const normalized = normalizeForMatch(label).toLowerCase();
  for (const entry of CTA_MATCHERS) {
    if (entry.match.test(normalized)) {
      return { label: label.trim(), variant: entry.variant, vendor: entry.vendor };
    }
  }
  return null;
}

function isAmazonUrl(url: string) {
  const lower = url.toLowerCase();
  return lower.includes("amazon.") || lower.includes("amzn.to") || lower.includes("a.co");
}

function normalizeUrlForMatch(value: string) {
  if (!value) return "";
  try {
    const base = "http://local";
    const url = new URL(value, base);
    const origin = url.origin === base ? "" : url.origin;
    const path = url.pathname.replace(/\/+$/g, "");
    return `${origin}${path}` || path || value;
  } catch {
    return value.split(/[?#]/)[0].replace(/\/+$/g, "");
  }
}

function normalizeVariantHint(value?: string | null): CtaVariant | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("secondary") || lower.includes("secundario")) return "secondary";
  if (lower.includes("outline")) return "outline";
  if (lower.includes("primary") || lower.includes("primario")) return "primary";
  return null;
}

function isAmazonPreset(value?: string | null) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return lower.includes("amazon") || lower.includes("amzn");
}

function extractStyleColors(styleValue: string | null | undefined) {
  if (!styleValue) return { bgColor: null, textColor: null };
  const style = styleValue.toLowerCase();
  const bgMatch = style.match(/background-color\s*:\s*([^;]+)/i);
  const colorMatch = style.match(/(^|;)\s*color\s*:\s*([^;]+)/i);
  const bgColor = bgMatch ? bgMatch[1].replace(/!important/g, "").trim() : null;
  const textColor = colorMatch ? colorMatch[2].replace(/!important/g, "").trim() : null;
  return { bgColor, textColor };
}

function extractHrefFromOnclick(onclick: string | null | undefined) {
  if (!onclick) return "";
  const direct =
    onclick.match(/href\s*=\s*['"]([^'"]+)['"]/i) ||
    onclick.match(/a\.href\s*=\s*['"]([^'"]+)['"]/i) ||
    onclick.match(/window\.open\(\s*['"]([^'"]+)['"]/i) ||
    onclick.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i);
  return direct ? direct[1] : "";
}

function normalizeStructuredCtas(ctas: ContentorCta[] | undefined, warnings: string[]) {
  const list: StructuredCta[] = [];
  if (!Array.isArray(ctas)) return list;

  ctas.forEach((cta, index) => {
    const label = normalizePlainText(typeof cta?.label === "string" ? cta.label : "");
    const url = typeof cta?.url === "string" ? cta.url : typeof cta?.href === "string" ? cta.href : "";
    if (!label || !url) {
      warnings.push(`CTA payload ignorado (sem label/url) #${index + 1}`);
      return;
    }

    const textMatch = textMatchesCta(label);
    const presetHint = isAmazonPreset(cta?.preset) || isAmazonPreset(cta?.variant);
    const vendor = presetHint || isAmazonUrl(url) || textMatch?.vendor === "amazon" ? "amazon" : "generic";
    const variantHint = normalizeVariantHint(cta?.variant) || normalizeVariantHint(cta?.preset);
    const variant = variantHint ?? textMatch?.variant ?? (vendor === "amazon" ? "primary" : "primary");

    list.push({
      id: `payload-${index + 1}`,
      label,
      url,
      variant,
      vendor,
      size: cta?.size ?? null,
      align: cta?.align ?? null,
      bgColor: (cta as any)?.bgColor ?? (cta as any)?.backgroundColor ?? null,
      textColor: (cta as any)?.textColor ?? (cta as any)?.color ?? null,
      tracking: cta?.tracking ?? null,
      note: cta?.note ?? null,
      used: false,
    });
  });

  return list;
}

function matchStructuredCta(label: string, href: string, structured: StructuredCta[]) {
  if (!structured.length) return null;
  const normalizedLabel = normalizeForMatch(label).toLowerCase();
  const normalizedHref = normalizeUrlForMatch(href);
  return (
    structured.find((cta) => !cta.used && normalizeUrlForMatch(cta.url) === normalizedHref) ||
    structured.find((cta) => !cta.used && normalizeForMatch(cta.label).toLowerCase() === normalizedLabel) ||
    null
  );
}

function extractCtaLabelFromAttribs(attribs: Record<string, any>) {
  return normalizePlainText(
    attribs["data-cta-label"] ||
      attribs["data-cta-text"] ||
      attribs["data-label"] ||
      attribs["aria-label"] ||
      attribs["title"] ||
      ""
  );
}

function extractCtaHrefFromAttribs(attribs: Record<string, any>) {
  return (
    attribs["href"] ||
    attribs["data-url"] ||
    attribs["data-href"] ||
    attribs["data-link"] ||
    attribs["data-cta-url"] ||
    ""
  );
}

function hasExplicitCtaHint(attribs: Record<string, any>) {
  if (attribs["data-cta"] || attribs["data-cta-label"] || attribs["data-cta-text"] || attribs["data-cta-url"]) {
    return true;
  }
  if (attribs["data-amazon"] || attribs["data-affiliate"]) return true;
  if (String(attribs["data-type"] || "").toLowerCase().includes("cta")) return true;
  const className = String(attribs.class || "").toLowerCase();
  return /\bcta\b/.test(className) || className.includes("cta-button") || className.includes("btn-cta");
}

function isStandaloneCtaContainer($: cheerio.CheerioAPI, node: CheerioNode) {
  const directChildren = $(node)
    .contents()
    .toArray()
    .filter((child) => {
      if (child.type === "text") return normalizePlainText((child as any).data ?? "").length > 0;
      return child.type === "tag";
    });

  if (directChildren.length === 0) return true;

  const tagChildren = directChildren.filter((child) => child.type === "tag");
  const nonTagTextChildren = directChildren.length - tagChildren.length;
  if (nonTagTextChildren > 0) return false;
  if (tagChildren.length > 2) return false;

  return tagChildren.every((child) => {
    const tag = String((child as any).name || "").toLowerCase();
    return tag === "a" || tag === "button";
  });
}

function extractCandidateAttrs(el: CheerioNode) {
  const attribs = (el as any).attribs ?? {};
  const classes = String(attribs.class || "");
  const hasCandidateAttr =
    attribs["data-link-candidate"] ||
    attribs["data-internal-candidate"] ||
    attribs["data-link-suggested"] ||
    attribs["data-internal-link"] ||
    attribs["data-internal"] ||
    classes.includes("link-candidate") ||
    classes.includes("internal-link-candidate");

  if (!hasCandidateAttr) return null;

  const slug =
    attribs["data-target-slug"] ||
    attribs["data-slug"] ||
    attribs["data-link-slug"] ||
    attribs["data-internal-link"] ||
    attribs["data-internal"] ||
    null;

  const href = attribs["data-link-href"] || attribs["data-href"] || attribs["data-url"] || null;
  const status = attribs["data-status"] || attribs["data-link-status"] || "pending";

  return { slug, href, status };
}

function buildLinkMark(el: CheerioNode) {
  const attribs = (el as any).attribs ?? {};
  const href = typeof attribs.href === "string" ? attribs.href : "";
  if (!href) return null;

  const rel = typeof attribs.rel === "string" ? attribs.rel : null;
  const target = typeof attribs.target === "string" ? attribs.target : null;
  const dataLinkType = attribs["data-link-type"] || null;
  const dataEntityType = attribs["data-entity-type"] || attribs["data-entity"] || null;
  const dataPostId = attribs["data-post-id"] || null;

  const isAffiliate = rel?.includes("sponsored") || isAmazonUrl(href);
  const inferredType = dataLinkType || (isAffiliate ? "affiliate" : href.startsWith("/") ? "internal" : "external");

  const mark: Mark = {
    type: "link",
    attrs: {
      href,
      rel: rel ?? (isAffiliate ? "sponsored" : null),
      target,
      "data-link-type": inferredType,
      "data-entity-type": dataEntityType,
      "data-entity": dataEntityType,
      "data-post-id": dataPostId,
    },
  };

  return mark;
}

function parseInline($: cheerio.CheerioAPI, node: CheerioNode, marks: Mark[], warnings: string[]): EditorNode[] {
  if (!node) return [];
  if (node.type === "text") {
    const text = (node as any).data ?? "";
    if (!text || !text.trim()) return [];
    return [{ type: "text", text, marks: marks.length ? marks : undefined }];
  }

  if (node.type !== "tag") return [];

  const tag = node.name?.toLowerCase();
  if (!tag) return [];

  if (tag === "br") {
    return [{ type: "hardBreak" }];
  }

  const candidateAttrs = extractCandidateAttrs(node);
  const nextMarks = [...marks];
  if (candidateAttrs) {
    nextMarks.push({
      type: "internalLinkCandidate",
      attrs: {
        slug: candidateAttrs.slug,
        href: candidateAttrs.href,
        status: candidateAttrs.status,
      },
    });
  }

  if (tag === "strong" || tag === "b") {
    nextMarks.push({ type: "bold" });
  } else if (tag === "em" || tag === "i") {
    nextMarks.push({ type: "italic" });
  } else if (tag === "u") {
    nextMarks.push({ type: "underline" });
  } else if (tag === "a") {
    const linkMark = buildLinkMark(node);
    if (linkMark) nextMarks.push(linkMark);
  }

  const children: EditorNode[] = [];
  const childNodes = (node.children ?? []) as CheerioNode[];
  for (const child of childNodes) {
    children.push(...parseInline($, child, nextMarks, warnings));
  }

  return children;
}

function parseParagraph($: cheerio.CheerioAPI, node: CheerioNode, warnings: string[]): EditorNode | null {
  const inline: EditorNode[] = [];
  const childNodes = (node.children ?? []) as CheerioNode[];
  for (const child of childNodes) {
    inline.push(...parseInline($, child, [], warnings));
  }
  if (!inline.length) return null;
  return { type: "paragraph", content: inline };
}

function parseHeading($: cheerio.CheerioAPI, node: CheerioNode, level: number, warnings: string[]): EditorNode | null {
  const inline: EditorNode[] = [];
  const childNodes = (node.children ?? []) as CheerioNode[];
  for (const child of childNodes) {
    inline.push(...parseInline($, child, [], warnings));
  }
  const text = inline.map((n) => n.text ?? "").join("").trim();
  if (!text) return null;
  return { type: "heading", attrs: { level }, content: inline };
}

function parseImage(node: CheerioNode): EditorNode | null {
  const attribs = (node as any).attribs ?? {};
  const src = attribs.src;
  if (!src) return null;
  return {
    type: "image",
    attrs: {
      src,
      alt: attribs.alt ?? null,
      title: attribs.title ?? null,
      width: attribs.width ?? null,
      height: attribs.height ?? null,
      "data-align": attribs["data-align"] ?? null,
    },
  };
}

function parseList(
  $: cheerio.CheerioAPI,
  node: CheerioNode,
  ordered: boolean,
  warnings: string[],
  context: ImportContext
): EditorNode | null {
  const items: EditorNode[] = [];
  const children = $(node).children("li").toArray();
  children.forEach((li) => {
    const liContent = parseBlockChildren($, li.children ?? [], warnings, context);
    if (liContent.length === 0) {
      const inline = parseInline($, li, [], warnings);
      if (inline.length) {
        items.push({ type: "listItem", content: [{ type: "paragraph", content: inline }] });
      }
    } else {
      items.push({ type: "listItem", content: liContent });
    }
  });

  if (!items.length) return null;
  return { type: ordered ? "orderedList" : "bulletList", content: items };
}

function parseTable(
  $: cheerio.CheerioAPI,
  node: CheerioNode,
  warnings: string[],
  context: ImportContext
): EditorNode | null {
  const rows: EditorNode[] = [];
  const rowEls = $(node).find("tr").toArray();

  rowEls.forEach((row) => {
    const cellNodes: EditorNode[] = [];
    const cells = $(row).children("th,td").toArray();
    cells.forEach((cell) => {
      const isHeader = cell.name?.toLowerCase() === "th";
      const content = parseBlockChildren($, cell.children ?? [], warnings, context);
      const safeContent = content.length ? content : [{ type: "paragraph", content: [] }];
      cellNodes.push({ type: isHeader ? "tableHeader" : "tableCell", content: safeContent });
    });
    if (cellNodes.length) {
      rows.push({ type: "tableRow", content: cellNodes });
    }
  });

  if (!rows.length) return null;
  return { type: "table", attrs: { locked: true }, content: rows };
}

function parseAffiliateCta($: cheerio.CheerioAPI, node: CheerioNode, context: ImportContext): CtaInfo | null {
  const $node = $(node);
  const tag = node.name?.toLowerCase();
  if (!tag) return null;

  const isAnchorOrButton = tag === "a" || tag === "button";
  const anchor = isAnchorOrButton ? node : $node.find("a,button").get(0);

  const containerAttribs = (node as any).attribs ?? {};
  const anchorAttribs = anchor ? (anchor as any).attribs ?? {} : {};
  const attribs = { ...containerAttribs, ...anchorAttribs };
  const labelFromAttr = extractCtaLabelFromAttribs(attribs);
  const labelFromText = normalizePlainText(anchor ? $(anchor).text() : $node.text());
  const labelCandidate = labelFromAttr || labelFromText;
  const onclickHref = extractHrefFromOnclick(String(attribs["onclick"] || ""));
  const href = String(
    extractCtaHrefFromAttribs(anchorAttribs) || extractCtaHrefFromAttribs(containerAttribs) || onclickHref || ""
  );

  const structuredMatch = matchStructuredCta(labelCandidate, href, context.structuredCtas);
  const textMatch = labelCandidate ? textMatchesCta(labelCandidate) : null;
  const hasHint = hasExplicitCtaHint(attribs);
  const isCta = Boolean(textMatch || structuredMatch || hasHint);
  if (!isCta) return null;

  let resolvedHref = href;
  if (!resolvedHref) {
    const rowHref = $node.closest("tr").find("a[href]").first().attr("href");
    if (rowHref) resolvedHref = rowHref;
  }
  if (!resolvedHref && !textMatch && !structuredMatch) {
    return null;
  }
  if (!resolvedHref) {
    context.warnings.push("CTA detectado sem href");
  }

  const presetHint = attribs["data-cta-preset"] || attribs["data-cta-type"] || attribs["data-vendor"] || attribs["data-variant"];
  const vendor =
    structuredMatch?.vendor ||
    (isAmazonUrl(resolvedHref || "") ||
    isAmazonPreset(String(presetHint || "")) ||
    textMatch?.vendor === "amazon"
      ? "amazon"
      : "generic");
  const variantHint = normalizeVariantHint(String(attribs["data-cta-variant"] || attribs["data-variant"] || presetHint || ""));
  const variant = structuredMatch?.variant || variantHint || textMatch?.variant || (vendor === "amazon" ? "primary" : "primary");

  const size = (attribs["data-size"] as string | undefined) || structuredMatch?.size || null;
  const align = (attribs["data-align"] as string | undefined) || structuredMatch?.align || null;
  const { bgColor, textColor } = extractStyleColors(String(attribs.style || ""));
  const tracking =
    attribs["data-tracking"] || attribs["data-utm"] || attribs["data-campaign"] || structuredMatch?.tracking || null;
  const note = attribs["data-note"] || attribs["data-context"] || structuredMatch?.note || null;

  const label = labelCandidate || structuredMatch?.label || textMatch?.label || "VERIFICAR DISPONIBILIDADE";

  if (structuredMatch) {
    structuredMatch.used = true;
    context.stats.ctaMatchedPayload += 1;
  }

  context.stats.ctaDetected += 1;

  return {
    label: label.trim(),
    url: resolvedHref,
    variant,
    vendor,
    size,
    align,
    bgColor: bgColor || structuredMatch?.bgColor || null,
    textColor: textColor || structuredMatch?.textColor || null,
    tracking,
    note,
  };
}

function buildCtaBlock(cta: CtaInfo) {
  const isAmazon = cta.vendor === "amazon";
  const href = cta.url;
  const isInternal = href.startsWith("/");
  const variant = isAmazon
    ? cta.variant === "secondary"
      ? "amazon_secondary"
      : "amazon_primary"
    : isInternal
      ? "internal"
      : "custom";
  const rel = isAmazon ? "sponsored nofollow noopener" : isInternal ? "follow" : "nofollow noopener";
  const target = isAmazon ? "_blank" : isInternal ? "_self" : "_blank";
  const size = cta.size || "md";
  const align = cta.align || "center";

  return {
    type: "cta_button",
    attrs: {
      label: cta.label,
      href,
      variant,
      size,
      align,
      bgColor: cta.bgColor ?? null,
      textColor: cta.textColor ?? null,
      rel,
      target,
      tracking: cta.tracking ?? null,
      note: cta.note ?? null,
    },
  } satisfies EditorNode;
}

function parseBlock(
  $: cheerio.CheerioAPI,
  node: CheerioNode,
  warnings: string[],
  context: ImportContext
): EditorNode[] {
  if (!node) return [];
  if (node.type === "text") {
    const text = (node as any).data ?? "";
    if (!text || !text.trim()) return [];
    return [{ type: "paragraph", content: [{ type: "text", text }] }];
  }
  if (node.type !== "tag") return [];

  const tag = node.name?.toLowerCase();
  if (!tag) return [];

  if (tag === "h2" || tag === "h3" || tag === "h4") {
    const level = Number(tag.replace("h", ""));
    const heading = parseHeading($, node, level, warnings);
    return heading ? [heading] : [];
  }

  if (tag === "p") {
    const cta = parseAffiliateCta($, node, context);
    if (cta) {
      return [buildCtaBlock(cta)];
    }
    const paragraph = parseParagraph($, node, warnings);
    return paragraph ? [paragraph] : [];
  }

  if (tag === "a" || tag === "button") {
    const cta = parseAffiliateCta($, node, context);
    if (cta) return [buildCtaBlock(cta)];
    const paragraph = parseParagraph($, node, warnings);
    return paragraph ? [paragraph] : [];
  }

  if (tag === "ul" || tag === "ol") {
    const list = parseList($, node, tag === "ol", warnings, context);
    return list ? [list] : [];
  }

  if (tag === "img") {
    const image = parseImage(node);
    return image ? [image] : [];
  }

  if (tag === "figure") {
    const imageNode = $(node).find("img").get(0);
    const figcaption = $(node).find("figcaption").first();
    const blocks: EditorNode[] = [];
    if (imageNode) {
      const parsed = parseImage(imageNode);
      if (parsed) blocks.push(parsed);
    }
    if (figcaption.length) {
      const caption = parseParagraph($, figcaption.get(0), warnings);
      if (caption) blocks.push(caption);
    }
    return blocks;
  }

  if (tag === "blockquote") {
    const content = parseBlockChildren($, node.children ?? [], warnings, context);
    if (!content.length) return [];
    return [{ type: "blockquote", content }];
  }

  if (tag === "table") {
    const table = parseTable($, node, warnings, context);
    return table ? [table] : [];
  }

  if (tag === "div" || tag === "section" || tag === "article") {
    const containerAttribs = (node as any).attribs ?? {};
    if (hasExplicitCtaHint(containerAttribs) && isStandaloneCtaContainer($, node)) {
      const cta = parseAffiliateCta($, node, context);
      if (cta) return [buildCtaBlock(cta)];
    }

    const blockChildren = parseBlockChildren($, node.children ?? [], warnings, context);
    if (blockChildren.length) return blockChildren;

    // Fallback: only collapse a container into CTA when it has no parseable children.
    const cta = parseAffiliateCta($, node, context);
    if (cta) return [buildCtaBlock(cta)];

    return [];
  }

  if (INLINE_TAGS.has(tag)) {
    const inline = parseInline($, node, [], warnings);
    if (!inline.length) return [];
    return [{ type: "paragraph", content: inline }];
  }

  const fallbackChildren = parseBlockChildren($, node.children ?? [], warnings, context);
  return fallbackChildren.length ? fallbackChildren : [];
}

function parseBlockChildren(
  $: cheerio.CheerioAPI,
  children: CheerioNode[] | CheerioNode[],
  warnings: string[],
  context: ImportContext
) {
  const blocks: EditorNode[] = [];
  for (const child of children as CheerioNode[]) {
    blocks.push(...parseBlock($, child, warnings, context));
  }
  return blocks;
}

export function importContentorHtml(html: string, options: ImportOptions = {}): ImportResult {
  const warnings: string[] = [];
  const stats: ImportStats = {
    ctaDetected: 0,
    ctaConverted: 0,
    ctaFromPayload: 0,
    ctaMatchedPayload: 0,
    ctaAppended: 0,
    ctaUnmatchedPayload: 0,
    sampleUnmatchedPayload: [],
  };
  const expandedHtml = expandContentorTokens(html || "", warnings);
  const $ = cheerio.load(expandedHtml);

  $("script,style").remove();

  let title: string | null = null;
  const h1 = $("h1").first();
  if (h1.length) {
    const text = normalizePlainText(h1.text());
    if (text) title = text;
    h1.remove();
  }

  const body = $("body");
  const rootNodes = body.length ? body.contents().toArray() : $.root().contents().toArray();
  const structuredCtas = normalizeStructuredCtas(options.ctas, warnings);
  stats.ctaFromPayload = structuredCtas.length;
  const context: ImportContext = { stats, warnings, structuredCtas };
  const content = parseBlockChildren($, rootNodes, warnings, context);

  const unusedPayload = structuredCtas.filter((cta) => !cta.used);
  if (unusedPayload.length) {
    unusedPayload.forEach((cta) => {
      content.push(buildCtaBlock(cta));
      stats.ctaAppended += 1;
    });
    stats.ctaUnmatchedPayload = unusedPayload.length;
    stats.sampleUnmatchedPayload = unusedPayload
      .slice(0, 5)
      .map((cta) => `${cta.label} -> ${cta.url}`);
  }
  stats.ctaConverted = stats.ctaDetected + stats.ctaAppended;
  const fallbackHtml = (body.length ? body.html() : $.root().html()) ?? "";

  if (!content.length) {
    warnings.push("Conteudo vazio apos importacao");
  }

  const doc: EditorNode = { type: "doc", content };
  const validation = EditorDocSchema.safeParse(doc);
  if (!validation.success) {
    warnings.push("Doc schema validation failed");
  }

  const htmlFromDoc = renderEditorDocToHtml(doc);
  let htmlNormalized = htmlFromDoc || fallbackHtml;
  if (htmlFromDoc && fallbackHtml) {
    const docText = stripHtml(htmlFromDoc).length;
    const fallbackText = stripHtml(fallbackHtml).length;
    if (fallbackText > 0 && docText / fallbackText < 0.7) {
      warnings.push("Rendered HTML is shorter than source; using fallback HTML");
      htmlNormalized = fallbackHtml;
    }
  }

  return { title, doc, html: htmlNormalized, warnings, stats };
}

export type { EditorNode, ImportResult };



