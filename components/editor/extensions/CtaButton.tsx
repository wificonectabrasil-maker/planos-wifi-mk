"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { GripVertical, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";
import {
  getBpAttrs,
  inheritDesktopToBp,
  normalizeResponsiveMap,
  resolveDeviceVisibility,
  serializeResponsiveMap,
  setDeviceVisibility,
  setBpAttrs,
  visibilityDataAttrs,
  type LegacyResponsiveKeys,
} from "@/lib/editor/responsive";

const VARIANT_CLASS: Record<string, string> = {
  amazon_primary: "cta-button--amazon-primary",
  amazon_secondary: "cta-button--amazon-secondary",
  internal: "cta-button--internal",
  custom: "cta-button--custom",
};

const SIZE_CLASS: Record<string, string> = {
  sm: "cta-button--sm",
  md: "cta-button--md",
  lg: "cta-button--lg",
};

const ALIGN_CLASS: Record<string, string> = {
  left: "cta-button--align-left",
  center: "cta-button--align-center",
  right: "cta-button--align-right",
};

const DEFAULT_COLORS: Record<string, { bg: string; text: string }> = {
  amazon_primary: { bg: "#ff9900", text: "#111827" },
  amazon_secondary: { bg: "#1f7a4d", text: "#ffffff" },
  internal: { bg: "#0f766e", text: "#ffffff" },
  custom: { bg: "#f36141", text: "#ffffff" },
};

const SPACING_MAP: Record<string, string> = {
  none: "0px",
  sm: "8px",
  md: "16px",
  lg: "24px",
};

type PreviewMode = "desktop" | "tablet" | "mobile";

const LEGACY_MAP: Record<string, LegacyResponsiveKeys> = {
  align: { tablet: "tabletAlign", mobile: "mobileAlign" },
  size: { tablet: "tabletSize", mobile: "mobileSize" },
  bgColor: { tablet: "tabletBgColor", mobile: "mobileBgColor" },
  textColor: { tablet: "tabletTextColor", mobile: "mobileTextColor" },
};

const RESPONSIVE_FIELDS = ["align", "size", "bgColor", "textColor", "fullWidth", "spacingY"];

function isAmazonVariant(variant: string) {
  return variant === "amazon_primary" || variant === "amazon_secondary";
}

function isInternalVariant(variant: string) {
  return variant === "internal";
}

