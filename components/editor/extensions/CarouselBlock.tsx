"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { GripVertical, ImagePlus, Trash2 } from "lucide-react";
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
} from "@/lib/editor/responsive";

type PreviewMode = "desktop" | "tablet" | "mobile";

type SlideItem = {
  image: string;
  caption: string;
  href?: string;
};

const SPACING_MAP: Record<string, string> = {
  none: "0px",
  sm: "8px",
  md: "16px",
  lg: "24px",
};

function parseSlides(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        image: String(item?.image || ""),
        caption: String(item?.caption || "Slide"),
        href: item?.href ? String(item.href) : undefined,
      }))
      .slice(0, 20);
  } catch {
    return [];
  }
}

function parseResponsive(raw: string | null) {
  if (!raw) return null;
  try {
    return normalizeResponsiveMap(JSON.parse(raw));
  } catch {
    return null;
  }
}

function modeLabel(mode: PreviewMode) {
  if (mode === "mobile") return "Mobile";
  if (mode === "tablet") return "Tablet";
  return "Desktop";
}

function alignToJustify(align: string) {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

function widthModeToValue(mode: string) {
  if (mode === "full") return "100%";
  return "auto";
}

const CarouselBlockView = ({ node, updateAttributes, selected }: any) => {
  const { previewMode } = useEditorContext();
  const attrs = node.attrs || {};
  const mode = previewMode as PreviewMode;
  const effective = getBpAttrs(attrs, mode);
  const responsive = normalizeResponsiveMap(attrs.responsive);
  const modeOverrides =
    mode === "desktop" ? {} : ((responsive[mode] ?? {}) as Record<string, unknown>);
  const visibility = resolveDeviceVisibility(attrs);
  const visibleInCurrentMode = visibility[mode];

  const title = String(attrs.title || "Carrossel");
  const slides: SlideItem[] = Array.isArray(attrs.slides) && attrs.slides.length
    ? attrs.slides
    : [
        { image: "", caption: "Slide 1" },
        { image: "", caption: "Slide 2" },
      ];
  const align = String(effective.align || attrs.align || "left");
  const widthMode = String(effective.widthMode || attrs.widthMode || "content");
  const spacingY = String(effective.spacingY || attrs.spacingY || "md");
  const slidesPerView = Number(effective.slidesPerView || attrs.slidesPerView || 1);

  const updateResponsive = (patch: Record<string, any>) => {
    const next = setBpAttrs(attrs, mode, patch);
    updateAttributes(next);
  };

  const inheritDesktop = () => {
    if (mode === "desktop") return;
    const next = inheritDesktopToBp(attrs, mode, ["align", "widthMode", "spacingY", "slidesPerView"]);
    updateAttributes(next);
  };

  const updateVisibility = (targetMode: PreviewMode, isVisible: boolean) => {
    const next = setDeviceVisibility(attrs, { [targetMode]: isVisible });
    updateAttributes(next);
  };

  const visibleSlides = Math.max(1, Math.min(4, slidesPerView));

  return (
    <NodeViewWrapper
      className="my-6 not-prose"
      draggable="true"
      data-visible-desktop={visibility.desktop ? "true" : "false"}
      data-visible-tablet={visibility.tablet ? "true" : "false"}
      data-visible-mobile={visibility.mobile ? "true" : "false"}
    >
      <div className="rounded-xl border border-(--border) bg-(--surface) p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
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
            <p className="text-xs uppercase text-(--muted-2)">Carousel</p>
            <p className="text-sm font-semibold text-(--text)">{title}</p>
          </div>
          <span className="rounded-full border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] uppercase tracking-wide text-(--muted-2)">
            Editando: {modeLabel(mode)}
          </span>
        </div>
        {!visibleInCurrentMode ? (
          <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
            Oculto no modo {modeLabel(mode)}.
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-(--muted)">
          <button
            type="button"
            className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
            onClick={() => {
              const next = window.prompt("Título do carrossel", title);
              if (next !== null) updateAttributes({ ...attrs, title: next });
            }}
          >
            Editar título
          </button>
          <label>Alinhar {mode !== "desktop" && Object.prototype.hasOwnProperty.call(modeOverrides, "align") ? "*" : ""}</label>
          <select
            value={align}
            onChange={(event) => updateResponsive({ align: event.target.value })}
            className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
          <label>Largura {mode !== "desktop" && Object.prototype.hasOwnProperty.call(modeOverrides, "widthMode") ? "*" : ""}</label>
          <select
            value={widthMode}
            onChange={(event) => updateResponsive({ widthMode: event.target.value })}
            className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
          >
            <option value="content">Conteúdo</option>
            <option value="full">Total</option>
          </select>
          <label>Slides/view {mode !== "desktop" && Object.prototype.hasOwnProperty.call(modeOverrides, "slidesPerView") ? "*" : ""}</label>
          <select
            value={visibleSlides}
            onChange={(event) => updateResponsive({ slidesPerView: Number(event.target.value) })}
            className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
          <label>Spacing {mode !== "desktop" && Object.prototype.hasOwnProperty.call(modeOverrides, "spacingY") ? "*" : ""}</label>
          <select
            value={spacingY}
            onChange={(event) => updateResponsive({ spacingY: event.target.value })}
            className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
          >
            <option value="none">Sem margem</option>
            <option value="sm">P</option>
            <option value="md">M</option>
            <option value="lg">G</option>
          </select>
          {mode !== "desktop" ? (
            <button
              type="button"
              className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
              onClick={inheritDesktop}
            >
              Herdar desktop
            </button>
          ) : null}
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
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
            onClick={() =>
              updateAttributes({
                ...attrs,
                slides: [...slides, { image: "", caption: `Slide ${slides.length + 1}` }],
              })
            }
          >
            <ImagePlus size={12} />
            Slide
          </button>
        </div>

        <div
          className="rounded-lg border border-(--border) bg-(--surface-muted) p-3"
          style={{
            display: "flex",
            justifyContent: alignToJustify(align) as any,
            marginTop: SPACING_MAP[spacingY] || SPACING_MAP.md,
            marginBottom: SPACING_MAP[spacingY] || SPACING_MAP.md,
          }}
        >
          <div style={{ width: widthModeToValue(widthMode), maxWidth: "100%" }}>
            <p className="mb-2 text-sm font-semibold text-(--text)">{title}</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${visibleSlides}, minmax(0, 1fr))` }}>
              {slides.slice(0, Math.max(visibleSlides, 1)).map((slide, idx) => (
                <article key={`slide-${idx}`} className="rounded border border-(--border) bg-(--surface) p-2">
                  <div className="mb-2 flex h-20 items-center justify-center rounded bg-(--surface-muted) text-[10px] text-(--muted)">
                    {slide.image ? "IMG" : "Sem imagem"}
                  </div>
                  <p className="text-xs text-(--text)">{slide.caption}</p>
                  <button
                    type="button"
                    className="mt-2 inline-flex rounded border border-(--border) bg-(--surface) p-1 text-(--muted)"
                    onClick={() =>
                      updateAttributes({
                        ...attrs,
                        slides: slides.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 size={11} />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const CarouselBlock = Node.create({
  name: "carousel_block",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: "Carrossel",
        parseHTML: (element) => element.getAttribute("data-title") || "Carrossel",
      },
      slides: {
        default: [],
        parseHTML: (element) => parseSlides(element.getAttribute("data-slides")),
      },
      align: {
        default: "left",
        parseHTML: (element) => element.getAttribute("data-align") || "left",
      },
      widthMode: {
        default: "content",
        parseHTML: (element) => element.getAttribute("data-width-mode") || "content",
      },
      slidesPerView: {
        default: 1,
        parseHTML: (element) => {
          const parsed = Number.parseInt(element.getAttribute("data-slides-per-view") || "1", 10);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        },
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
        parseHTML: (element) => parseResponsive(element.getAttribute("data-responsive")),
        renderHTML: (attributes) => {
          const serialized = serializeResponsiveMap(attributes.responsive);
          return serialized ? { "data-responsive": serialized } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='carousel-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, any>;
    const withResponsive: Record<string, any> = {
      ...attrs,
      responsive: normalizeResponsiveMap(attrs.responsive),
    };
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

    const styleVars = [
      `--carousel-justify:${alignToJustify(baseAlign)}`,
      `--carousel-justify-tablet:${alignToJustify(tabletAlign)}`,
      `--carousel-justify-mobile:${alignToJustify(mobileAlign)}`,
      `--carousel-width:${widthModeToValue(baseWidthMode)}`,
      `--carousel-width-tablet:${widthModeToValue(tabletWidthMode)}`,
      `--carousel-width-mobile:${widthModeToValue(mobileWidthMode)}`,
      `--carousel-spacing:${SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--carousel-spacing-tablet:${SPACING_MAP[tabletSpacing] || SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--carousel-spacing-mobile:${SPACING_MAP[mobileSpacing] || SPACING_MAP[tabletSpacing] || SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--carousel-slides:${Math.max(1, Math.min(4, baseSlides))}`,
      `--carousel-slides-tablet:${Math.max(1, Math.min(4, tabletSlides))}`,
      `--carousel-slides-mobile:${Math.max(1, Math.min(4, mobileSlides))}`,
    ].join(";");

    const slides = Array.isArray(withResponsive.slides) ? withResponsive.slides : [];

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
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
        style: [attrs.style, styleVars].filter(Boolean).join(";"),
      }),
      [
        "div",
        { class: "carousel-block__inner" },
        ["p", { class: "carousel-block__title" }, withResponsive.title || "Carrossel"],
        [
          "div",
          { class: "carousel-block__track" },
          ...slides.map((slide: any) => [
            "article",
            { class: "carousel-block__slide" },
            ["div", { class: "carousel-block__ph" }, slide?.image ? "IMG" : "Sem imagem"],
            ["p", { class: "carousel-block__caption" }, String(slide?.caption || "Slide")],
          ]),
        ],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CarouselBlockView);
  },
});
