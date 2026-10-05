import {
  getBpAttrs,
  getResponsiveValue,
  normalizeResponsiveMap,
  serializeResponsiveMap,
  visibilityDataAttrs,
} from "@/lib/editor/responsive";

const IMAGE_SPACING_MAP: Record<string, string> = {
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

const CTA_SPACING_MAP: Record<string, string> = {
  none: "0px",
  sm: "8px",
  md: "16px",
  lg: "24px",
};

const CTA_SIZE_VARS: Record<string, { padY: string; padX: string; font: string }> = {
  sm: { padY: "8px", padX: "12px", font: "0.85rem" },
  md: { padY: "12px", padX: "18px", font: "0.95rem" },
  lg: { padY: "14px", padX: "22px", font: "1rem" },
};

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function attrsToString(attrs: Record<string, any> | null | undefined) {
  if (!attrs) return "";
  return Object.entries(attrs)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => ` ${k}="${escapeHtml(String(v))}"`)
    .join("");
}

function ensureString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function ensureNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

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

function normalizeHiddenColumnsValue(value: unknown) {
  if (Array.isArray(value)) {
    const tokens = value
      .map((item) => Number.parseInt(String(item), 10))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => String(item));
    if (!tokens.length) return "";
    return `|${Array.from(new Set(tokens)).join("|")}|`;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const fromPipe = raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const source = fromPipe.length ? fromPipe : raw.split(/[\s,;]+/).map((item) => item.trim());
  const tokens = source
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => String(item));
  if (!tokens.length) return "";
  return `|${Array.from(new Set(tokens)).join("|")}|`;
}

function normalizeColumnWidthsValue(value: unknown) {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.round(item * 100) / 100);
  return normalized.length ? normalized : null;
}

function columnWidthToCssValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value <= 1) return `${Math.round(value * 10000) / 100}%`;
  if (value <= 100) return `${Math.round(value * 100) / 100}%`;
  return `${Math.round(value * 100) / 100}px`;
}

function buildColumnWidthVars(columnWidths: number[] | null | undefined, suffix = "") {
  if (!Array.isArray(columnWidths) || !columnWidths.length) return [];
  return columnWidths
    .slice(0, 12)
    .map((width, index) => {
      const cssValue = columnWidthToCssValue(width);
      if (!cssValue) return "";
      const baseVar = `--tbl-col-${index + 1}`;
      const varName = suffix ? `${baseVar}-${suffix}` : baseVar;
      return `${varName}:${cssValue}`;
    })
    .filter(Boolean);
}