function computeDefaults(attrs: any) {
  const variant = attrs.variant || "amazon_primary";
  const href = attrs.href || "";
  const isInternal = typeof href === "string" && href.startsWith("/");

  if (isAmazonVariant(variant)) {
    return {
      target: "_blank",
      rel: "sponsored nofollow noopener",
    };
  }

  if (isInternalVariant(variant) || isInternal) {
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

function parseResponsiveFromAttr(raw: string | null) {
  if (!raw) return null;
  try {
    return normalizeResponsiveMap(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readPreviewModeFromDom(): PreviewMode {
  if (typeof document === "undefined") return "desktop";
  const mode = document.querySelector("[data-editor-preview='true']")?.getAttribute("data-preview-mode");
  if (mode === "mobile" || mode === "tablet" || mode === "desktop") return mode;
  return "desktop";
}

function hasOverride(attrs: Record<string, any>, field: string, mode: PreviewMode) {
  if (mode === "desktop") return false;
  const responsive = normalizeResponsiveMap(attrs.responsive);
  return Object.prototype.hasOwnProperty.call(responsive[mode] || {}, field);
}

function getModeLabel(mode: PreviewMode) {
  if (mode === "mobile") return "Mobile";
  if (mode === "tablet") return "Tablet";
  return "Desktop";
}

function resolveCtaValue(attrs: Record<string, any>, field: string, mode: PreviewMode) {
  const resolved = getBpAttrs(attrs, mode)[field];
  if (typeof resolved !== "undefined") return resolved;
  const legacyKeys = LEGACY_MAP[field];
  if (mode === "tablet" && legacyKeys?.tablet) return attrs[legacyKeys.tablet];
  if (mode === "mobile") {
    if (legacyKeys?.mobile && typeof attrs[legacyKeys.mobile] !== "undefined") return attrs[legacyKeys.mobile];
    if (legacyKeys?.tablet && typeof attrs[legacyKeys.tablet] !== "undefined") return attrs[legacyKeys.tablet];
  }
  return attrs[field];
}

const CtaButtonView = ({ node, updateAttributes, selected }: any) => {
  const { previewMode } = useEditorContext();
  const [livePreviewMode, setLivePreviewMode] = useState<PreviewMode>(() => {
    const mode = readPreviewModeFromDom();
    return mode || previewMode;
  });

  const attrs = node.attrs || {};
  const variant = attrs.variant || "amazon_primary";
  const size = attrs.size || "md";
  const align = attrs.align || "center";
  const label = attrs.label || "VERIFICAR DISPONIBILIDADE";
  const href = attrs.href || "";
  const bgColor = attrs.bgColor || "";
  const textColor = attrs.textColor || "";
  const fullWidth = Boolean(attrs.fullWidth);
  const spacingY = attrs.spacingY || "md";
  const defaults = computeDefaults(attrs);
  const palette = DEFAULT_COLORS[variant] || DEFAULT_COLORS.custom;

  useEffect(() => {
    setLivePreviewMode(previewMode);
  }, [previewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromDom = () => setLivePreviewMode(readPreviewModeFromDom());
    const onModeChange = (event: Event) => {
      const detail = (event as CustomEvent<PreviewMode>).detail;
      if (detail === "desktop" || detail === "tablet" || detail === "mobile") {
        setLivePreviewMode(detail);
      } else {
        syncFromDom();
      }
    };

    syncFromDom();
    window.addEventListener("editor-preview-mode-change", onModeChange as EventListener);

    const target = document.querySelector("[data-editor-preview='true']");
    const observer = new MutationObserver(syncFromDom);
    if (target) {
      observer.observe(target, { attributes: true, attributeFilter: ["data-preview-mode"] });
    }

    return () => {
      window.removeEventListener("editor-preview-mode-change", onModeChange as EventListener);
      observer.disconnect();
    };
  }, []);

  const effectiveAlign = String(resolveCtaValue(attrs, "align", livePreviewMode) || align);
  const effectiveSize = String(resolveCtaValue(attrs, "size", livePreviewMode) || size);
  const effectiveBg = String(resolveCtaValue(attrs, "bgColor", livePreviewMode) || bgColor || palette.bg);
  const effectiveText = String(resolveCtaValue(attrs, "textColor", livePreviewMode) || textColor || palette.text);
  const effectiveFullWidth = Boolean(resolveCtaValue(attrs, "fullWidth", livePreviewMode) ?? fullWidth);
  const effectiveSpacingY = String(resolveCtaValue(attrs, "spacingY", livePreviewMode) || spacingY || "md");
  const visibility = resolveDeviceVisibility(attrs);
  const visibleInCurrentMode = visibility[livePreviewMode];

  const className = [
    "cta-button",
    VARIANT_CLASS[variant] || VARIANT_CLASS.custom,
    SIZE_CLASS[effectiveSize] || SIZE_CLASS[size] || SIZE_CLASS.md,
    ALIGN_CLASS[effectiveAlign] || ALIGN_CLASS[align] || ALIGN_CLASS.center,
  ]
    .filter(Boolean)
    .join(" ");

  const commit = (nextAttrs: Record<string, any>) => {
    const enforced = computeDefaults(nextAttrs);
    updateAttributes({ ...nextAttrs, ...enforced });
  };

  const updateBase = (patch: Record<string, any>) => {
    commit({ ...attrs, ...patch });
  };

  const updateResponsive = (patch: Record<string, any>) => {
    const next = setBpAttrs(attrs, livePreviewMode, patch, { legacyMap: LEGACY_MAP });
    commit(next);
  };

  const clearCurrentModeOverrides = () => {
    if (livePreviewMode === "desktop") return;
    const next = inheritDesktopToBp(attrs, livePreviewMode, RESPONSIVE_FIELDS, { legacyMap: LEGACY_MAP });
    commit(next);
  };

  const dropCurrentModeOverrides = () => {
    if (livePreviewMode === "desktop") return;
    const clearPatch = RESPONSIVE_FIELDS.reduce<Record<string, any>>((acc, field) => {
      acc[field] = undefined;
      return acc;
    }, {});
    const next = setBpAttrs(attrs, livePreviewMode, clearPatch, { legacyMap: LEGACY_MAP });
    commit(next);
  };

  const updateVisibility = (mode: PreviewMode, isVisible: boolean) => {
    const next = setDeviceVisibility(attrs, { [mode]: isVisible });
    commit(next);
  };

  const buttonStyle: Record<string, string> = {};
  if (effectiveBg) buttonStyle.backgroundColor = effectiveBg;
  if (effectiveText) buttonStyle.color = effectiveText;
  if (effectiveFullWidth) buttonStyle.width = "100%";

  const modeBadge = (
    <span className="rounded-full border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] uppercase tracking-wide text-(--muted-2)">
      Editando: {getModeLabel(livePreviewMode)}
    </span>
  );

  return (
    <NodeViewWrapper
      className="my-6 not-prose"
      draggable="true"
      data-visible-desktop={visibility.desktop ? "true" : "false"}
      data-visible-tablet={visibility.tablet ? "true" : "false"}
      data-visible-mobile={visibility.mobile ? "true" : "false"}
    >
      <div className="rounded-xl border border-(--border) bg-(--surface) p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {selected ? (
              <span
                contentEditable={false}
                draggable="true"
                data-drag-handle
                className="mb-2 inline-flex cursor-grab items-center gap-1 rounded-full border border-(--border) bg-(--surface-muted) px-2 py-0.5 text-[10px] uppercase tracking-wide text-(--muted-2)"
              >
                <GripVertical size={11} />
                mover bloco
              </span>
            ) : null}
            <p className="text-xs uppercase text-(--muted-2)">CTA</p>
            <p className="text-sm font-semibold text-(--text)">{label}</p>
            <p className="text-[11px] text-(--muted)">{href || "(sem URL)"}</p>
          </div>
          <div className="flex items-center gap-2">
            {modeBadge}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-(--border) px-2 py-1 text-[11px] text-(--muted) hover:bg-(--surface-muted)"
              onClick={() => {
                const nextLabel = window.prompt("Texto do botão", label);
                if (nextLabel !== null) updateBase({ label: nextLabel });
                const nextHref = window.prompt("URL do CTA", href);
                if (nextHref !== null) updateBase({ href: nextHref });
              }}
            >
              <Pencil size={12} />
              Editar
            </button>
          </div>
        </div>
        {!visibleInCurrentMode ? (
          <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
            Oculto no modo {getModeLabel(livePreviewMode)}.
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-(--muted)">
          <div>
            <label className="mr-1">Variante</label>
            <select
              value={variant}
              onChange={(event) => updateBase({ variant: event.target.value })}
              className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
            >
              <option value="amazon_primary">Amazon - Primario</option>
              <option value="amazon_secondary">Amazon - Secundario</option>
              <option value="internal">Interno</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="mr-1">
              Tamanho {hasOverride(attrs, "size", livePreviewMode) ? "•" : ""}
            </label>
            <select
              value={effectiveSize}
              onChange={(event) => updateResponsive({ size: event.target.value })}
              className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
            >
              <option value="sm">Pequeno</option>
              <option value="md">Medio</option>
              <option value="lg">Grande</option>
            </select>
          </div>
          <div>
            <label className="mr-1">
              Alinhar {hasOverride(attrs, "align", livePreviewMode) ? "•" : ""}
            </label>
            <select
              value={effectiveAlign}
              onChange={(event) => updateResponsive({ align: event.target.value })}
              className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
            >
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </div>
          <div>
            <label className="mr-1">
              Cor botão {hasOverride(attrs, "bgColor", livePreviewMode) ? "•" : ""}
            </label>
            <input
              type="color"
              value={effectiveBg}
              onChange={(event) => updateResponsive({ bgColor: event.target.value })}
              className="h-7 w-10 rounded border border-(--border) bg-(--surface)"
            />
          </div>
          <div>
            <label className="mr-1">
              Cor texto {hasOverride(attrs, "textColor", livePreviewMode) ? "•" : ""}
            </label>
            <input
              type="color"
              value={effectiveText}
              onChange={(event) => updateResponsive({ textColor: event.target.value })}
              className="h-7 w-10 rounded border border-(--border) bg-(--surface)"
            />
          </div>
          <div className="flex items-center gap-1 rounded border border-(--border) px-2 py-1">
            <input
              id={`cta-full-width-${node.attrs?.id || "node"}`}
              type="checkbox"
              checked={effectiveFullWidth}
              onChange={(event) => updateResponsive({ fullWidth: event.target.checked })}
            />
            <label htmlFor={`cta-full-width-${node.attrs?.id || "node"}`}>
              Full width {hasOverride(attrs, "fullWidth", livePreviewMode) ? "•" : ""}
            </label>
          </div>
          <div>
            <label className="mr-1">
              Espaçamento {hasOverride(attrs, "spacingY", livePreviewMode) ? "•" : ""}
            </label>
            <select
              value={effectiveSpacingY}
              onChange={(event) => updateResponsive({ spacingY: event.target.value })}
              className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
            >
              <option value="none">Sem margem</option>
              <option value="sm">Pequeno</option>
              <option value="md">Médio</option>
              <option value="lg">Grande</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded border border-(--border) px-2 py-1">
            <span className="text-[10px] uppercase tracking-wide text-(--muted-2)">Visível</span>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={visibility.desktop}
                onChange={(event) => updateVisibility("desktop", event.target.checked)}
              />
              D
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={visibility.tablet}
                onChange={(event) => updateVisibility("tablet", event.target.checked)}
              />
              T
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={visibility.mobile}
                onChange={(event) => updateVisibility("mobile", event.target.checked)}
              />
              M
            </label>
          </div>
          {livePreviewMode !== "desktop" ? (
            <>
              <button
                type="button"
                className="rounded-md border border-(--border) px-2 py-1 text-[10px] text-(--muted) hover:bg-(--surface-muted)"
                onClick={clearCurrentModeOverrides}
              >
                Herdar do desktop
              </button>
              <button
                type="button"
                className="rounded-md border border-(--border) px-2 py-1 text-[10px] text-(--muted) hover:bg-(--surface-muted)"
                onClick={dropCurrentModeOverrides}
              >
                Limpar override
              </button>
            </>
          ) : null}
        </div>

        <div className="mt-4">
          <div className={className} style={{ marginTop: SPACING_MAP[effectiveSpacingY] || SPACING_MAP.md, marginBottom: SPACING_MAP[effectiveSpacingY] || SPACING_MAP.md }}>
            <a
              href={href || "#"}
              target={defaults.target}
              rel={defaults.rel}
              className="cta-button__button"
              style={buttonStyle}
            >
              {label}
            </a>
          </div>
          <div className="mt-2 text-[10px] text-(--muted)">
            target: {defaults.target} | rel: {defaults.rel}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const CtaButton = Node.create({
  name: "cta_button",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      label: {
        default: "VERIFICAR DISPONIBILIDADE",
        parseHTML: (element) => element.getAttribute("data-label"),
      },
      href: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-href") || element.getAttribute("data-url"),
      },
      variant: {
        default: "amazon_primary",
        parseHTML: (element) => element.getAttribute("data-variant"),
      },
      size: {
        default: "md",
        parseHTML: (element) => element.getAttribute("data-size"),
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align"),
      },
      bgColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-bg-color"),
      },
      textColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-text-color"),
      },
      fullWidth: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-full-width") === "true",
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
      mobileAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mobile-align"),
      },
      mobileSize: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mobile-size"),
      },
      mobileBgColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mobile-bg-color"),
      },
      mobileTextColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mobile-text-color"),
      },
      tabletAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-tablet-align"),
      },
      tabletSize: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-tablet-size"),
      },
      tabletBgColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-tablet-bg-color"),
      },
      tabletTextColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-tablet-text-color"),
      },
      rel: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-rel"),
      },
      target: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-target"),
      },
      tracking: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-tracking"),
      },
      note: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note"),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "div[data-type='cta-button']" },
      { tag: "div[data-type='affiliate-cta']" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as any;
    const attrsWithResponsive = { ...attrs, responsive: normalizeResponsiveMap(attrs.responsive) };
    const variant = attrs.variant || "amazon_primary";
    const defaults = computeDefaults(attrsWithResponsive);
    const alignToJustify: Record<string, string> = {
      left: "flex-start",
      center: "center",
      right: "flex-end",
    };
    const sizeToVars: Record<string, { padY: string; padX: string; font: string }> = {
      sm: { padY: "8px", padX: "12px", font: "0.85rem" },
      md: { padY: "12px", padX: "18px", font: "0.95rem" },
      lg: { padY: "14px", padX: "22px", font: "1rem" },
    };

    const read = (field: string, mode: PreviewMode) => {
      const resolved = getBpAttrs(attrsWithResponsive, mode)[field];
      if (typeof resolved !== "undefined") return resolved;
      const legacyKeys = LEGACY_MAP[field];
      if (mode === "tablet" && legacyKeys?.tablet) return attrsWithResponsive[legacyKeys.tablet];
      if (mode === "mobile") {
        if (legacyKeys?.mobile && typeof attrsWithResponsive[legacyKeys.mobile] !== "undefined") {
          return attrsWithResponsive[legacyKeys.mobile];
        }
        if (legacyKeys?.tablet && typeof attrsWithResponsive[legacyKeys.tablet] !== "undefined") {
          return attrsWithResponsive[legacyKeys.tablet];
        }
      }
      return attrsWithResponsive[field];
    };

    const baseAlign = String(read("align", "desktop") || "center");
    const tabletAlign = String(read("align", "tablet") || baseAlign);
    const mobileAlign = String(read("align", "mobile") || tabletAlign || baseAlign);
    const baseSize = String(read("size", "desktop") || "md");
    const tabletSize = String(read("size", "tablet") || baseSize);
    const mobileSize = String(read("size", "mobile") || tabletSize || baseSize);
    const baseBg = read("bgColor", "desktop");
    const tabletBg = read("bgColor", "tablet");
    const mobileBg = read("bgColor", "mobile");
    const baseText = read("textColor", "desktop");
    const tabletText = read("textColor", "tablet");
    const mobileText = read("textColor", "mobile");
    const baseFullWidth = Boolean(read("fullWidth", "desktop"));
    const tabletFullWidth = Boolean(read("fullWidth", "tablet"));
    const mobileFullWidth = Boolean(read("fullWidth", "mobile"));
    const baseSpacing = String(read("spacingY", "desktop") || "md");
    const tabletSpacing = String(read("spacingY", "tablet") || baseSpacing);
    const mobileSpacing = String(read("spacingY", "mobile") || tabletSpacing || baseSpacing);

    const baseSizeVars = sizeToVars[baseSize] || sizeToVars.md;
    const tabletSizeVars = sizeToVars[tabletSize] || baseSizeVars;
    const mobileSizeVars = sizeToVars[mobileSize] || tabletSizeVars || baseSizeVars;

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
      `--cta-margin-y:${SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--cta-margin-y-tablet:${SPACING_MAP[tabletSpacing] || SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--cta-margin-y-mobile:${SPACING_MAP[mobileSpacing] || SPACING_MAP[tabletSpacing] || SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
    ]
      .filter(Boolean)
      .join(";");

    const className = [
      "cta-button",
      VARIANT_CLASS[variant] || VARIANT_CLASS.custom,
      SIZE_CLASS[baseSize] || SIZE_CLASS.md,
      ALIGN_CLASS[baseAlign] || ALIGN_CLASS.center,
    ]
      .filter(Boolean)
      .join(" ");

    const serializedResponsive = serializeResponsiveMap(attrsWithResponsive.responsive);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "cta-button",
        "data-label": attrsWithResponsive.label,
        "data-href": attrsWithResponsive.href,
        "data-variant": variant,
        "data-size": baseSize,
        "data-align": baseAlign,
        "data-bg-color": baseBg,
        "data-text-color": baseText,
        "data-full-width": baseFullWidth ? "true" : "false",
        "data-spacing-y": baseSpacing,
        "data-mobile-align": mobileAlign,
        "data-mobile-size": mobileSize,
        "data-mobile-bg-color": mobileBg,
        "data-mobile-text-color": mobileText,
        "data-tablet-align": tabletAlign,
        "data-tablet-size": tabletSize,
        "data-tablet-bg-color": tabletBg,
        "data-tablet-text-color": tabletText,
        ...visibilityDataAttrs(attrsWithResponsive),
        "data-responsive": serializedResponsive,
        "data-rel": defaults.rel,
        "data-target": defaults.target,
        "data-tracking": attrsWithResponsive.tracking,
        "data-note": attrsWithResponsive.note,
        class: className,
        style: styleVars || null,
      }),
      [
        "a",
        {
          href: attrsWithResponsive.href || "#",
          target: defaults.target,
          rel: defaults.rel,
          class: "cta-button__button",
          style: "background-color: var(--cta-bg, inherit); color: var(--cta-text, inherit); width: var(--cta-width, auto);",
        },
        attrsWithResponsive.label || "VERIFICAR DISPONIBILIDADE",
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaButtonView);
  },
});
