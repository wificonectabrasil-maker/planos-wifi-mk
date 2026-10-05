"use client";

import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import {
  getBpAttrs,
  normalizeResponsiveMap,
  serializeResponsiveMap,
  visibilityDataAttrs,
} from "@/lib/editor/responsive";

const SPACING_MAP: Record<string, string> = {
  none: "0px",
  sm: "8px",
  md: "16px",
  lg: "24px",
};

const IMAGE_STYLE_BLOCKLIST = new Set([
  "width",
  "max-width",
  "min-width",
  "height",
  "max-height",
  "min-height",
  "display",
  "float",
  "margin",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-bottom",
  "object-fit",
  "aspect-ratio",
  "text-align",
]);

function sanitizeImageStyle(raw: unknown) {
  const style = String(raw ?? "").trim();
  if (!style) return "";
  const declarations = style
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
  const safeDeclarations = declarations.filter((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator <= 0) return false;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    if (!property) return false;
    if (property.startsWith("--img-")) return false;
    return !IMAGE_STYLE_BLOCKLIST.has(property);
  });
  return safeDeclarations.join(";");
}

function parseResponsiveFromAttr(raw: string | null) {
  if (!raw) return null;
  try {
    return normalizeResponsiveMap(JSON.parse(raw));
  } catch {
    return null;
  }
}

function alignToMargins(align: string) {
  if (align === "center") return { ml: "auto", mr: "auto" };
  if (align === "right") return { ml: "auto", mr: "0" };
  return { ml: "0", mr: "auto" };
}

function widthModeToVars(widthMode: string, maxWidth: number | null | undefined) {
  if (widthMode === "full") {
    return { width: "100%", maxw: "100%" };
  }
  if (widthMode === "px") {
    const px = Number.isFinite(maxWidth as number) && Number(maxWidth) > 0 ? `${Number(maxWidth)}px` : "640px";
    return { width: "100%", maxw: px };
  }
  return { width: "auto", maxw: "100%" };
}

function wrapToVars(wrap: string, align: string) {
  if (wrap === "wrap-left") {
    return { float: "left", ml: "0", mr: "16px" };
  }
  if (wrap === "wrap-right") {
    return { float: "right", ml: "16px", mr: "0" };
  }
  const margins = alignToMargins(align);
  return { float: "none", ml: margins.ml, mr: margins.mr };
}