function renderMarks(text: string, marks: Array<{ type: string; attrs?: Record<string, any> }> | undefined) {
  let html = escapeHtml(text);
  if (!marks || !marks.length) return html;

  for (const mark of marks) {
    if (!mark) continue;
    const attrs = mark.attrs || {};
    switch (mark.type) {
      case "bold":
        html = `<strong>${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "highlight": {
        const color = attrs.color ? ` style="background:${escapeHtml(attrs.color)}"` : "";
        html = `<mark${color}>${html}</mark>`;
        break;
      }
      case "internalLinkCandidate": {
        const spanAttrs = {
          "data-link-candidate": "true",
          "data-slug": attrs.slug || null,
          "data-href": attrs.href || null,
          "data-status": attrs.status || "pending",
          class: `internal-link-candidate internal-link-candidate-${attrs.status || "pending"}`,
        };
        html = `<span${attrsToString(spanAttrs)}>${html}</span>`;
        break;
      }
      case "link": {
        const linkAttrs = {
          href: attrs.href || "#",
          rel: attrs.rel || null,
          target: attrs.target || null,
          "data-link-type": attrs["data-link-type"] || null,
          "data-post-id": attrs["data-post-id"] || null,
          "data-entity": attrs["data-entity"] || null,
          "data-entity-type": attrs["data-entity-type"] || null,
        };
        html = `<a${attrsToString(linkAttrs)}>${html}</a>`;
        break;
      }
      default:
        break;
    }
  }

  return html;
}

function renderInline(nodes: any[] | undefined) {
  if (!nodes || !nodes.length) return "";
  return nodes
    .map((node) => {
      if (!node) return "";
      if (node.type === "text") return renderMarks(node.text || "", node.marks || []);
      if (node.type === "hardBreak") return "<br />";
      if (node.type === "mention") {
        const attrs = node.attrs || {};
        const label = attrs.label || "";
        const linkAttrs = {
          href: attrs.href || "#",
          "data-link-type": "mention",
          "data-post-id": attrs.id || null,
          "data-entity": "mention",
        };
        return `<a${attrsToString(linkAttrs)}>${escapeHtml(label)}</a>`;
      }
      return "";
    })
    .join("");
}

function extractNodeText(node: any): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractNodeText).join(" ").trim();
  if (typeof node === "string") return node;
  if (node.type === "text") return String(node.text || "");
  if (node.type === "hardBreak") return " ";
  if (Array.isArray(node.content)) return node.content.map(extractNodeText).join(" ").trim();
  return "";
}

function alignToMargins(align: string) {
  if (align === "center") return { ml: "auto", mr: "auto" };
  if (align === "right") return { ml: "auto", mr: "0" };
  return { ml: "0", mr: "auto" };
}

function widthModeToVars(widthMode: string, maxWidth: number | null) {
  if (widthMode === "full") {
    return { width: "100%", maxw: "100%" };
  }
  if (widthMode === "px") {
    const px = maxWidth && maxWidth > 0 ? `${maxWidth}px` : "640px";
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

function renderImageNode(node: any) {
  const attrs = node.attrs || {};
  const attrsWithResponsive = { ...attrs, responsive: normalizeResponsiveMap(attrs.responsive) };
  const legacyAlign = { tablet: "data-tablet-align", mobile: "data-mobile-align" };

  const baseAlign = String(
    getResponsiveValue(attrsWithResponsive, "align", "desktop", legacyAlign) || attrs["data-align"] || "center"
  );
  const tabletAlign = String(getResponsiveValue(attrsWithResponsive, "align", "tablet", legacyAlign) || baseAlign);
  const mobileAlign = String(
    getResponsiveValue(attrsWithResponsive, "align", "mobile", legacyAlign) || tabletAlign || baseAlign
  );

  const baseWidthMode = String(
    getResponsiveValue(attrsWithResponsive, "widthMode", "desktop") || attrs.widthMode || "content"
  );
  const tabletWidthMode = String(
    getResponsiveValue(attrsWithResponsive, "widthMode", "tablet") || baseWidthMode
  );
  const mobileWidthMode = String(
    getResponsiveValue(attrsWithResponsive, "widthMode", "mobile") || tabletWidthMode || baseWidthMode
  );

  const baseMaxWidth =
    ensureNumber(getResponsiveValue(attrsWithResponsive, "maxWidth", "desktop") || attrs.maxWidth || null) || null;
  const tabletMaxWidth =
    ensureNumber(getResponsiveValue(attrsWithResponsive, "maxWidth", "tablet") || baseMaxWidth || null) ||
    baseMaxWidth;
  const mobileMaxWidth =
    ensureNumber(
      getResponsiveValue(attrsWithResponsive, "maxWidth", "mobile") || tabletMaxWidth || baseMaxWidth || null
    ) ||
    tabletMaxWidth ||
    baseMaxWidth;

  const baseWrap = String(getResponsiveValue(attrsWithResponsive, "wrap", "desktop") || attrs.wrap || "none");
  const tabletWrap = String(getResponsiveValue(attrsWithResponsive, "wrap", "tablet") || baseWrap);
  const mobileWrap = String(getResponsiveValue(attrsWithResponsive, "wrap", "mobile") || tabletWrap || baseWrap);

  const baseSpacing = String(
    getResponsiveValue(attrsWithResponsive, "spacingY", "desktop") || attrs.spacingY || "md"
  );
  const tabletSpacing = String(getResponsiveValue(attrsWithResponsive, "spacingY", "tablet") || baseSpacing);
  const mobileSpacing = String(
    getResponsiveValue(attrsWithResponsive, "spacingY", "mobile") || tabletSpacing || baseSpacing
  );

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
    `--img-spacing-y:${IMAGE_SPACING_MAP[baseSpacing] || IMAGE_SPACING_MAP.md}`,
    `--img-width-tablet:${tabletWidthVars.width}`,
    `--img-maxw-tablet:${tabletWidthVars.maxw}`,
    `--img-float-tablet:${tabletWrapVars.float}`,
    `--img-ml-tablet:${tabletWrapVars.ml}`,
    `--img-mr-tablet:${tabletWrapVars.mr}`,
    `--img-spacing-y-tablet:${IMAGE_SPACING_MAP[tabletSpacing] || IMAGE_SPACING_MAP[baseSpacing] || IMAGE_SPACING_MAP.md}`,
    `--img-width-mobile:${mobileWidthVars.width}`,
    `--img-maxw-mobile:${mobileWidthVars.maxw}`,
    `--img-float-mobile:${mobileWrapVars.float}`,
    `--img-ml-mobile:${mobileWrapVars.ml}`,
    `--img-mr-mobile:${mobileWrapVars.mr}`,
    `--img-spacing-y-mobile:${
      IMAGE_SPACING_MAP[mobileSpacing] || IMAGE_SPACING_MAP[tabletSpacing] || IMAGE_SPACING_MAP[baseSpacing] || IMAGE_SPACING_MAP.md
    }`,
  ].join(";");

  const imageAttrs = {
    src: attrs.src || "",
    alt: attrs.alt || null,
    title: attrs.title || null,
    width: attrs.width || null,
    height: attrs.height || null,
    "data-uploading": attrs["data-uploading"] || null,
    "data-id": attrs["data-id"] || null,
    "data-responsive-image": "true",
    "data-align": baseAlign,
    "data-tablet-align": tabletAlign,
    "data-mobile-align": mobileAlign,
    "data-width-mode": baseWidthMode,
    "data-max-width": baseMaxWidth ?? null,
    "data-wrap": baseWrap,
    "data-spacing-y": baseSpacing,
    ...visibilityDataAttrs(attrsWithResponsive),
    "data-responsive": serializeResponsiveMap(attrsWithResponsive.responsive),
    style: [sanitizeImageStyle(attrs.style), styleVars].filter(Boolean).join(";"),
  };

  return `<img${attrsToString(imageAttrs)} />`;
}

function resolveCtaDefaults(attrs: Record<string, any>) {
  const variant = attrs.variant || "amazon_primary";
  const href = attrs.href || "";
  const isInternal = typeof href === "string" && href.startsWith("/");

  if (variant === "amazon_primary" || variant === "amazon_secondary") {
    return {
      target: "_blank",
      rel: "sponsored nofollow noopener",
    };
  }

  if (variant === "internal" || isInternal) {
    return {
      target: "_self",
      rel: "follow",
    };
  }

  return {
    target: attrs.target || "_blank",
    rel: attrs.rel || "nofollow noopener",
  };
}

function renderCtaNode(node: any) {
  const attrs = node.attrs || {};
  const withResponsive = { ...attrs, responsive: normalizeResponsiveMap(attrs.responsive) };
  const defaults = resolveCtaDefaults(withResponsive);

  const read = (field: string, mode: "desktop" | "tablet" | "mobile") =>
    getResponsiveValue(withResponsive, field, mode, {
      tablet: `tablet${field.charAt(0).toUpperCase()}${field.slice(1)}`,
      mobile: `mobile${field.charAt(0).toUpperCase()}${field.slice(1)}`,
    });

  const baseAlign = String(read("align", "desktop") || withResponsive.align || "center");
  const tabletAlign = String(read("align", "tablet") || baseAlign);
  const mobileAlign = String(read("align", "mobile") || tabletAlign || baseAlign);

  const baseSize = String(read("size", "desktop") || withResponsive.size || "md");
  const tabletSize = String(read("size", "tablet") || baseSize);
  const mobileSize = String(read("size", "mobile") || tabletSize || baseSize);

  const baseBg = ensureString(read("bgColor", "desktop") || withResponsive.bgColor || "");
  const tabletBg = ensureString(read("bgColor", "tablet") || "");
  const mobileBg = ensureString(read("bgColor", "mobile") || "");

  const baseText = ensureString(read("textColor", "desktop") || withResponsive.textColor || "");
  const tabletText = ensureString(read("textColor", "tablet") || "");
  const mobileText = ensureString(read("textColor", "mobile") || "");

  const baseFullWidth = ensureBoolean(read("fullWidth", "desktop") ?? withResponsive.fullWidth, false);
  const tabletFullWidth = ensureBoolean(read("fullWidth", "tablet") ?? baseFullWidth, baseFullWidth);
  const mobileFullWidth = ensureBoolean(read("fullWidth", "mobile") ?? tabletFullWidth, tabletFullWidth);

  const baseSpacing = String(read("spacingY", "desktop") || withResponsive.spacingY || "md");
  const tabletSpacing = String(read("spacingY", "tablet") || baseSpacing);
  const mobileSpacing = String(read("spacingY", "mobile") || tabletSpacing || baseSpacing);

  const baseSizeVars = CTA_SIZE_VARS[baseSize] || CTA_SIZE_VARS.md;
  const tabletSizeVars = CTA_SIZE_VARS[tabletSize] || baseSizeVars;
  const mobileSizeVars = CTA_SIZE_VARS[mobileSize] || tabletSizeVars || baseSizeVars;

  const alignToJustify: Record<string, string> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };

  const styleVars = [
    `--cta-justify:${alignToJustify[baseAlign] || "center"}`,
    `--cta-justify-tablet:${alignToJustify[tabletAlign] || alignToJustify[baseAlign] || "center"}`,
    `--cta-justify-mobile:${alignToJustify[mobileAlign] || alignToJustify[tabletAlign] || alignToJustify[baseAlign] || "center"}`,
    `--cta-pad-y:${baseSizeVars.padY}`,
    `--cta-pad-x:${baseSizeVars.padX}`,
    `--cta-font:${baseSizeVars.font}`,
    `--cta-pad-y-tablet:${tabletSizeVars.padY}`,
    `--cta-pad-x-tablet:${tabletSizeVars.padX}`,
    `--cta-font-tablet:${tabletSizeVars.font}`,
    `--cta-pad-y-mobile:${mobileSizeVars.padY}`,
    `--cta-pad-x-mobile:${mobileSizeVars.padX}`,
    `--cta-font-mobile:${mobileSizeVars.font}`,
    baseBg ? `--cta-bg:${baseBg}` : "",
    tabletBg ? `--cta-bg-tablet:${tabletBg}` : "",
    mobileBg ? `--cta-bg-mobile:${mobileBg}` : "",
    baseText ? `--cta-text:${baseText}` : "",
    tabletText ? `--cta-text-tablet:${tabletText}` : "",
    mobileText ? `--cta-text-mobile:${mobileText}` : "",
    `--cta-width:${baseFullWidth ? "100%" : "auto"}`,
    `--cta-width-tablet:${tabletFullWidth ? "100%" : baseFullWidth ? "100%" : "auto"}`,
    `--cta-width-mobile:${mobileFullWidth ? "100%" : tabletFullWidth ? "100%" : baseFullWidth ? "100%" : "auto"}`,
    `--cta-margin-y:${CTA_SPACING_MAP[baseSpacing] || CTA_SPACING_MAP.md}`,
    `--cta-margin-y-tablet:${CTA_SPACING_MAP[tabletSpacing] || CTA_SPACING_MAP[baseSpacing] || CTA_SPACING_MAP.md}`,
    `--cta-margin-y-mobile:${
      CTA_SPACING_MAP[mobileSpacing] || CTA_SPACING_MAP[tabletSpacing] || CTA_SPACING_MAP[baseSpacing] || CTA_SPACING_MAP.md
    }`,
  ]
    .filter(Boolean)
    .join(";");

  const variant = withResponsive.variant || "amazon_primary";
  const className = [
    "cta-button",
    `cta-button--${String(variant).replace(/_/g, "-")}`,
    `cta-button--${baseSize}`,
    `cta-button--align-${baseAlign}`,
  ]
    .filter(Boolean)
    .join(" ");

  const href = withResponsive.href || withResponsive.url || "#";
  const wrapperAttrs = {
    "data-type": "cta-button",
    "data-label": withResponsive.label || "",
    "data-href": href,
    "data-variant": variant,
    "data-size": baseSize,
    "data-align": baseAlign,
    "data-bg-color": baseBg || null,
    "data-text-color": baseText || null,
    "data-full-width": baseFullWidth ? "true" : "false",
    "data-spacing-y": baseSpacing,
    "data-mobile-align": mobileAlign,
    "data-mobile-size": mobileSize,
    "data-mobile-bg-color": mobileBg || null,
    "data-mobile-text-color": mobileText || null,
    "data-tablet-align": tabletAlign,
    "data-tablet-size": tabletSize,
    "data-tablet-bg-color": tabletBg || null,
    "data-tablet-text-color": tabletText || null,
    ...visibilityDataAttrs(withResponsive),
    "data-responsive": serializeResponsiveMap(withResponsive.responsive),
    "data-rel": defaults.rel,
    "data-target": defaults.target,
    "data-tracking": withResponsive.tracking || null,
    "data-note": withResponsive.note || null,
    class: className,
    style: styleVars || null,
  };

  const linkAttrs = {
    href,
    target: defaults.target,
    rel: defaults.rel,
    class: "cta-button__button",
    style: "background-color: var(--cta-bg, inherit); color: var(--cta-text, inherit); width: var(--cta-width, auto);",
  };

  const label = escapeHtml(withResponsive.label || "VERIFICAR DISPONIBILIDADE");
  return `<div${attrsToString(wrapperAttrs)}><a${attrsToString(linkAttrs)}>${label}</a></div>`;
}

function nodeHasDescendant(node: any, matcher: (node: any) => boolean): boolean {
  if (!node || typeof node !== "object") return false;
  if (matcher(node)) return true;
  if (!Array.isArray(node.content)) return false;
  for (const child of node.content) {
    if (nodeHasDescendant(child, matcher)) return true;
  }
  return false;
}

function cellKindFromNode(cellNode: any) {
  const hasImage = nodeHasDescendant(cellNode, (node) => node?.type === "image");
  if (hasImage) return "media";
  const hasCtaNode = nodeHasDescendant(cellNode, (node) => node?.type === "cta_button");
  if (hasCtaNode) return "cta";
  const hasAffiliateLink = nodeHasDescendant(cellNode, (node) => {
    if (node?.type !== "text" || !Array.isArray(node?.marks)) return false;
    return node.marks.some((mark: any) => {
      if (mark?.type !== "link") return false;
      const href = String(mark?.attrs?.href ?? "");
      const rel = String(mark?.attrs?.rel ?? "");
      return (
        rel.includes("sponsored") ||
        href.includes("amazon.") ||
        href.includes("a.co") ||
        href.includes("amzn.to")
      );
    });
  });
  if (hasAffiliateLink) return "cta";
  return "text";
}

function renderTableCell(
  node: any,
  colIndex: number,
  headerLabels: string[],
  options: {
    keyDesktop: number | null;
    keyTablet: number | null;
    keyMobile: number | null;
  },
  forceHeader = false
) {
  const attrs = node?.attrs || {};
  const colwidth = Array.isArray(attrs.colwidth) && typeof attrs.colwidth[0] === "number" ? attrs.colwidth[0] : null;
  const isHeaderCell = forceHeader || node?.type === "tableHeader";
  const tag = isHeaderCell ? "th" : "td";
  const colNumber = colIndex + 1;

  const cellAttrs: Record<string, any> = {
    colspan: attrs.colspan ?? null,
    rowspan: attrs.rowspan ?? null,
    style: colwidth ? `width:${colwidth}px` : null,
    "data-col-index": colNumber,
  };

  if (tag === "td") {
    cellAttrs["data-label"] = headerLabels[colIndex] || `Coluna ${colNumber}`;
    cellAttrs["data-cell-kind"] = cellKindFromNode(node);
    cellAttrs["data-key-desktop"] = options.keyDesktop === colNumber ? "true" : null;
    cellAttrs["data-key-tablet"] = options.keyTablet === colNumber ? "true" : null;
    cellAttrs["data-key-mobile"] = options.keyMobile === colNumber ? "true" : null;
  }

  const contentHtml = (node?.content || []).map(renderNode).join("");
  return `<${tag}${attrsToString(cellAttrs)}>${contentHtml}</${tag}>`;
}

function renderTableRow(
  node: any,
  rowIndex: number,
  headerLabels: string[],
  options: {
    keyDesktop: number | null;
    keyTablet: number | null;
    keyMobile: number | null;
  },
  forceHeader = false
) {
  const cells = (node?.content || [])
    .map((cell: any, colIndex: number) => renderTableCell(cell, colIndex, headerLabels, options, forceHeader))
    .join("");
  return `<tr>${cells}</tr>`;
}

function renderTableNode(node: any) {
  const attrs = node.attrs || {};
  const withResponsive = { ...attrs, responsive: normalizeResponsiveMap(attrs.responsive) };
  const layoutDesktop = withResponsive.layout?.desktop || {};
  const layoutTablet = withResponsive.layout?.tablet || {};
  const layoutMobile = withResponsive.layout?.mobile || {};

  const baseMode = String(withResponsive.renderMode || layoutDesktop.renderMode || "table");
  const tabletMode = String(
    getResponsiveValue(withResponsive, "renderMode", "tablet", {
      tablet: "renderModeTablet",
      mobile: "renderModeMobile",
    }) || withResponsive.renderModeTablet || layoutTablet.renderMode || baseMode
  );
  const mobileMode = String(
    getResponsiveValue(withResponsive, "renderMode", "mobile", {
      tablet: "renderModeTablet",
      mobile: "renderModeMobile",
    }) ||
    withResponsive.renderModeMobile ||
    layoutMobile.renderMode ||
    tabletMode ||
    "stack"
  );
  const baseWrapCells = ensureBoolean(withResponsive.wrapCells ?? layoutDesktop.wrap, true);
  const tabletWrapCells = ensureBoolean(
    getResponsiveValue(withResponsive, "wrapCells", "tablet", {
      tablet: "wrapCellsTablet",
      mobile: "wrapCellsMobile",
    }) ??
    layoutTablet.wrap ??
    withResponsive.wrapCellsTablet ??
    baseWrapCells,
    baseWrapCells
  );
  const mobileWrapCells = ensureBoolean(
    getResponsiveValue(withResponsive, "wrapCells", "mobile", {
      tablet: "wrapCellsTablet",
      mobile: "wrapCellsMobile",
    }) ??
    layoutMobile.wrap ??
    withResponsive.wrapCellsMobile ??
    tabletWrapCells ??
    baseWrapCells,
    tabletWrapCells
  );
  const baseHiddenColumns = normalizeHiddenColumnsValue(
    withResponsive.hiddenColumns ?? layoutDesktop.hideColumns
  );
  const tabletHiddenColumns = normalizeHiddenColumnsValue(
    getResponsiveValue(withResponsive, "hiddenColumns", "tablet", {
      tablet: "hiddenColumnsTablet",
      mobile: "hiddenColumnsMobile",
    }) ||
    layoutTablet.hideColumns ||
    withResponsive.hiddenColumnsTablet ||
    baseHiddenColumns
  );
  const mobileHiddenColumns = normalizeHiddenColumnsValue(
    getResponsiveValue(withResponsive, "hiddenColumns", "mobile", {
      tablet: "hiddenColumnsTablet",
      mobile: "hiddenColumnsMobile",
    }) ||
    layoutMobile.hideColumns ||
    withResponsive.hiddenColumnsMobile ||
    tabletHiddenColumns ||
    baseHiddenColumns
  );
  const baseColumnWidths =
    normalizeColumnWidthsValue(
      getResponsiveValue(withResponsive, "columnWidths", "desktop") ||
      withResponsive.columnWidths ||
      layoutDesktop.columnWidths
    ) || null;
  const tabletColumnWidths =
    normalizeColumnWidthsValue(
      getResponsiveValue(withResponsive, "columnWidths", "tablet", {
        tablet: "columnWidthsTablet",
        mobile: "columnWidthsMobile",
      }) || withResponsive.columnWidthsTablet || layoutTablet.columnWidths
    ) ||
    baseColumnWidths;
  const mobileColumnWidths =
    normalizeColumnWidthsValue(
      getResponsiveValue(withResponsive, "columnWidths", "mobile", {
        tablet: "columnWidthsTablet",
        mobile: "columnWidthsMobile",
      }) || withResponsive.columnWidthsMobile || layoutMobile.columnWidths
    ) ||
    tabletColumnWidths ||
    baseColumnWidths;
  const normalizeKeyColumn = (value: unknown) => {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const baseKeyColumn =
    normalizeKeyColumn(
      getResponsiveValue(withResponsive, "stackKeyColumn", "desktop") ||
      withResponsive.stackKeyColumn ||
      layoutDesktop.keyColumn
    ) || null;
  const tabletKeyColumn =
    normalizeKeyColumn(
      getResponsiveValue(withResponsive, "stackKeyColumn", "tablet", {
        tablet: "stackKeyColumnTablet",
        mobile: "stackKeyColumnMobile",
      }) || withResponsive.stackKeyColumnTablet || layoutTablet.keyColumn
    ) ||
    baseKeyColumn;
  const mobileKeyColumn =
    normalizeKeyColumn(
      getResponsiveValue(withResponsive, "stackKeyColumn", "mobile", {
        tablet: "stackKeyColumnTablet",
        mobile: "stackKeyColumnMobile",
      }) || withResponsive.stackKeyColumnMobile || layoutMobile.keyColumn
    ) ||
    tabletKeyColumn ||
    baseKeyColumn;
  const columnWidthVars = [
    ...buildColumnWidthVars(baseColumnWidths),
    ...buildColumnWidthVars(tabletColumnWidths, "tablet"),
    ...buildColumnWidthVars(mobileColumnWidths, "mobile"),
  ].join(";");
  const mergedStyle = [attrs.style || null, columnWidthVars].filter(Boolean).join(";") || null;

  const rows = Array.isArray(node.content) ? node.content : [];
  const headerRow = rows[0];
  const firstRowCells = Array.isArray(headerRow?.content) ? headerRow.content : [];
  const hasHeaderRow = firstRowCells.length > 0 && firstRowCells.every((cell: any) => cell?.type === "tableHeader");

  const headerLabels = firstRowCells.map((cell: any, colIndex: number) => {
    if (!hasHeaderRow) return `Coluna ${colIndex + 1}`;
    const text = extractNodeText(cell).replace(/\s+/g, " ").trim();
    return text || `Coluna ${colIndex + 1}`;
  });
  const stackOptions = {
    keyDesktop: baseKeyColumn,
    keyTablet: tabletKeyColumn,
    keyMobile: mobileKeyColumn,
  };

  const theadHtml = hasHeaderRow ? `<thead>${renderTableRow(headerRow, 0, headerLabels, stackOptions, true)}</thead>` : "";
  const bodyRows = hasHeaderRow ? rows.slice(1) : rows;
  const tbodyHtml = `<tbody>${bodyRows
    .map((row: any, rowIndex: number) => renderTableRow(row, rowIndex, headerLabels, stackOptions, false))
    .join("")}</tbody>`;

  const tableAttrs = {
    "data-locked": withResponsive.locked ? "true" : null,
    "data-render-mode": baseMode,
    "data-render-mode-tablet": tabletMode,
    "data-render-mode-mobile": mobileMode,
    "data-wrap-cells": baseWrapCells ? "true" : "false",
    "data-wrap-cells-tablet": tabletWrapCells ? "true" : "false",
    "data-wrap-cells-mobile": mobileWrapCells ? "true" : "false",
    "data-hidden-columns": baseHiddenColumns || null,
    "data-hidden-columns-tablet": tabletHiddenColumns || null,
    "data-hidden-columns-mobile": mobileHiddenColumns || null,
    "data-column-widths": baseColumnWidths ? JSON.stringify(baseColumnWidths) : null,
    "data-column-widths-tablet": tabletColumnWidths ? JSON.stringify(tabletColumnWidths) : null,
    "data-column-widths-mobile": mobileColumnWidths ? JSON.stringify(mobileColumnWidths) : null,
    "data-stack-key-column": baseKeyColumn ?? null,
    "data-stack-key-column-tablet": tabletKeyColumn ?? null,
    "data-stack-key-column-mobile": mobileKeyColumn ?? null,
    "data-layout": JSON.stringify({
      desktop: {
        renderMode: baseMode,
        wrap: baseWrapCells,
        hideColumns: normalizeHiddenColumnsValue(baseHiddenColumns)
          .split("|")
          .map((item) => Number.parseInt(item, 10))
          .filter((item) => Number.isFinite(item) && item > 0),
        columnWidths: baseColumnWidths || [],
        keyColumn: baseKeyColumn,
      },
      tablet: {
        renderMode: tabletMode,
        wrap: tabletWrapCells,
        hideColumns: normalizeHiddenColumnsValue(tabletHiddenColumns)
          .split("|")
          .map((item) => Number.parseInt(item, 10))
          .filter((item) => Number.isFinite(item) && item > 0),
        columnWidths: tabletColumnWidths || [],
        keyColumn: tabletKeyColumn,
      },
      mobile: {
        renderMode: mobileMode,
        wrap: mobileWrapCells,
        hideColumns: normalizeHiddenColumnsValue(mobileHiddenColumns)
          .split("|")
          .map((item) => Number.parseInt(item, 10))
          .filter((item) => Number.isFinite(item) && item > 0),
        columnWidths: mobileColumnWidths || [],
        keyColumn: mobileKeyColumn,
      },
    }),
    ...visibilityDataAttrs(withResponsive),
    "data-responsive": serializeResponsiveMap(withResponsive.responsive),
    class: attrs.class || null,
    style: mergedStyle,
  };

  return `<table${attrsToString(tableAttrs)}>${theadHtml}${tbodyHtml}</table>`;
}

function renderFaqBlockNode(node: any) {
  const attrs = node.attrs || {};
  const withResponsive = { ...attrs, responsive: normalizeResponsiveMap(attrs.responsive) };
  const items = Array.isArray(withResponsive.items) ? withResponsive.items : [];

  const renderModeDesktop =
    String(getResponsiveValue(withResponsive, "renderMode", "desktop") || withResponsive.renderMode || "expanded");
  const renderModeTablet =
    String(getResponsiveValue(withResponsive, "renderMode", "tablet") || renderModeDesktop);
  const renderModeMobile =
    String(getResponsiveValue(withResponsive, "renderMode", "mobile") || renderModeTablet || renderModeDesktop);

  const expandedHtml = items
    .map((item: any) => {
      const question = escapeHtml(String(item?.question || "Pergunta"));
      const answer = escapeHtml(String(item?.answer || "Resposta"));
      return `<article class="faq-block__item"><h3 class="faq-block__q">${question}</h3><p class="faq-block__a">${answer}</p></article>`;
    })
    .join("");

  const accordionHtml = items
    .map((item: any) => {
      const question = escapeHtml(String(item?.question || "Pergunta"));
      const answer = escapeHtml(String(item?.answer || "Resposta"));
      return `<details class="faq-block__details"><summary class="faq-block__summary">${question}</summary><div class="faq-block__answer">${answer}</div></details>`;
    })
    .join("");

  const wrapperAttrs = {
    "data-type": "faq-block",
    "data-render-mode": renderModeDesktop,
    "data-render-mode-tablet": renderModeTablet,
    "data-render-mode-mobile": renderModeMobile,
    "data-items": JSON.stringify(items),
    ...visibilityDataAttrs(withResponsive),
    "data-responsive": serializeResponsiveMap(withResponsive.responsive),
    class: "faq-block",
  };

  return `<div${attrsToString(wrapperAttrs)}><div class="faq-block__expanded">${expandedHtml}</div><div class="faq-block__accordion">${accordionHtml}</div></div>`;
}

function renderIconBlockNode(node: any) {
  const attrs = node.attrs || {};
  const withResponsive = { ...attrs, responsive: normalizeResponsiveMap(attrs.responsive) };
  const desktopResolved = getBpAttrs(withResponsive, "desktop");
  const tabletResolved = getBpAttrs(withResponsive, "tablet");
  const mobileResolved = getBpAttrs(withResponsive, "mobile");
  const baseAlign = String(desktopResolved.align || "left");
  const tabletAlign = String(tabletResolved.align || baseAlign);
  const mobileAlign = String(mobileResolved.align || tabletAlign || baseAlign);
  const baseWidthMode = String(desktopResolved.widthMode || "content");
  const tabletWidthMode = String(tabletResolved.widthMode || baseWidthMode);
  const mobileWidthMode = String(mobileResolved.widthMode || tabletWidthMode || baseWidthMode);
  const baseSpacing = String(desktopResolved.spacingY || "md");
  const tabletSpacing = String(tabletResolved.spacingY || baseSpacing);
  const mobileSpacing = String(mobileResolved.spacingY || tabletSpacing || baseSpacing);
  const justify = (align: string) => (align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start");
  const widthValue = (mode: string) => (mode === "full" ? "100%" : "auto");
  const spacingMap: Record<string, string> = { none: "0px", sm: "8px", md: "16px", lg: "24px" };
  const items = Array.isArray(withResponsive.items) ? withResponsive.items : [];
  const styleVars = [
    `--icon-justify:${justify(baseAlign)}`,
    `--icon-justify-tablet:${justify(tabletAlign)}`,
    `--icon-justify-mobile:${justify(mobileAlign)}`,
    `--icon-width:${widthValue(baseWidthMode)}`,
    `--icon-width-tablet:${widthValue(tabletWidthMode)}`,
    `--icon-width-mobile:${widthValue(mobileWidthMode)}`,
    `--icon-spacing:${spacingMap[baseSpacing] || spacingMap.md}`,
    `--icon-spacing-tablet:${spacingMap[tabletSpacing] || spacingMap[baseSpacing] || spacingMap.md}`,
    `--icon-spacing-mobile:${spacingMap[mobileSpacing] || spacingMap[tabletSpacing] || spacingMap[baseSpacing] || spacingMap.md}`,
  ].join(";");
  const wrapperAttrs = {
    "data-type": "icon-block",
    "data-title": withResponsive.title || "Lista com Icones",
    "data-items": JSON.stringify(items),
    "data-align": baseAlign,
    "data-width-mode": baseWidthMode,
    "data-spacing-y": baseSpacing,
    ...visibilityDataAttrs(withResponsive),
    "data-responsive": serializeResponsiveMap(withResponsive.responsive),
    class: "icon-block",
    style: [attrs.style || null, styleVars].filter(Boolean).join(";") || null,
  };
  const itemsHtml = items
    .map((item: any) => {
      const icon = escapeHtml(String(item?.icon || "check").slice(0, 2).toUpperCase());
      const text = escapeHtml(String(item?.text || "Item"));
      return `<li class="icon-block__item"><span class="icon-block__glyph">${icon}</span><span class="icon-block__text">${text}</span></li>`;
    })
    .join("");
  return `<div${attrsToString(wrapperAttrs)}><div class="icon-block__inner"><p class="icon-block__title">${escapeHtml(
    String(withResponsive.title || "Lista com Icones")
  )}</p><ul class="icon-block__list">${itemsHtml}</ul></div></div>`;
}

function renderCarouselBlockNode(node: any) {
  const attrs = node.attrs || {};
  const withResponsive = { ...attrs, responsive: normalizeResponsiveMap(attrs.responsive) };
  const desktopResolved = getBpAttrs(withResponsive, "desktop");
  const tabletResolved = getBpAttrs(withResponsive, "tablet");
  const mobileResolved = getBpAttrs(withResponsive, "mobile");
  const baseAlign = String(desktopResolved.align || "left");
  const tabletAlign = String(tabletResolved.align || baseAlign);
  const mobileAlign = String(mobileResolved.align || tabletAlign || baseAlign);
  const baseWidthMode = String(desktopResolved.widthMode || "content");
  const tabletWidthMode = String(tabletResolved.widthMode || baseWidthMode);
  const mobileWidthMode = String(mobileResolved.widthMode || tabletWidthMode || baseWidthMode);
  const baseSpacing = String(desktopResolved.spacingY || "md");
  const tabletSpacing = String(tabletResolved.spacingY || baseSpacing);
  const mobileSpacing = String(mobileResolved.spacingY || tabletSpacing || baseSpacing);
  const baseSlides = Number(desktopResolved.slidesPerView || 1);
  const tabletSlides = Number(tabletResolved.slidesPerView || baseSlides || 1);
  const mobileSlides = Number(mobileResolved.slidesPerView || tabletSlides || baseSlides || 1);
  const justify = (align: string) => (align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start");
  const widthValue = (mode: string) => (mode === "full" ? "100%" : "auto");
  const spacingMap: Record<string, string> = { none: "0px", sm: "8px", md: "16px", lg: "24px" };
  const slides = Array.isArray(withResponsive.slides) ? withResponsive.slides : [];
  const styleVars = [
    `--carousel-justify:${justify(baseAlign)}`,
    `--carousel-justify-tablet:${justify(tabletAlign)}`,
    `--carousel-justify-mobile:${justify(mobileAlign)}`,
    `--carousel-width:${widthValue(baseWidthMode)}`,
    `--carousel-width-tablet:${widthValue(tabletWidthMode)}`,
    `--carousel-width-mobile:${widthValue(mobileWidthMode)}`,
    `--carousel-spacing:${spacingMap[baseSpacing] || spacingMap.md}`,
    `--carousel-spacing-tablet:${spacingMap[tabletSpacing] || spacingMap[baseSpacing] || spacingMap.md}`,
    `--carousel-spacing-mobile:${spacingMap[mobileSpacing] || spacingMap[tabletSpacing] || spacingMap[baseSpacing] || spacingMap.md}`,
    `--carousel-slides:${Math.max(1, Math.min(4, baseSlides))}`,
    `--carousel-slides-tablet:${Math.max(1, Math.min(4, tabletSlides))}`,
    `--carousel-slides-mobile:${Math.max(1, Math.min(4, mobileSlides))}`,
  ].join(";");
  const wrapperAttrs = {
    "data-type": "carousel-block",
    "data-title": withResponsive.title || "Carrossel",
    "data-slides": JSON.stringify(slides),
    "data-align": baseAlign,
    "data-width-mode": baseWidthMode,
    "data-slides-per-view": Math.max(1, Math.min(4, baseSlides)),
    "data-spacing-y": baseSpacing,
    ...visibilityDataAttrs(withResponsive),
    "data-responsive": serializeResponsiveMap(withResponsive.responsive),
    class: "carousel-block",
    style: [attrs.style || null, styleVars].filter(Boolean).join(";") || null,
  };
  const slidesHtml = slides
    .map((slide: any) => {
      const caption = escapeHtml(String(slide?.caption || "Slide"));
      const hasImage = Boolean(slide?.image);
      return `<article class="carousel-block__slide"><div class="carousel-block__ph">${hasImage ? "IMG" : "Sem imagem"}</div><p class="carousel-block__caption">${caption}</p></article>`;
    })
    .join("");
  return `<div${attrsToString(wrapperAttrs)}><div class="carousel-block__inner"><p class="carousel-block__title">${escapeHtml(
    String(withResponsive.title || "Carrossel")
  )}</p><div class="carousel-block__track">${slidesHtml}</div></div></div>`;
}

function renderAffiliateProductNode(node: any) {
  const attrs = node.attrs || {};
  const title = attrs.title || "Produto";
  const image = attrs.image || "";
  const price = attrs.price || "";
  const rating = attrs.rating ?? "";
  const url = attrs.url || attrs.href || "";
  const cardAttrs = {
    "data-type": "affiliate-product",
    "data-title": title,
    "data-image": image,
    "data-price": price,
    "data-rating": rating,
    "data-url": url,
    ...visibilityDataAttrs(attrs),
    class: "affiliate-card",
  };
  const ratingText = rating ? `Rating ${escapeHtml(String(rating))}` : "";
  const imageHtml = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="max-width:120px;height:auto;object-fit:contain;" />`
    : "";
  const ctaHtml = url
    ? `<a class="cta" href="${escapeHtml(url)}" target="_blank" rel="sponsored nofollow noopener">Ver preco</a>`
    : "";
  return (
    `<div${attrsToString(cardAttrs)}><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">` +
    `<div style="flex:0 0 120px;display:flex;justify-content:center;align-items:center;">${imageHtml}</div>` +
    `<div style="flex:1 1 220px;"><div style="font-weight:700;margin-bottom:4px;">${escapeHtml(title)}</div>` +
    (price ? `<div style="font-weight:600;margin-bottom:4px;">${escapeHtml(price)}</div>` : "") +
    (ratingText ? `<div style="font-size:12px;color:#f59e0b;">${ratingText}</div>` : "") +
    `</div>` +
    (ctaHtml ? `<div style="flex:0 0 auto;">${ctaHtml}</div>` : "") +
    `</div></div>`
  );
}

function renderYoutubeNode(node: any) {
  const src = node.attrs?.src || "";
  return `<div data-youtube="${escapeHtml(src)}" class="youtube-embed"><iframe src="${escapeHtml(
    src
  )}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="true" title="YouTube"></iframe></div>`;
}

function renderTableCellFallback(node: any, tag: "td" | "th") {
  const attrs = node.attrs || {};
  const colwidth = Array.isArray(attrs.colwidth) && typeof attrs.colwidth[0] === "number" ? attrs.colwidth[0] : null;
  const cellAttrs = {
    colspan: attrs.colspan ?? null,
    rowspan: attrs.rowspan ?? null,
    style: colwidth ? `width:${colwidth}px` : null,
  };
  return `<${tag}${attrsToString(cellAttrs)}>${(node.content || []).map(renderNode).join("")}</${tag}>`;
}

function renderNode(node: any): string {
  if (!node) return "";

  switch (node.type) {
    case "doc":
      return (node.content || []).map(renderNode).join("");
    case "paragraph":
      return `<p>${renderInline(node.content)}</p>`;
    case "heading": {
      const level = node.attrs?.level || 2;
      return `<h${level}>${renderInline(node.content)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${(node.content || []).map(renderNode).join("")}</ul>`;
    case "orderedList":
      return `<ol>${(node.content || []).map(renderNode).join("")}</ol>`;
    case "listItem":
      return `<li>${(node.content || []).map(renderNode).join("")}</li>`;
    case "blockquote":
      return `<blockquote>${(node.content || []).map(renderNode).join("")}</blockquote>`;
    case "image":
      return renderImageNode(node);
    case "table":
      return renderTableNode(node);
    case "tableRow":
      return renderTableRow(
        node,
        0,
        [],
        { keyDesktop: null, keyTablet: null, keyMobile: null },
        false
      );
    case "tableHeader":
      return renderTableCellFallback(node, "th");
    case "tableCell":
      return renderTableCellFallback(node, "td");
    case "cta_button":
    case "affiliateCta":
      return renderCtaNode(node);
    case "affiliateProductCard":
    case "affiliateProduct":
      return renderAffiliateProductNode(node);
    case "youtubeEmbed":
      return renderYoutubeNode(node);
    case "faq_block":
      return renderFaqBlockNode(node);
    case "icon_block":
      return renderIconBlockNode(node);
    case "carousel_block":
      return renderCarouselBlockNode(node);
    default:
      return "";
  }
}

export function renderEditorDocToHtml(doc: any) {
  return renderNode(doc);
}
