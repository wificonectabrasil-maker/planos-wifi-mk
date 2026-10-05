"use client";

import { startTransition, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditor, type Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";

import { EditorImage } from "@/components/editor/extensions/EditorImage";
import { EntityLink } from "@/components/editor/extensions/EntityLink";
import { InternalLinkMention } from "@/components/editor/extensions/InternalLinkMention";
import { InternalLinkCandidate } from "@/components/editor/extensions/InternalLinkCandidate";
import AffiliateProductCard from "@/components/editor/extensions/AffiliateProductCard";
import { CtaButton } from "@/components/editor/extensions/CtaButton";
import { LockedTable } from "@/components/editor/extensions/LockedTable";
import { FaqBlock } from "@/components/editor/extensions/FaqBlock";
import { IconBlock } from "@/components/editor/extensions/IconBlock";
import { CarouselBlock } from "@/components/editor/extensions/CarouselBlock";
import { YoutubeEmbed, normalizeYoutubeUrl } from "@/components/editor/extensions/YoutubeEmbed";
import { FindInContent } from "@/components/editor/extensions/FindInContent";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { ContentIntelligence } from "@/components/editor/ContentIntelligence";
import { EditorInspector } from "@/components/editor/EditorInspector";
import { AdvancedLinkDialog } from "@/components/editor/AdvancedLinkDialog";
import { LinkBubbleMenu } from "@/components/editor/LinkBubbleMenu";
import { EditorBubbleMenu } from "@/components/editor/EditorBubbleMenu";
import { InternalLinkCandidateMenu } from "@/components/editor/InternalLinkCandidateMenu";
import { saveEditorPost } from "@/app/admin/editor/actions";
import type { EditorMeta, ImageAsset, LinkItem, OutlineItem } from "@/components/editor/types";
import { resolveDefaultEeat } from "@/lib/editor/defaultEeat";
import type { PostWithSilo, Silo } from "@/lib/types";
import { EditorProvider } from "@/components/editor/EditorContext";
import {
  getBpAttrs,
  inheritDesktopToBp,
  setDeviceVisibility,
  setBpAttrs,
  type ResponsiveMode,
} from "@/lib/editor/responsive";
import { buildPostCanonicalPath, normalizeCanonicalPath } from "@/lib/seo/canonical";
import { normalizeSlugInput } from "@/lib/slug";


type Props = {
  post: PostWithSilo;
  silos?: Silo[];
};

type MetaPatch = Partial<EditorMeta>;

function slugify(value: string) {
  return normalizeSlugInput(value);
}

function resolvePostCanonicalPath(rawCanonical: string | null | undefined, siloSlug: string | null | undefined, slug: string | null | undefined) {
  return buildPostCanonicalPath(siloSlug, slug) ?? normalizeCanonicalPath(rawCanonical) ?? "";
}

function normalizeImageDimension(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
}

function isPersistableImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:")) return false;
  if (trimmed.startsWith("data:")) return false;
  return true;
}

function extractContentImages(doc: any): ImageAsset[] {
  const images: ImageAsset[] = [];
  const seen = new Set<string>();

  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.type === "image") {
      const src = String(node?.attrs?.src ?? "").trim();
      if (isPersistableImageUrl(src) && !seen.has(src)) {
        seen.add(src);
        images.push({
          url: src,
          alt: String(node?.attrs?.alt ?? "").trim(),
          width: normalizeImageDimension(node?.attrs?.width),
          height: normalizeImageDimension(node?.attrs?.height),
        });
      }
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  };

  walk(doc);
  return images;
}

function buildActiveImageLibrary(
  currentImages: ImageAsset[],
  doc: any,
  heroImageUrl: string | null | undefined,
  heroImageAlt: string | null | undefined
): ImageAsset[] {
  const currentByUrl = new Map(
    (currentImages ?? [])
      .filter((image) => isPersistableImageUrl(image?.url))
      .map((image) => [image.url, image] as const)
  );
  const nextImages: ImageAsset[] = [];
  const seen = new Set<string>();

  const normalizedHeroUrl = isPersistableImageUrl(heroImageUrl) ? heroImageUrl.trim() : "";
  if (normalizedHeroUrl && !seen.has(normalizedHeroUrl)) {
    const currentHero = currentByUrl.get(normalizedHeroUrl);
    seen.add(normalizedHeroUrl);
    nextImages.push({
      url: normalizedHeroUrl,
      alt: String(heroImageAlt ?? currentHero?.alt ?? "").trim(),
      width: currentHero?.width,
      height: currentHero?.height,
      fileName: currentHero?.fileName,
      createdAt: currentHero?.createdAt,
    });
  }

  extractContentImages(doc).forEach((image) => {
    if (seen.has(image.url)) return;
    const current = currentByUrl.get(image.url);
    seen.add(image.url);
    nextImages.push({
      url: image.url,
      alt: image.alt || current?.alt || "",
      width: image.width ?? current?.width,
      height: image.height ?? current?.height,
      fileName: current?.fileName,
      createdAt: current?.createdAt,
    });
  });

  return nextImages;
}

function areImageAssetsEqual(left: ImageAsset[], right: ImageAsset[]) {
  if (left.length !== right.length) return false;
  return left.every((image, index) => {
    const other = right[index];
    return (
      image.url === other?.url &&
      (image.alt ?? "") === (other?.alt ?? "") &&
      (image.width ?? null) === (other?.width ?? null) &&
      (image.height ?? null) === (other?.height ?? null) &&
      (image.fileName ?? null) === (other?.fileName ?? null) &&
      (image.createdAt ?? null) === (other?.createdAt ?? null)
    );
  });
}

type HighlightOccurrence = {
  id: string;
  source_post_id: string;
  target_post_id?: string | null;
  anchor_text: string;
  href_normalized: string;
  context_snippet?: string | null;
  start_index?: number | null;
  end_index?: number | null;
  occurrence_key?: string | null;
};

type PillarConflictPrompt = {
  code: "PILLAR_CONFLICT";
  silo_id: string;
  current_pillar: {
    id: string;
    title: string;
    slug: string;
    silo_group: string | null;
    silo_order: number | null;
  };
  pendingStatus?: EditorMeta["status"];
};

const PILLAR_CONFLICT_PREFIX = "PILLAR_CONFLICT::";