export const EditorImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      "data-uploading": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-uploading"),
        renderHTML: (attributes) =>
          attributes["data-uploading"] ? { "data-uploading": attributes["data-uploading"] } : {},
      },
      "data-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) =>
          attributes["data-id"] ? { "data-id": attributes["data-id"] } : {},
      },
      "data-align": {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
      },
      "data-tablet-align": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-tablet-align"),
      },
      "data-mobile-align": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mobile-align"),
      },
      widthMode: {
        default: "content",
        parseHTML: (element) => element.getAttribute("data-width-mode") || "content",
      },
      maxWidth: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-max-width");
          if (!raw) return null;
          const parsed = Number.parseInt(raw, 10);
          return Number.isFinite(parsed) ? parsed : null;
        },
      },
      wrap: {
        default: "none",
        parseHTML: (element) => element.getAttribute("data-wrap") || "none",
      },
      spacingY: {
        default: "md",
        parseHTML: (element) => element.getAttribute("data-spacing-y") || "md",
      },
      visibleDesktop: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-visible-desktop") !== "false",
      },
      visibleTablet: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-visible-tablet") !== "false",
      },
      visibleMobile: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-visible-mobile") !== "false",
      },
      responsive: {
        default: null,
        parseHTML: (element) => parseResponsiveFromAttr(element.getAttribute("data-responsive")),
        renderHTML: (attributes) => {
          const serialized = serializeResponsiveMap(attributes.responsive);
          return serialized ? { "data-responsive": serialized } : {};
        },
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => (attributes.height ? { height: attributes.height } : {}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, any>;
    const attrsWithResponsive = { ...attrs, responsive: normalizeResponsiveMap(attrs.responsive) };
    const desktopResolved = getBpAttrs(attrsWithResponsive, "desktop");
    const tabletResolved = getBpAttrs(attrsWithResponsive, "tablet");
    const mobileResolved = getBpAttrs(attrsWithResponsive, "mobile");

    const baseAlign = String(desktopResolved.align || attrs["data-align"] || "center");
    const tabletAlign = String(tabletResolved.align || attrs["data-tablet-align"] || baseAlign);
    const mobileAlign = String(mobileResolved.align || attrs["data-mobile-align"] || tabletAlign || baseAlign);

    const baseWidthMode = String(desktopResolved.widthMode || attrs.widthMode || "content");
    const tabletWidthMode = String(tabletResolved.widthMode || baseWidthMode);
    const mobileWidthMode = String(mobileResolved.widthMode || tabletWidthMode || baseWidthMode);

    const baseMaxWidth = Number(desktopResolved.maxWidth || attrs.maxWidth || 0) || null;
    const tabletMaxWidth = Number(tabletResolved.maxWidth || baseMaxWidth || 0) || baseMaxWidth;
    const mobileMaxWidth = Number(mobileResolved.maxWidth || tabletMaxWidth || baseMaxWidth || 0) || tabletMaxWidth || baseMaxWidth;

    const baseWrap = String(desktopResolved.wrap || attrs.wrap || "none");
    const tabletWrap = String(tabletResolved.wrap || baseWrap);
    const mobileWrap = String(mobileResolved.wrap || tabletWrap || baseWrap);

    const baseSpacing = String(desktopResolved.spacingY || attrs.spacingY || "md");
    const tabletSpacing = String(tabletResolved.spacingY || baseSpacing);
    const mobileSpacing = String(mobileResolved.spacingY || tabletSpacing || baseSpacing);

    const baseWidthVars = widthModeToVars(baseWidthMode, baseMaxWidth);
    const tabletWidthVars = widthModeToVars(tabletWidthMode, tabletMaxWidth);
    const mobileWidthVars = widthModeToVars(mobileWidthMode, mobileMaxWidth);
    const baseWrapVars = wrapToVars(baseWrap, baseAlign);
    const tabletWrapVars = wrapToVars(tabletWrap, tabletAlign);
    const mobileWrapVars = wrapToVars(mobileWrap, mobileAlign);
    const styleVars = [
      `--img-width:${baseWidthVars.width}`,
      `--img-maxw:${baseWidthVars.maxw}`,
      `--img-float:${baseWrapVars.float}`,
      `--img-ml:${baseWrapVars.ml}`,
      `--img-mr:${baseWrapVars.mr}`,
      `--img-spacing-y:${SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--img-width-tablet:${tabletWidthVars.width}`,
      `--img-maxw-tablet:${tabletWidthVars.maxw}`,
      `--img-float-tablet:${tabletWrapVars.float}`,
      `--img-ml-tablet:${tabletWrapVars.ml}`,
      `--img-mr-tablet:${tabletWrapVars.mr}`,
      `--img-spacing-y-tablet:${SPACING_MAP[tabletSpacing] || SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--img-width-mobile:${mobileWidthVars.width}`,
      `--img-maxw-mobile:${mobileWidthVars.maxw}`,
      `--img-float-mobile:${mobileWrapVars.float}`,
      `--img-ml-mobile:${mobileWrapVars.ml}`,
      `--img-mr-mobile:${mobileWrapVars.mr}`,
      `--img-spacing-y-mobile:${SPACING_MAP[mobileSpacing] || SPACING_MAP[tabletSpacing] || SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
    ]
      .filter(Boolean)
      .join(";");

    const responsiveSerialized = serializeResponsiveMap(attrsWithResponsive.responsive);

    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-responsive-image": "true",
        "data-align": baseAlign,
        "data-tablet-align": tabletAlign,
        "data-mobile-align": mobileAlign,
        "data-width-mode": baseWidthMode,
        "data-max-width": baseMaxWidth ?? null,
        "data-wrap": baseWrap,
        "data-spacing-y": baseSpacing,
        ...visibilityDataAttrs(attrsWithResponsive),
        "data-responsive": responsiveSerialized,
        style: [sanitizeImageStyle(attrs.style), styleVars].filter(Boolean).join(";"),
      }),
    ];
  },
});