function parsePillarConflictError(error: unknown): Omit<PillarConflictPrompt, "pendingStatus"> | null {
  const message = typeof (error as any)?.message === "string" ? (error as any).message : "";
  if (!message.startsWith(PILLAR_CONFLICT_PREFIX)) return null;
  const raw = message.slice(PILLAR_CONFLICT_PREFIX.length).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Omit<PillarConflictPrompt, "pendingStatus">;
    if (
      parsed?.code === "PILLAR_CONFLICT" &&
      typeof parsed?.silo_id === "string" &&
      typeof parsed?.current_pillar?.id === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeHref(href: string) {
  if (!href) return "";
  try {
    const url = new URL(href, "http://local");
    return url.pathname.replace(/\/+$/g, "");
  } catch {
    return href.split(/[?#]/)[0].replace(/\/+$/g, "");
  }
}

function highlightOccurrenceInEditor(editor: Editor, occurrence: HighlightOccurrence) {
  const candidates: Array<{ pos: number; nodeSize: number; hrefMatch: boolean; anchorMatch: boolean }> = [];
  const targetHref = normalizeHref(occurrence.href_normalized);
  const targetAnchor = normalizeText(occurrence.anchor_text);

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const linkMark = node.marks.find((mark) => mark.type.name === "link");
    if (!linkMark) return;
    const href = normalizeHref(String(linkMark.attrs?.href ?? ""));
    const text = normalizeText(node.text || "");
    const hrefMatch = Boolean(targetHref && href === targetHref);
    const anchorMatch = Boolean(targetAnchor && text === targetAnchor);
    if (hrefMatch || anchorMatch) {
      candidates.push({ pos, nodeSize: node.nodeSize, hrefMatch, anchorMatch });
    }
  });

  if (!candidates.length) return false;
  candidates.sort((a, b) => {
    const aScore = (a.hrefMatch ? 2 : 0) + (a.anchorMatch ? 1 : 0);
    const bScore = (b.hrefMatch ? 2 : 0) + (b.anchorMatch ? 1 : 0);
    return bScore - aScore;
  });
  const match = candidates[0];
  const from = match.pos;
  const to = match.pos + match.nodeSize;
  editor
    .chain()
    .focus()
    .setTextSelection({ from, to })
    .setMark("highlight", { color: "#FDE68A" })
    .scrollIntoView()
    .run();
  return true;
}

function hasBoldStyle(style: string) {
  const match = /font-weight\s*:\s*([^;]+)/i.exec(style);
  if (!match) return false;
  const value = match[1].trim().toLowerCase();
  if (value === "bold" || value === "bolder") return true;
  const weight = Number.parseInt(value, 10);
  return Number.isFinite(weight) && weight >= 600;
}

function hasItalicStyle(style: string) {
  return /font-style\s*:\s*italic/i.test(style);
}

function hasUnderlineStyle(style: string) {
  return /text-decoration\s*:\s*[^;]*underline/i.test(style) || /text-decoration-line\s*:\s*underline/i.test(style);
}

function transformGoogleDocsPaste(html: string) {
  if (!html || typeof window === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const spans = Array.from(doc.querySelectorAll("span"));

    spans.forEach((span) => {
      const style = (span.getAttribute("style") ?? "").toLowerCase();
      const isBold = hasBoldStyle(style);
      const isItalic = hasItalicStyle(style);
      const isUnderline = hasUnderlineStyle(style);
      if (!isBold && !isItalic && !isUnderline) return;

      const tags: Array<"strong" | "em" | "u"> = [];
      if (isBold) tags.push("strong");
      if (isItalic) tags.push("em");
      if (isUnderline) tags.push("u");

      let wrapper: HTMLElement | null = null;
      let current: HTMLElement | null = null;
      tags.forEach((tag) => {
        const el = doc.createElement(tag);
        if (!wrapper) wrapper = el;
        if (current) current.appendChild(el);
        current = el;
      });

      if (!wrapper || !current) return;

      while (span.firstChild) {
        (current as HTMLElement).appendChild(span.firstChild);
      }

      span.replaceWith(wrapper);
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoString(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function extractAffiliateProducts(json: any) {
  const products: any[] = [];

  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);

    if ((node.type === "affiliateProduct" || node.type === "affiliateProductCard") && node.attrs) {
      products.push({
        title: node.attrs.title,
        image: node.attrs.image,
        price: node.attrs.price,
        rating: node.attrs.rating,
        features: node.attrs.features,
        url: node.attrs.url || node.attrs.href,
        currency: "BRL",
      });
    }

    if (node.content) walk(node.content);
  }

  walk(json);
  return products;
}

function extractOutline(editor: Editor | null): OutlineItem[] {
  if (!editor) return [];
  const items: OutlineItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const level = node.attrs.level;
      if (level === 2 || level === 3 || level === 4) {
        items.push({
          id: `${pos}-${level}`,
          level,
          text: node.textContent,
          pos: pos + 1,
        });
      }
    }
    return true;
  });
  return items;
}

function resolveLinkType(attrs: Record<string, any>, href: string): LinkItem["type"] {
  const rel = String(attrs.rel ?? "");
  const entity = attrs["data-entity-type"] ?? attrs["data-entity"];
  if (entity === "about" || rel.includes("about")) return "about";
  if (entity === "mention" || rel.includes("mention")) return "mention";

  const explicit = attrs["data-link-type"] as LinkItem["type"] | undefined;
  if (explicit) return explicit;
  if (rel.includes("sponsored")) return "affiliate";
  if (href.startsWith("/")) return "internal";
  return "external";
}

function extractLinks(editor: Editor | null): LinkItem[] {
  if (!editor) return [];
  const items: LinkItem[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "mention") {
      const attrs = node.attrs as any;
      const href = attrs.href ?? "";
      if (!href) return true;
      items.push({
        id: `${pos}-mention`,
        href,
        text: attrs.label ?? "",
        type: "mention",
        target: null,
        rel: null,
        from: pos,
        to: pos + node.nodeSize,
        dataPostId: attrs.id ?? null,
        dataEntityType: "mention",
      });
      return true;
    }

    if (node.type.name === "cta_button") {
      const attrs = node.attrs as any;
      const href = attrs.href ?? attrs.url ?? "";
      if (!href) return true;
      const variant = String(attrs.variant ?? "");
      const isInternal = href.startsWith("/");
      const isAmazon =
        variant.startsWith("amazon") ||
        String(attrs.rel ?? "").includes("sponsored") ||
        href.includes("amazon.") ||
        href.includes("amzn.to") ||
        href.includes("a.co");
      items.push({
        id: `${pos}-cta`,
        href,
        text: attrs.label ?? "CTA",
        type: isInternal ? "internal" : isAmazon ? "affiliate" : "external",
        target: attrs.target ?? (isAmazon ? "_blank" : isInternal ? "_self" : null),
        rel: attrs.rel ?? (isAmazon ? "sponsored nofollow" : null),
        from: pos,
        to: pos + node.nodeSize,
        dataPostId: null,
        dataEntityType: null,
      });
      return true;
    }

    if (node.type.name === "affiliateProductCard") {
      const attrs = node.attrs as any;
      const href = attrs.url ?? attrs.href ?? "";
      if (!href) return true;
      items.push({
        id: `${pos}-product`,
        href,
        text: attrs.title ?? "Produto",
        type: "affiliate",
        target: "_blank",
        rel: "sponsored nofollow",
        from: pos,
        to: pos + node.nodeSize,
        dataPostId: null,
        dataEntityType: null,
      });
      return true;
    }

    if (!node.isText) return true;
    const marks = node.marks ?? [];
    const linkMark = marks.find((mark) => mark.type.name === "link");
    if (!linkMark) return true;
    const attrs = linkMark.attrs as any;
    const href = attrs.href ?? "";
    if (!href) return true;
    items.push({
      id: `${pos}-${href}`,
      href,
      text: node.text ?? "",
      type: resolveLinkType(attrs, href),
      target: attrs.target ?? null,
      rel: attrs.rel ?? null,
      from: pos,
      to: pos + node.nodeSize,
      dataPostId: attrs["data-post-id"] ?? null,
      dataEntityType: attrs["data-entity-type"] ?? attrs["data-entity"] ?? null,
    });
    return true;
  });

  return items;
}

async function readImageMeta(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const loaded = new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Image load failed"));
    });
    img.src = url;
    return await loaded;
  } catch {
    return { width: 0, height: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function updateImageById(editor: Editor | null, id: string, attrs: Record<string, any>) {
  if (!editor) return;
  editor.commands.command(({ tr }) => {
    let updated = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs["data-id"] === id) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
        updated = true;
        return false;
      }
      return true;
    });
    return updated;
  });
}

function updateImageBySrc(editor: Editor | null, src: string, attrs: Record<string, any>) {
  if (!editor) return;
  editor.commands.command(({ tr }) => {
    let updated = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.src === src) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
        updated = true;
      }
      return true;
    });
    return updated;
  });
}

function updateClosestNodeAttrs(
  editor: Editor | null,
  nodeTypeName: string,
  updater: (attrs: Record<string, any>) => Record<string, any>
) {
  if (!editor) return false;
  return editor.commands.command(({ tr, state }) => {
    const selectionAny = state.selection as any;
    if (selectionAny?.node?.type?.name === nodeTypeName && Number.isFinite(selectionAny.from)) {
      const nextAttrs = updater((selectionAny.node.attrs as Record<string, any>) || {});
      tr.setNodeMarkup(selectionAny.from, undefined, nextAttrs);
      return true;
    }

    const { $from } = state.selection;
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name !== nodeTypeName) continue;
      const pos = depth > 0 ? $from.before(depth) : 0;
      const nextAttrs = updater((node.attrs as Record<string, any>) || {});
      tr.setNodeMarkup(pos, undefined, nextAttrs);
      return true;
    }

    const nodeAtSelection = state.doc.nodeAt(state.selection.from);
    if (nodeAtSelection?.type?.name === nodeTypeName) {
      const nextAttrs = updater((nodeAtSelection.attrs as Record<string, any>) || {});
      tr.setNodeMarkup(state.selection.from, undefined, nextAttrs);
      return true;
    }

    let closestPos: number | null = null;
    let closestAttrs: Record<string, any> | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    const targetPos = state.selection.from;
    state.doc.descendants((node, pos) => {
      if (node.type.name !== nodeTypeName) return true;
      const distance = Math.abs(pos - targetPos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPos = pos;
        closestAttrs = (node.attrs as Record<string, any>) || {};
      }
      return true;
    });

    if (closestPos !== null && closestAttrs) {
      const nextAttrs = updater(closestAttrs);
      tr.setNodeMarkup(closestPos, undefined, nextAttrs);
      return true;
    }

    return false;
  });
}

function normalizeHiddenColumnsInput(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const tokens = raw
    .split(/[\s,;|]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => String(item));
  if (!tokens.length) return "";
  return `|${Array.from(new Set(tokens)).join("|")}|`;
}

function normalizeColumnWidthsInput(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const parts = raw
    .split(/[\s,;|]+/)
    .map((item) => Number.parseFloat(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.round(item * 100) / 100);
  return Array.from(new Set(parts));
}

function normalizeStackKeyColumnInput(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseHiddenColumnsTokens(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const tokens = raw
    .split(/[\s,;|]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0);
  return Array.from(new Set(tokens));
}

function normalizeColumnWidthsArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.round(item * 100) / 100);
}

function syncTableLayoutAttrs(attrs: Record<string, any>) {
  const desktop = getBpAttrs(attrs, "desktop");
  const tablet = getBpAttrs(attrs, "tablet");
  const mobile = getBpAttrs(attrs, "mobile");
  return {
    ...attrs,
    layout: {
      desktop: {
        renderMode: desktop.renderMode || "table",
        wrap: Boolean(desktop.wrapCells ?? true),
        hideColumns: parseHiddenColumnsTokens(desktop.hiddenColumns),
        columnWidths: normalizeColumnWidthsArray(desktop.columnWidths),
        keyColumn: normalizeStackKeyColumnInput(desktop.stackKeyColumn),
      },
      tablet: {
        renderMode: tablet.renderMode || desktop.renderMode || "table",
        wrap: Boolean(tablet.wrapCells ?? desktop.wrapCells ?? true),
        hideColumns: parseHiddenColumnsTokens(tablet.hiddenColumns),
        columnWidths: normalizeColumnWidthsArray(tablet.columnWidths),
        keyColumn: normalizeStackKeyColumnInput(tablet.stackKeyColumn ?? desktop.stackKeyColumn),
      },
      mobile: {
        renderMode: mobile.renderMode || tablet.renderMode || desktop.renderMode || "stack",
        wrap: Boolean(mobile.wrapCells ?? tablet.wrapCells ?? desktop.wrapCells ?? true),
        hideColumns: parseHiddenColumnsTokens(mobile.hiddenColumns),
        columnWidths: normalizeColumnWidthsArray(mobile.columnWidths),
        keyColumn: normalizeStackKeyColumnInput(
          mobile.stackKeyColumn ?? tablet.stackKeyColumn ?? desktop.stackKeyColumn
        ),
      },
    },
  };
}

function moveSelectedTopLevelBlock(editor: Editor | null, direction: "up" | "down") {
  if (!editor) return false;
  return editor.commands.command(({ tr, state, dispatch }) => {
    const { doc, selection } = state;
    if (doc.childCount <= 1) return false;
    const currentPos =
      selection.$from.depth >= 1
        ? selection.$from.before(1)
        : Math.max(0, selection.from);
    let currentIndex = -1;
    const blocks: Array<{ pos: number; nodeSize: number }> = [];
    let pos = 0;
    doc.forEach((node) => {
      blocks.push({ pos, nodeSize: node.nodeSize });
      pos += node.nodeSize;
    });
    currentIndex = blocks.findIndex((block) => block.pos === currentPos);
    if (currentIndex < 0) return false;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return false;

    const current = blocks[currentIndex];
    const target = blocks[targetIndex];
    const movedSlice = tr.doc.slice(current.pos, current.pos + current.nodeSize);
    tr.delete(current.pos, current.pos + current.nodeSize);

    let insertPos = target.pos;
    if (direction === "down") {
      insertPos = target.pos - current.nodeSize + target.nodeSize;
    }
    tr.insert(insertPos, movedSlice.content);

    const mappedPos = tr.mapping.map(insertPos);
    tr.setSelection(NodeSelection.create(tr.doc, mappedPos));
    if (dispatch) dispatch(tr.scrollIntoView());
    return true;
  });
}

function defaultDoc(meta: EditorMeta) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: meta.targetKeyword ? `Comece falando sobre ${meta.targetKeyword}.` : "Comece a escrever seu review.",
          },
        ],
      },
    ],
  };
}

function normalizeEditorDoc(doc: any) {
  if (!doc || typeof doc !== "object") return doc;
  const clone = Array.isArray(doc) ? [...doc] : { ...doc };

  const walk = (node: any): any => {
    if (!node || typeof node !== "object") return node;
    const next = { ...node };
    if (next.type === "affiliateCta") {
      next.type = "cta_button";
      next.attrs = {
        label: next.attrs?.label ?? "VERIFICAR DISPONIBILIDADE",
        href: next.attrs?.url ?? next.attrs?.href ?? "",
        variant: "amazon_primary",
        size: "md",
        align: "center",
      };
    }
    if (Array.isArray(next.content)) {
      next.content = next.content.map(walk);
    }
    return next;
  };

  return walk(clone);
}

export function AdvancedEditor({ post, silos: initialSilos = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightOccurrenceId = searchParams.get("highlightOccurrenceId");
  const openLinkDialogParam = searchParams.get("openLinkDialog");
  const autoUnlinkParam = searchParams.get("autoUnlink");
  const shouldAutoUnlink = autoUnlinkParam === "1" || autoUnlinkParam === "true";
  const metaFromJson = (post.content_json as any)?.meta ?? {};
  const eeatDefaults = resolveDefaultEeat({
    authorName: post.author_name ?? "",
    expertName: post.expert_name ?? "",
    expertRole: post.expert_role ?? "",
    expertBio: post.expert_bio ?? "",
    expertCredentials: post.expert_credentials ?? "",
    reviewedBy: post.reviewed_by ?? "",
    authorLinks: Array.isArray(metaFromJson.authorLinks) ? metaFromJson.authorLinks : [],
  });
  const [meta, updateMeta] = useReducer(
    (state: EditorMeta, patch: MetaPatch) => ({ ...state, ...patch }),
    {
      title: post.title ?? "",
      metaTitle: post.meta_title ?? post.seo_title ?? post.title ?? "",
      slug: post.slug ?? "",
      targetKeyword: post.target_keyword ?? "",
      metaDescription: post.meta_description ?? "",
      supportingKeywords: Array.isArray(post.supporting_keywords) ? post.supporting_keywords : [],
      entities: Array.isArray(post.entities) ? post.entities : [],
      schemaType: (post.schema_type as EditorMeta["schemaType"]) ?? "article",
      status: (post.status as EditorMeta["status"]) ?? (post.published ? "published" : "draft"),
      scheduledAt: toLocalInput(post.scheduled_at),
      canonicalPath: resolvePostCanonicalPath(post.canonical_path, post.silo?.slug, post.slug),
      heroImageUrl: post.hero_image_url ?? "",
      heroImageAlt: post.hero_image_alt ?? "",
      ogImageUrl: post.og_image_url ?? "",
      images: Array.isArray(post.images) ? (post.images as ImageAsset[]) : [],
      authorName: eeatDefaults.authorName,
      expertName: eeatDefaults.expertName,
      expertRole: eeatDefaults.expertRole,
      expertBio: eeatDefaults.expertBio,
      expertCredentials: eeatDefaults.expertCredentials,
      reviewedBy: eeatDefaults.reviewedBy,
      reviewedAt: toLocalInput(post.reviewed_at),
      authorLinks: eeatDefaults.authorLinks,
      sources: Array.isArray(post.sources) ? post.sources : [],
      faq: Array.isArray(post.faq_json) ? post.faq_json : [],
      howto: Array.isArray(post.howto_json) ? post.howto_json : [],
      amazonProducts: Array.isArray(post.amazon_products) ? post.amazon_products : [],
      siloId: post.silo_id ?? "",
      siloRole: post.silo_role ?? "SUPPORT",
      siloPosition: undefined,
      siloOrder:
        typeof post.silo_order === "number" && Number.isFinite(post.silo_order)
          ? Math.max(0, Math.trunc(post.silo_order))
          : 0,
      showInSiloMenu:
        post.silo_role === "AUX" ? false : typeof post.show_in_silo_menu === "boolean" ? post.show_in_silo_menu : true,
      replaceExistingPillar: false,
    }
  );

  const metaRef = useRef(meta);
  const [silos, setSilos] = useState<Silo[]>(initialSilos);
  const [slugTouched, setSlugTouched] = useState(() => {
    const initialTitle = post.title ?? "";
    const initialSlug = post.slug ?? "";
    return Boolean(initialSlug && slugify(initialTitle) !== initialSlug);
  });
  const [metaTitleTouched, setMetaTitleTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [docJson, setDocJson] = useState<any>(normalizeEditorDoc(post.content_json ?? null));
  const [docHtml, setDocHtml] = useState<string>(post.content_html ?? "");
  const [docText, setDocText] = useState<string>("");
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [pillarConflictPrompt, setPillarConflictPrompt] = useState<PillarConflictPrompt | null>(null);
  const [resolvingPillarConflict, setResolvingPillarConflict] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<{
    from: number;
    to: number;
    originalText: string;
    improvedText: string;
    explanation: string;
    options?: Array<{ improvedText: string; explanation: string }>;
    selectedOptionIndex?: number;
    targetField?: "title" | "metaDescription";
  } | null>(null);

  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const bodyInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDropRef = useRef<((file: File, pos?: number) => void) | null>(null);
  const autoTimer = useRef<NodeJS.Timeout | null>(null);
  const dirtyRef = useRef(false);
  const silosRefreshRef = useRef(false);
  const openedHighlightRef = useRef<string | null>(null);
  const autoUnlinkedOccurrenceRef = useRef<string | null>(null);

  const currentSilo = useMemo(() => {
    if (meta.siloId && silos.length) {
      return silos.find((silo) => silo.id === meta.siloId) ?? null;
    }
    if (post.silo) {
      return { id: post.silo_id ?? "", name: post.silo.name, slug: post.silo.slug } as Silo;
    }
    return null;
  }, [meta.siloId, post.silo, post.silo_id, silos]);

  const siloSlug = currentSilo?.slug ?? "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("editor-preview-mode-change", { detail: previewMode }));
  }, [previewMode]);

  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  useEffect(() => {
    if (!metaTitleTouched && meta.metaTitle !== meta.title) {
      updateMeta({ metaTitle: meta.title });
    }
  }, [meta.title, meta.metaTitle, metaTitleTouched]);

  useEffect(() => {
    const nextCanonicalPath = resolvePostCanonicalPath(meta.canonicalPath, siloSlug, meta.slug);
    if (nextCanonicalPath === meta.canonicalPath) return;

    metaRef.current = { ...metaRef.current, canonicalPath: nextCanonicalPath };
    updateMeta({ canonicalPath: nextCanonicalPath });
  }, [meta.canonicalPath, meta.slug, siloSlug]);

  // HYDRATION: Sync state from 'post' prop if it changes
  useEffect(() => {
    if (!post) return;

    // Parse meta from json if needed
    const metaFromJson = (post.content_json as any)?.meta ?? {};
    const nextEeatDefaults = resolveDefaultEeat({
      authorName: post.author_name ?? "",
      expertName: post.expert_name ?? "",
      expertRole: post.expert_role ?? "",
      expertBio: post.expert_bio ?? "",
      expertCredentials: post.expert_credentials ?? "",
      reviewedBy: post.reviewed_by ?? "",
      authorLinks: Array.isArray(metaFromJson.authorLinks) ? metaFromJson.authorLinks : [],
    });

    updateMeta({
      title: post.title ?? "",
      metaTitle: post.meta_title ?? post.seo_title ?? post.title ?? "",
      slug: post.slug ?? "",
      targetKeyword: post.target_keyword ?? "",
      metaDescription: post.meta_description ?? "",
      supportingKeywords: Array.isArray(post.supporting_keywords) ? post.supporting_keywords : [],
      entities: Array.isArray(post.entities) ? post.entities : [],
      schemaType: (post.schema_type as EditorMeta["schemaType"]) ?? "article",
      status: (post.status as EditorMeta["status"]) ?? (post.published ? "published" : "draft"),
      scheduledAt: toLocalInput(post.scheduled_at),
      canonicalPath: resolvePostCanonicalPath(post.canonical_path, post.silo?.slug, post.slug),
      heroImageUrl: post.hero_image_url ?? "",
      heroImageAlt: post.hero_image_alt ?? "",
      ogImageUrl: post.og_image_url ?? "",
      images: Array.isArray(post.images) ? (post.images as ImageAsset[]) : [],
      authorName: nextEeatDefaults.authorName,
      expertName: nextEeatDefaults.expertName,
      expertRole: nextEeatDefaults.expertRole,
      expertBio: nextEeatDefaults.expertBio,
      amazonProducts: Array.isArray(post.amazon_products) ? post.amazon_products : [],
      expertCredentials: nextEeatDefaults.expertCredentials,
      reviewedBy: nextEeatDefaults.reviewedBy,
      reviewedAt: toLocalInput(post.reviewed_at),
      authorLinks: nextEeatDefaults.authorLinks,
      sources: Array.isArray(post.sources) ? post.sources : [],
      faq: Array.isArray(post.faq_json) ? post.faq_json : [],
      howto: Array.isArray(post.howto_json) ? post.howto_json : [],
      siloId: post.silo_id ?? "",
      siloRole: post.silo_role ?? "SUPPORT",
      siloPosition: undefined,
      siloOrder:
        typeof post.silo_order === "number" && Number.isFinite(post.silo_order)
          ? Math.max(0, Math.trunc(post.silo_order))
          : 0,
      showInSiloMenu:
        post.silo_role === "AUX" ? false : typeof post.show_in_silo_menu === "boolean" ? post.show_in_silo_menu : true,
      replaceExistingPillar: false,
    });

    setDocJson(normalizeEditorDoc(post.content_json ?? null));
    setDocHtml(post.content_html ?? "");
    setSlugTouched(Boolean(post.slug && slugify(post.title ?? "") !== (post.slug ?? "")));

    // Also ensure editor content is updated if editor instance exists? 
    // Usually Tiptap handles content update via useEditor({ content }) but if content changes later need commands.setContent
    // But be careful not to overwrite unsaved changes if 'post' prop updates from a revalidation while editing.
    // For now, assume this effect is mostly for initial hydration or explicit resets.
  }, [post]);

  // Also sync silos if initialSilos changes
  useEffect(() => {
    if (initialSilos.length) setSilos(initialSilos);
  }, [initialSilos]);

  // Load silo organization (role + order + group visibility) from database
  useEffect(() => {
    const activeSiloId = meta.siloId || post.silo_id || "";
    if (!activeSiloId || !post.id) return;

    const controller = new AbortController();

    async function loadHierarchy() {
      try {
        const response = await fetch(`/api/admin/silo-posts?siloId=${activeSiloId}&postId=${post.id}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const data = await response.json();
        if (controller.signal.aborted) return;

        const currentSiloId = metaRef.current.siloId || post.silo_id || "";
        if (currentSiloId !== activeSiloId) {
          return;
        }

        const hasStoredRole = data?.role === "PILLAR" || data?.role === "SUPPORT" || data?.role === "AUX";
        const hasStoredPosition = typeof data?.position === "number" && Number.isFinite(data.position);
        const hasStoredOrder = typeof data?.silo_order === "number" && Number.isFinite(data.silo_order);
        const hasStoredShowInSiloMenu = typeof data?.show_in_silo_menu === "boolean";
        const role = hasStoredRole ? data.role : metaRef.current.siloRole || "SUPPORT";
        const resolvedOrder =
          role === "PILLAR" || role === "AUX"
            ? 0
            : hasStoredOrder
              ? Math.max(0, Math.trunc(data.silo_order))
              : typeof metaRef.current.siloOrder === "number" && Number.isFinite(metaRef.current.siloOrder)
                ? Math.max(0, Math.trunc(metaRef.current.siloOrder))
                  : 0;
        const showInSiloMenu =
          role === "AUX"
            ? false
            : hasStoredShowInSiloMenu
              ? data.show_in_silo_menu
              : typeof metaRef.current.showInSiloMenu === "boolean"
                ? metaRef.current.showInSiloMenu
                : true;

        updateMeta({
          siloRole: role,
          siloPosition: hasStoredPosition
            ? Math.max(1, Math.trunc(data.position))
            : metaRef.current.siloPosition,
          siloOrder: resolvedOrder,
          showInSiloMenu,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Erro ao carregar hierarquia do silo:", error);
      }
    }

    void loadHierarchy();
    return () => controller.abort();
  }, [meta.siloId, post]);

  useEffect(() => {
    if (!slugTouched) {
      const next = slugify(meta.title);
      if (next && next !== meta.slug) {
        updateMeta({ slug: next });
      }
    }
  }, [meta.title, meta.slug, slugTouched]);

  useEffect(() => {
      const slug = normalizeSlugInput(meta.slug);
      if (!slug) {
        setSlugStatus("idle");
        return;
      }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setSlugStatus("checking");
      const params = new URLSearchParams({
        slug,
        siloId: meta.siloId ?? "",
        id: post.id,
      });
      fetch(`/api/admin/slug-check?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data?.available) {
            setSlugStatus("ok");
          } else {
            setSlugStatus("taken");
          }
        })
        .catch(() => setSlugStatus("idle"));
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [meta.slug, meta.siloId, post.id]);

  const refreshSilos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/silos");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        setSilos(data.items);
      }
    } catch {
      return;
    }
  }, []);

  const createSilo = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const res = await fetch("/api/admin/silos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const item = data?.item as Silo | undefined;
      if (item) {
        setSilos((prev) => (prev.some((silo) => silo.id === item.id) ? prev : [...prev, item]));
      }
      return item ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (silos.length > 0) return;
    if (silosRefreshRef.current) return;
    silosRefreshRef.current = true;
    void refreshSilos();
  }, [refreshSilos, silos.length]);

  const editorExtensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      LockedTable.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      EntityLink.configure({ openOnClick: false }),
      EditorImage,
      YoutubeEmbed,
      InternalLinkMention,
      InternalLinkCandidate,
      FindInContent,
      AffiliateProductCard,
      CtaButton,
      FaqBlock,
      IconBlock,
      CarouselBlock,
      Placeholder.configure({
        placeholder: "Escreva aqui. Use a barra fixa para inserir blocos.",
      }),
    ],
    []
  );

  const initialEditorContent = useMemo(
    () =>
      normalizeEditorDoc(post.content_json) ||
      post.content_html ||
      defaultDoc({ ...(metaRef.current as EditorMeta), targetKeyword: post.target_keyword ?? "" }),
    [post.content_json, post.content_html, post.target_keyword]
  );

  const handleEditorDrop = useCallback((view: any, event: DragEvent) => {
    const hasFiles = event.dataTransfer?.files && event.dataTransfer.files.length > 0;
    if (!hasFiles) return false;
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return false;
    event.preventDefault();
    const coords = { left: event.clientX, top: event.clientY };
    const pos = view.posAtCoords(coords)?.pos;
    if (!pos) return false;
    uploadDropRef.current?.(file, pos);
    return true;
  }, []);

  const handleEditorUpdate = useCallback(({ editor: currentEditor }: { editor: Editor }) => {
    setDocJson(currentEditor.getJSON());
    setDocHtml(currentEditor.getHTML());
    setDocText(currentEditor.getText());
    setOutline(extractOutline(currentEditor));
    setLinks(extractLinks(currentEditor));
    dirtyRef.current = true;
  }, []);

  const editorOptions = useMemo(
    () => ({
      immediatelyRender: false,
      extensions: editorExtensions,
      content: initialEditorContent,
      editorProps: {
        attributes: {
          class: "editor-content min-h-[520px] outline-none prose max-w-none",
        },
        transformPastedHTML: (html: string) => transformGoogleDocsPaste(html),
        handleDrop: handleEditorDrop,
      },
      onUpdate: handleEditorUpdate,
    }),
    [editorExtensions, handleEditorDrop, handleEditorUpdate, initialEditorContent]
  );

  const editor = useEditor(editorOptions, [post.id]);

  useEffect(() => {
    if (editor && activeSuggestion) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: activeSuggestion.from, to: activeSuggestion.to })
        .scrollIntoView()
        .run();
    }
  }, [editor, activeSuggestion]);

  useEffect(() => {
    if (!editor || !highlightOccurrenceId) return;
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(`/api/admin/link-occurrences/${highlightOccurrenceId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const occurrence = data?.occurrence as HighlightOccurrence | undefined;
        if (!occurrence) return;
        setTimeout(() => {
          if (editor.isDestroyed) return;
          const highlighted = highlightOccurrenceInEditor(editor, occurrence);
          if (highlighted && shouldAutoUnlink && autoUnlinkedOccurrenceRef.current !== highlightOccurrenceId) {
            autoUnlinkedOccurrenceRef.current = highlightOccurrenceId;
            const removed = editor.chain().focus().extendMarkRange("link").unsetLink().run();
            if (!removed) {
              const { from, to } = editor.state.selection;
              if (to > from) {
                const plainText = editor.state.doc.textBetween(from, to, " ", " ");
                editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, plainText).run();
              }
            }
            return;
          }
          if (highlighted && openLinkDialogParam && openedHighlightRef.current !== highlightOccurrenceId) {
            openedHighlightRef.current = highlightOccurrenceId;
            setLinkDialogOpen(true);
          }
        }, 200);
      } catch (error) {
        console.error("Erro ao buscar ocorrência para highlight:", error);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [editor, highlightOccurrenceId, openLinkDialogParam, shouldAutoUnlink]);

  useEffect(() => {
    if (!editor) return;
    setOutline(extractOutline(editor));
    setLinks(extractLinks(editor));
    setDocJson(editor.getJSON());
    setDocHtml(editor.getHTML());
    setDocText(editor.getText());
    dirtyRef.current = true;
  }, [editor]);

  useEffect(() => {
    const nextImages = buildActiveImageLibrary(
      metaRef.current.images ?? [],
      docJson,
      metaRef.current.heroImageUrl,
      metaRef.current.heroImageAlt
    );
    if (areImageAssetsEqual(metaRef.current.images ?? [], nextImages)) return;

    dirtyRef.current = true;
    metaRef.current = { ...metaRef.current, images: nextImages };
    updateMeta({ images: nextImages });
  }, [docJson, meta.heroImageAlt, meta.heroImageUrl]);

  const handleMetaChange = useCallback(
    (patch: MetaPatch) => {
      if (typeof patch.slug === "string") setSlugTouched(true);
      if (typeof patch.metaTitle === "string") setMetaTitleTouched(true);
      dirtyRef.current = true;
      metaRef.current = { ...metaRef.current, ...patch };
      updateMeta(patch);
    },
    [updateMeta]
  );

  const uploadFile = useCallback(
    async (file: File, options: { alt: string; kind: "hero" | "body"; width?: number; height?: number }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("postId", post.id);
      formData.append("siloSlug", siloSlug);
      formData.append("postSlug", metaRef.current.slug || post.slug);
      formData.append("alt", options.alt);
      formData.append("kind", options.kind);
      if (options.width) formData.append("width", String(options.width));
      if (options.height) formData.append("height", String(options.height));

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Upload failed");
      }

      return (await res.json()) as {
        url: string;
        fileName?: string;
        width?: number;
        height?: number;
        createdAt?: string;
      };
    },
    [post.id, post.slug, siloSlug]
  );

  const uploadHero = useCallback(
    async (file: File) => {
      try {
        const alt = metaRef.current.heroImageAlt || metaRef.current.title || "Hero image";
        const metaData = await readImageMeta(file);
        const result = await uploadFile(file, { alt, kind: "hero", width: metaData.width, height: metaData.height });
        const nextImages = buildActiveImageLibrary(
          [
            ...(metaRef.current.images ?? []),
            {
              url: result.url,
              alt,
              width: result.width ?? metaData.width,
              height: result.height ?? metaData.height,
              fileName: result.fileName,
              createdAt: result.createdAt,
            },
          ],
          editor ? editor.getJSON() : docJson,
          result.url,
          alt
        );

        handleMetaChange({
          heroImageUrl: result.url,
          ogImageUrl: metaRef.current.ogImageUrl || result.url,
          heroImageAlt: alt,
          images: nextImages,
        });
      } catch (error: any) {
        console.error("Falha ao enviar imagem de capa", error);
        const message =
          typeof error?.message === "string" && error.message.trim()
            ? error.message
            : "Nao foi possivel enviar a imagem de capa.";
        alert(message);
      }
    },
    [docJson, editor, handleMetaChange, uploadFile]
  );

  const uploadAndInsertImage = useCallback(
    async (file: File, insertPos?: number) => {
      if (!editor) return;
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const localUrl = URL.createObjectURL(file);
      const metaData = await readImageMeta(file);
      const alt = metaRef.current.title ? `${metaRef.current.title} imagem` : "Imagem";

      const attrs = {
        src: localUrl,
        alt,
        title: "",
        width: metaData.width || null,
        height: metaData.height || null,
        "data-id": uploadId,
        "data-uploading": "true",
        align: "center",
        "data-align": "center",
        widthMode: "content",
        maxWidth: null,
        wrap: "none",
        spacingY: "md",
        visibleDesktop: true,
        visibleTablet: true,
        visibleMobile: true,
        responsive: null,
        "data-tablet-align": null,
        "data-mobile-align": null,
      };

      if (typeof insertPos === "number") {
        editor.chain().focus().insertContentAt(insertPos, { type: "image", attrs }).run();
      } else {
        editor.chain().focus().insertContent({ type: "image", attrs }).run();
      }

      try {
        const result = await uploadFile(file, { alt, kind: "body", width: metaData.width, height: metaData.height });
        updateImageById(editor, uploadId, {
          src: result.url,
          "data-uploading": null,
          width: result.width ?? metaData.width ?? null,
          height: result.height ?? metaData.height ?? null,
        });

        const nextImages = [
          ...metaRef.current.images,
          {
            url: result.url,
            alt,
            width: result.width ?? metaData.width,
            height: result.height ?? metaData.height,
            fileName: result.fileName,
            createdAt: result.createdAt,
          },
        ];
        updateMeta({
          images: buildActiveImageLibrary(
            nextImages,
            editor.getJSON(),
            metaRef.current.heroImageUrl,
            metaRef.current.heroImageAlt
          ),
        });
      } finally {
        URL.revokeObjectURL(localUrl);
      }
    },
    [editor, uploadFile]
  );

  useEffect(() => {
    uploadDropRef.current = uploadAndInsertImage;
  }, [uploadAndInsertImage]);

  const onInsertImage = useCallback(
    (asset: ImageAsset) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src: asset.url,
            alt: asset.alt,
            width: asset.width ?? null,
            height: asset.height ?? null,
            align: "center",
            "data-align": "center",
            widthMode: "content",
            maxWidth: null,
            wrap: "none",
            spacingY: "md",
            visibleDesktop: true,
            visibleTablet: true,
            visibleMobile: true,
            responsive: null,
            "data-tablet-align": null,
            "data-mobile-align": null,
          },
        })
        .run();
    },
    [editor]
  );

  const onUpdateImageAlt = useCallback(
    (url: string, alt: string) => {
      const nextImages = metaRef.current.images.map((image) => (image.url === url ? { ...image, alt } : image));
      updateMeta({ images: nextImages });
      updateImageBySrc(editor, url, { alt });
    },
    [editor]
  );

  const onRemoveImage = useCallback(
    (url: string) => {
      const nextHeroImageUrl = metaRef.current.heroImageUrl === url ? "" : metaRef.current.heroImageUrl;
      const nextHeroImageAlt = metaRef.current.heroImageUrl === url ? "" : metaRef.current.heroImageAlt;
      const nextImages = buildActiveImageLibrary(
        metaRef.current.images.filter((image) => image.url !== url),
        editor ? editor.getJSON() : docJson,
        nextHeroImageUrl,
        nextHeroImageAlt
      );

      updateMeta({
        heroImageUrl: nextHeroImageUrl,
        heroImageAlt: nextHeroImageAlt,
        images: nextImages,
      });
    },
    [docJson, editor]
  );

  const onUpdateImageResponsive = useCallback(
    (patch: {
      align?: "left" | "center" | "right";
      widthMode?: "full" | "content" | "px";
      maxWidth?: number | null;
      wrap?: "none" | "wrap-left" | "wrap-right";
      spacingY?: "none" | "sm" | "md" | "lg";
    }) => {
      if (!editor) return;
      const mode = previewMode as ResponsiveMode;
      updateClosestNodeAttrs(editor, "image", (attrs) => {
        const withBaseAlign = { ...attrs, align: attrs.align ?? attrs["data-align"] ?? "center" };
        const next = setBpAttrs(withBaseAlign, mode, patch, {
          legacyMap: {
            align: { tablet: "data-tablet-align", mobile: "data-mobile-align" },
          },
        });

        if (mode === "desktop" && typeof patch.align === "string") {
          next["data-align"] = patch.align;
        }
        return next;
      });
    },
    [editor, previewMode]
  );

  const onUpdateImageVisibility = useCallback(
    (patch: { desktop?: boolean; tablet?: boolean; mobile?: boolean }) => {
      if (!editor) return;
      updateClosestNodeAttrs(editor, "image", (attrs) =>
        setDeviceVisibility(attrs, patch)
      );
    },
    [editor]
  );

  const onResetImageResponsive = useCallback(
    (fields?: Array<"align" | "widthMode" | "maxWidth" | "wrap" | "spacingY">) => {
      if (!editor) return;
      if (previewMode === "desktop") return;
      updateClosestNodeAttrs(editor, "image", (attrs) => {
        const keys = fields ?? ["align", "widthMode", "maxWidth", "wrap", "spacingY"];
        const next = inheritDesktopToBp(attrs, previewMode, keys, {
          legacyMap: { align: { tablet: "data-tablet-align", mobile: "data-mobile-align" } },
        });
        return next;
      });
    },
    [editor, previewMode]
  );

  const onClearImageResponsive = useCallback(
    (fields?: Array<"align" | "widthMode" | "maxWidth" | "wrap" | "spacingY">) => {
      if (!editor) return;
      if (previewMode === "desktop") return;
      updateClosestNodeAttrs(editor, "image", (attrs) => {
        const keys = fields ?? ["align", "widthMode", "maxWidth", "wrap", "spacingY"];
        const patch = keys.reduce<Record<string, any>>((acc, key) => {
          acc[key] = undefined;
          return acc;
        }, {});
        return setBpAttrs(attrs, previewMode, patch, {
          legacyMap: { align: { tablet: "data-tablet-align", mobile: "data-mobile-align" } },
        });
      });
    },
    [editor, previewMode]
  );

  const onAlignImage = useCallback(
    (align: "left" | "center" | "right") => {
      onUpdateImageResponsive({ align });
    },
    [onUpdateImageResponsive]
  );

  const onInsertProduct = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "affiliateProduct",
        attrs: {
          title: "Produto",
          image: "",
          price: "",
          rating: 0,
          features: ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
          href: "",
          visibleDesktop: true,
          visibleTablet: true,
          visibleMobile: true,
        },
      })
      .run();
  }, [editor]);

  const onInsertYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL do YouTube");
    if (url === null) return;
    const normalized = normalizeYoutubeUrl(url);
    editor.chain().focus().insertContent({ type: "youtubeEmbed", attrs: { src: normalized } }).run();
  }, [editor]);

  const onInsertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .updateAttributes("table", {
        renderMode: "table",
        renderModeTablet: null,
        renderModeMobile: "stack",
        wrapCells: true,
        wrapCellsTablet: null,
        wrapCellsMobile: null,
        hiddenColumns: "",
        hiddenColumnsTablet: null,
        hiddenColumnsMobile: null,
        columnWidths: [],
        columnWidthsTablet: null,
        columnWidthsMobile: null,
        stackKeyColumn: null,
        stackKeyColumnTablet: null,
        stackKeyColumnMobile: 2,
        visibleDesktop: true,
        visibleTablet: true,
        visibleMobile: true,
        responsive: { mobile: { renderMode: "stack", stackKeyColumn: 2 } },
        layout: {
          desktop: { renderMode: "table", wrap: true, hideColumns: [], columnWidths: [], keyColumn: null },
          tablet: { renderMode: "table", wrap: true, hideColumns: [], columnWidths: [], keyColumn: null },
          mobile: { renderMode: "stack", wrap: true, hideColumns: [], columnWidths: [], keyColumn: 2 },
        },
      })
      .run();
  }, [editor]);

  const onUpdateTableResponsive = useCallback(
    (patch: {
      renderMode?: "table" | "scroll" | "stack";
      wrapCells?: boolean;
      hiddenColumns?: string;
      columnWidths?: string | number[];
      stackKeyColumn?: number | null;
    }) => {
      if (!editor) return;
      const mode = previewMode as ResponsiveMode;
      const normalizedPatch: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(patch, "renderMode")) {
        normalizedPatch.renderMode = patch.renderMode;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "wrapCells")) {
        normalizedPatch.wrapCells = patch.wrapCells;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "hiddenColumns")) {
        normalizedPatch.hiddenColumns =
          typeof patch.hiddenColumns === "string"
            ? normalizeHiddenColumnsInput(patch.hiddenColumns)
            : patch.hiddenColumns;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "columnWidths")) {
        normalizedPatch.columnWidths =
          typeof patch.columnWidths === "string"
            ? normalizeColumnWidthsInput(patch.columnWidths)
            : Array.isArray(patch.columnWidths)
              ? patch.columnWidths.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
              : patch.columnWidths;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "stackKeyColumn")) {
        normalizedPatch.stackKeyColumn = normalizeStackKeyColumnInput(patch.stackKeyColumn);
      }
      updateClosestNodeAttrs(editor, "table", (attrs) =>
        syncTableLayoutAttrs(
          setBpAttrs(attrs, mode, normalizedPatch as Record<string, any>, {
            legacyMap: {
              renderMode: { tablet: "renderModeTablet", mobile: "renderModeMobile" },
              wrapCells: { tablet: "wrapCellsTablet", mobile: "wrapCellsMobile" },
              hiddenColumns: { tablet: "hiddenColumnsTablet", mobile: "hiddenColumnsMobile" },
              columnWidths: { tablet: "columnWidthsTablet", mobile: "columnWidthsMobile" },
              stackKeyColumn: { tablet: "stackKeyColumnTablet", mobile: "stackKeyColumnMobile" },
            },
          })
        )
      );
    },
    [editor, previewMode]
  );

  const onUpdateTableVisibility = useCallback(
    (patch: { desktop?: boolean; tablet?: boolean; mobile?: boolean }) => {
      if (!editor) return;
      updateClosestNodeAttrs(editor, "table", (attrs) =>
        syncTableLayoutAttrs(setDeviceVisibility(attrs, patch))
      );
    },
    [editor]
  );

  const onSetTableRenderMode = useCallback(
    (renderMode: "table" | "scroll" | "stack") => {
      onUpdateTableResponsive({ renderMode });
    },
    [onUpdateTableResponsive]
  );

  const onApplyTableMobileSlide = useCallback(() => {
    if (!editor) return;
    updateClosestNodeAttrs(editor, "table", (attrs) =>
      syncTableLayoutAttrs(
        setBpAttrs(
          attrs,
          "mobile",
          {
            renderMode: "scroll",
            wrapCells: false,
          },
          {
            legacyMap: {
              renderMode: { tablet: "renderModeTablet", mobile: "renderModeMobile" },
              wrapCells: { tablet: "wrapCellsTablet", mobile: "wrapCellsMobile" },
              hiddenColumns: { tablet: "hiddenColumnsTablet", mobile: "hiddenColumnsMobile" },
              columnWidths: { tablet: "columnWidthsTablet", mobile: "columnWidthsMobile" },
              stackKeyColumn: { tablet: "stackKeyColumnTablet", mobile: "stackKeyColumnMobile" },
            },
          }
        )
      )
    );
  }, [editor]);

  const onApplyTableMobileCards = useCallback(() => {
    if (!editor) return;
    updateClosestNodeAttrs(editor, "table", (attrs) =>
      syncTableLayoutAttrs(
        setBpAttrs(
          attrs,
          "mobile",
          {
            renderMode: "stack",
            wrapCells: true,
          },
          {
            legacyMap: {
              renderMode: { tablet: "renderModeTablet", mobile: "renderModeMobile" },
              wrapCells: { tablet: "wrapCellsTablet", mobile: "wrapCellsMobile" },
              hiddenColumns: { tablet: "hiddenColumnsTablet", mobile: "hiddenColumnsMobile" },
              columnWidths: { tablet: "columnWidthsTablet", mobile: "columnWidthsMobile" },
              stackKeyColumn: { tablet: "stackKeyColumnTablet", mobile: "stackKeyColumnMobile" },
            },
          }
        )
      )
    );
  }, [editor]);

  const onResetTableResponsive = useCallback(
    (fields?: Array<"renderMode" | "wrapCells" | "hiddenColumns" | "columnWidths" | "stackKeyColumn">) => {
      if (!editor) return;
      if (previewMode === "desktop") return;
      updateClosestNodeAttrs(editor, "table", (attrs) => {
        const keys = fields ?? ["renderMode", "wrapCells", "hiddenColumns", "columnWidths", "stackKeyColumn"];
        return syncTableLayoutAttrs(
          inheritDesktopToBp(attrs, previewMode, keys, {
            legacyMap: {
              renderMode: { tablet: "renderModeTablet", mobile: "renderModeMobile" },
              wrapCells: { tablet: "wrapCellsTablet", mobile: "wrapCellsMobile" },
              hiddenColumns: { tablet: "hiddenColumnsTablet", mobile: "hiddenColumnsMobile" },
              columnWidths: { tablet: "columnWidthsTablet", mobile: "columnWidthsMobile" },
              stackKeyColumn: { tablet: "stackKeyColumnTablet", mobile: "stackKeyColumnMobile" },
            },
          })
        );
      });
    },
    [editor, previewMode]
  );

  const onClearTableResponsive = useCallback(
    (fields?: Array<"renderMode" | "wrapCells" | "hiddenColumns" | "columnWidths" | "stackKeyColumn">) => {
      if (!editor) return;
      if (previewMode === "desktop") return;
      updateClosestNodeAttrs(editor, "table", (attrs) => {
        const keys = fields ?? ["renderMode", "wrapCells", "hiddenColumns", "columnWidths", "stackKeyColumn"];
        const patch = keys.reduce<Record<string, any>>((acc, key) => {
          acc[key] = undefined;
          return acc;
        }, {});
        return syncTableLayoutAttrs(
          setBpAttrs(attrs, previewMode, patch, {
            legacyMap: {
              renderMode: { tablet: "renderModeTablet", mobile: "renderModeMobile" },
              wrapCells: { tablet: "wrapCellsTablet", mobile: "wrapCellsMobile" },
              hiddenColumns: { tablet: "hiddenColumnsTablet", mobile: "hiddenColumnsMobile" },
              columnWidths: { tablet: "columnWidthsTablet", mobile: "columnWidthsMobile" },
              stackKeyColumn: { tablet: "stackKeyColumnTablet", mobile: "stackKeyColumnMobile" },
            },
          })
        );
      });
    },
    [editor, previewMode]
  );

  const onResetTableRenderMode = useCallback(() => {
    onResetTableResponsive(["renderMode"]);
  }, [onResetTableResponsive]);

  const onMoveBlockUp = useCallback(() => {
    moveSelectedTopLevelBlock(editor, "up");
  }, [editor]);

  const onMoveBlockDown = useCallback(() => {
    moveSelectedTopLevelBlock(editor, "down");
  }, [editor]);

  const onInsertFaq = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "faq_block",
        attrs: {
          items: [
            { question: "Qual o melhor produto para iniciantes?", answer: "Escolha modelos com uso simples e boa reputação." },
            { question: "Vale a pena pagar mais caro?", answer: "Depende da frequência de uso e da durabilidade esperada." },
          ],
          renderMode: "expanded",
          visibleDesktop: true,
          visibleTablet: true,
          visibleMobile: true,
          responsive: null,
        },
      })
      .run();
  }, [editor]);

  const onInsertIconBlock = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "icon_block",
        attrs: {
          title: "Destaques",
          items: [
            { icon: "check", text: "Beneficio 1" },
            { icon: "check", text: "Beneficio 2" },
            { icon: "star", text: "Diferencial" },
          ],
          align: "left",
          widthMode: "content",
          spacingY: "md",
          visibleDesktop: true,
          visibleTablet: true,
          visibleMobile: true,
          responsive: null,
        },
      })
      .run();
  }, [editor]);

  const onInsertCarouselBlock = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "carousel_block",
        attrs: {
          title: "Galeria",
          slides: [
            { image: "", caption: "Slide 1" },
            { image: "", caption: "Slide 2" },
          ],
          align: "left",
          widthMode: "content",
          slidesPerView: 1,
          spacingY: "md",
          visibleDesktop: true,
          visibleTablet: true,
          visibleMobile: true,
          responsive: {
            tablet: { slidesPerView: 2 },
            mobile: { slidesPerView: 1 },
          },
        },
      })
      .run();
  }, [editor]);

  const onInsertCallout = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .toggleBlockquote()
      .run();
  }, [editor]);

  const onSelectLink = useCallback(
    (link: LinkItem) => {
      if (!editor) return;
      editor.commands.focus();
      editor.commands.setTextSelection({ from: link.from, to: link.to });
    },
    [editor]
  );

  const onJumpToHeading = useCallback(
    (pos: number) => {
      if (!editor) return;
      editor.commands.focus();
      editor.commands.setTextSelection(pos);
    },
    [editor]
  );

  const savePost = useCallback(
    async (
      nextStatus?: EditorMeta["status"],
      options?: {
        forceReplacePillar?: boolean;
        refreshAfterSave?: boolean;
        suppressConflictModal?: boolean;
      }
    ) => {
      const statusToSave = nextStatus ?? metaRef.current.status;
      const canonicalPath = buildPostCanonicalPath(siloSlug, metaRef.current.slug);
      const role = metaRef.current.siloRole ?? "SUPPORT";
      const isPillarRole = role === "PILLAR";
      const isAuxRole = role === "AUX";

      const currentJson = editor ? editor.getJSON() : docJson;
      const currentHtml = editor ? editor.getHTML() : docHtml;
      const enrichedJson =
        currentJson && typeof currentJson === "object"
          ? {
              ...currentJson,
              meta: {
                ...(currentJson.meta ?? {}),
                authorLinks: metaRef.current.authorLinks,
                manualEdits: true,
                lastEditedAt: new Date().toISOString(),
              },
            }
          : { type: "doc", content: [], meta: { authorLinks: metaRef.current.authorLinks } };

      const safeContentJson = JSON.parse(JSON.stringify(enrichedJson ?? null));
      const activeImages = buildActiveImageLibrary(
        metaRef.current.images ?? [],
        safeContentJson,
        metaRef.current.heroImageUrl,
        metaRef.current.heroImageAlt
      );
      const computedSiloOrder =
        typeof metaRef.current.siloOrder === "number" && Number.isFinite(metaRef.current.siloOrder)
          ? Math.max(0, Math.trunc(metaRef.current.siloOrder))
          : 0;
      const siloOrder = isPillarRole || isAuxRole ? 0 : computedSiloOrder;
      const showInSiloMenu =
        isPillarRole
          ? true
          : isAuxRole
            ? false
            : typeof metaRef.current.showInSiloMenu === "boolean"
              ? metaRef.current.showInSiloMenu
              : true;
      const siloId = metaRef.current.siloId || post.silo_id || "";
      if (!siloId) {
        alert("Selecione um silo no painel Organizacao antes de salvar.");
        return;
      }

      const normalizedSlug = normalizeSlugInput(metaRef.current.slug);
      if (normalizedSlug.length < 3) {
        alert("Slug invalido. Use letras minusculas, numeros, hifen ou underline.");
        updateMeta({ slug: normalizedSlug });
        return;
      }
      if (normalizedSlug !== metaRef.current.slug) {
        metaRef.current = { ...metaRef.current, slug: normalizedSlug };
        updateMeta({ slug: normalizedSlug });
      }

      const payload = {
        id: post.id,
        silo_id: siloId,
        silo_role: role,
        silo_position: isPillarRole ? null : metaRef.current.siloPosition || null,
        title: metaRef.current.title,
        seo_title: metaRef.current.metaTitle || metaRef.current.title,
        meta_title: metaRef.current.metaTitle || metaRef.current.title,
        slug: normalizedSlug,
        target_keyword: metaRef.current.targetKeyword,
        supporting_keywords: metaRef.current.supportingKeywords ?? [],
        silo_order: siloOrder,
        show_in_silo_menu: showInSiloMenu,
        replace_existing_pillar: Boolean(options?.forceReplacePillar || metaRef.current.replaceExistingPillar),
        meta_description: metaRef.current.metaDescription || null,
        canonical_path: canonicalPath,
        entities: metaRef.current.entities ?? [],
        schema_type: metaRef.current.schemaType,
        faq_json: metaRef.current.faq ?? [],
        howto_json: metaRef.current.howto ?? [],
        hero_image_url: metaRef.current.heroImageUrl || null,
        hero_image_alt: metaRef.current.heroImageAlt || null,
        og_image_url: metaRef.current.ogImageUrl || null,
        images: activeImages,
        author_name: metaRef.current.authorName || null,
        expert_name: metaRef.current.expertName || null,
        expert_role: metaRef.current.expertRole || null,
        expert_bio: metaRef.current.expertBio || null,
        expert_credentials: metaRef.current.expertCredentials || null,
        reviewed_by: metaRef.current.reviewedBy || null,
        reviewed_at: toIsoString(metaRef.current.reviewedAt) ?? null,
        sources: metaRef.current.sources ?? [],
        scheduled_at: toIsoString(metaRef.current.scheduledAt) ?? null,
        status: statusToSave,
        content_json: safeContentJson,
        content_html: currentHtml,
        amazon_products: extractAffiliateProducts(enrichedJson),
      };

      setSaving(true);
      try {
        await saveEditorPost(payload);
        setLastSavedAt(new Date());
        dirtyRef.current = false;
        setPillarConflictPrompt(null);
        if (options?.refreshAfterSave) {
          startTransition(() => {
            router.refresh();
          });
        }

        const patch: MetaPatch = {
          replaceExistingPillar: false,
          images: activeImages,
        };
        if (isPillarRole || isAuxRole) {
          patch.siloOrder = 0;
          patch.showInSiloMenu = isPillarRole ? true : false;
        }
        if (nextStatus) patch.status = nextStatus;
        updateMeta(patch);
      } catch (error: any) {
        const conflict = parsePillarConflictError(error);
        if (conflict) {
          if (!options?.suppressConflictModal) {
            setPillarConflictPrompt({
              ...conflict,
              pendingStatus: nextStatus,
            });
          }
          return;
        }

        console.error("Falha ao salvar post", error);
        const message = typeof error?.message === "string" ? error.message : "Não foi possível salvar o rascunho.";
        alert(message);
        return;
      } finally {
        setSaving(false);
      }
    },
    [docHtml, docJson, editor, post.id, post.silo_id, router, siloSlug]
  );

  const onSave = useCallback(
    async (nextStatus?: EditorMeta["status"]) => {
      await savePost(nextStatus, { refreshAfterSave: true, suppressConflictModal: false });
    },
    [savePost]
  );

  useEffect(() => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
    }
    if (saving) return;
    if (!dirtyRef.current) return;
    autoTimer.current = setTimeout(() => {
      void savePost(undefined, { suppressConflictModal: true }).catch(() => undefined);
    }, 12000);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [docHtml, docJson, meta, savePost, saving]);

  const dismissPillarConflictPrompt = useCallback(() => {
    if (resolvingPillarConflict) return;
    setPillarConflictPrompt(null);
    updateMeta({ replaceExistingPillar: false });
  }, [resolvingPillarConflict, updateMeta]);

  const confirmPillarReplacement = useCallback(async () => {
    if (!pillarConflictPrompt || resolvingPillarConflict) return;
    setResolvingPillarConflict(true);
    try {
      await savePost(pillarConflictPrompt.pendingStatus, {
        forceReplacePillar: true,
        refreshAfterSave: true,
        suppressConflictModal: true,
      });
      setPillarConflictPrompt(null);
      updateMeta({ replaceExistingPillar: false });
    } catch {
      return;
    } finally {
      setResolvingPillarConflict(false);
    }
  }, [pillarConflictPrompt, resolvingPillarConflict, savePost, updateMeta]);

  const openHeroPicker = useCallback(() => heroInputRef.current?.click(), []);
  const openMediaPicker = useCallback(() => bodyInputRef.current?.click(), []);
  const openLinkDialog = useCallback(() => setLinkDialogOpen(true), []);

  const onApplySuggestion = useCallback(() => {
    if (!editor || !activeSuggestion) return;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: activeSuggestion.from, to: activeSuggestion.to })
      .insertContent(activeSuggestion.improvedText)
      .run();
    setActiveSuggestion(null);
  }, [editor, activeSuggestion]);

  const onDiscardSuggestion = useCallback(() => {
    setActiveSuggestion(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      editor,
      postId: post.id,
      meta,
      setMeta: handleMetaChange,
      outline,
      links,
      docText,
      docHtml,
      silos,
      refreshSilos,
      createSilo,
      slugStatus,
      saving,
      previewMode,
      setPreviewMode,
      lastSavedAt,
      onSave,
      activeSuggestion,
      setActiveSuggestion,
      onApplySuggestion,
      onDiscardSuggestion,
      onHeroUpload: uploadHero,
      onOpenHeroPicker: openHeroPicker,
      onOpenMedia: openMediaPicker,
      onOpenLinkDialog: openLinkDialog,
      onInsertProduct,
      onInsertYoutube,
      onInsertTable,
      onInsertSection: () => undefined,
      onInsertCallout,
      onInsertFaq,
      onInsertIconBlock,
      onInsertCarouselBlock,
      onInsertHowTo: () => undefined,
      onInsertCtaBest: () => undefined,
      onInsertCtaValue: () => undefined,
      onInsertCtaTable: () => undefined,
      onAlignImage,
      onUpdateImageResponsive,
      onUpdateImageVisibility,
      onResetImageResponsive,
      onClearImageResponsive,
      onSetTableRenderMode,
      onApplyTableMobileSlide,
      onApplyTableMobileCards,
      onResetTableRenderMode,
      onUpdateTableResponsive,
      onUpdateTableVisibility,
      onResetTableResponsive,
      onClearTableResponsive,
      onMoveBlockUp,
      onMoveBlockDown,
      onSelectLink,
      onInsertImage,
      onUpdateImageAlt,
      onRemoveImage,
      onJumpToHeading,
    }),
    [
      editor,
      post.id,
      meta,
      handleMetaChange,
      outline,
      links,
      docText,
      docHtml,
      silos,
      refreshSilos,
      createSilo,
      slugStatus,
      saving,
      previewMode,
      setPreviewMode,
      lastSavedAt,
      onSave,
      activeSuggestion,
      onApplySuggestion,
      onDiscardSuggestion,
      uploadHero,
      openHeroPicker,
      openMediaPicker,
      openLinkDialog,
      onInsertProduct,
      onInsertYoutube,
      onInsertTable,
      onInsertCallout,
      onInsertFaq,
      onInsertIconBlock,
      onInsertCarouselBlock,
      onAlignImage,
      onUpdateImageResponsive,
      onUpdateImageVisibility,
      onResetImageResponsive,
      onClearImageResponsive,
      onSetTableRenderMode,
      onApplyTableMobileSlide,
      onApplyTableMobileCards,
      onResetTableRenderMode,
      onUpdateTableResponsive,
      onUpdateTableVisibility,
      onResetTableResponsive,
      onClearTableResponsive,
      onMoveBlockUp,
      onMoveBlockDown,
      onSelectLink,
      onInsertImage,
      onUpdateImageAlt,
      onRemoveImage,
      onJumpToHeading,
    ]
  );

  return (
    <EditorProvider value={contextValue}>
      <div className="flex h-full min-h-0 min-w-0 w-full overflow-hidden bg-(--bg) text-(--text)">
        <ContentIntelligence />

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <EditorCanvas />
          <AdvancedLinkDialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} />
          <LinkBubbleMenu editor={editor} onOpenLinkDialog={() => setLinkDialogOpen(true)} />
          <EditorBubbleMenu editor={editor} onOpenLinkDialog={() => setLinkDialogOpen(true)} />
          <InternalLinkCandidateMenu editor={editor} />
        </div>

        <EditorInspector />

        <input
          ref={heroInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void uploadHero(file);
          }}
        />

        <input
          ref={bodyInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void uploadAndInsertImage(file);
          }}
        />

        {pillarConflictPrompt ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-lg rounded-xl border border-(--border) bg-(--surface) p-5 shadow-2xl">
              <h3 className="text-base font-semibold text-(--text)">Substituir pilar do silo?</h3>
              <p className="mt-2 text-sm text-(--muted)">
                Já existe um pilar em <strong>{currentSilo?.name ?? "este silo"}</strong>. Ao confirmar, o pilar atual
                vira <strong>SUPORTE</strong> e este post será salvo como <strong>PILAR</strong>.
              </p>
              <div className="mt-3 rounded-md border border-(--border) bg-(--surface-muted) p-3 text-sm">
                <p className="font-semibold text-(--text)">{pillarConflictPrompt.current_pillar.title}</p>
                <p className="mt-1 text-xs text-(--muted)">
                  Grupo: {pillarConflictPrompt.current_pillar.silo_group ?? "sem grupo"} | Ordem:{" "}
                  {pillarConflictPrompt.current_pillar.silo_order ?? 0}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={dismissPillarConflictPrompt}
                  disabled={resolvingPillarConflict}
                  className="rounded-md border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs font-semibold text-(--text) hover:border-(--brand-hot) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmPillarReplacement()}
                  disabled={resolvingPillarConflict}
                  className="rounded-md bg-(--brand-hot) px-3 py-2 text-xs font-semibold text-(--paper) hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resolvingPillarConflict ? "Substituindo..." : "Substituir e salvar"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </EditorProvider>
  );
}
