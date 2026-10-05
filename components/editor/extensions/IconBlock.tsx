"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
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

type IconItem = {
  icon: string;
  text: string;
};

const SPACING_MAP: Record<string, string> = {
  none: "0px",
  sm: "8px",
  md: "16px",
  lg: "24px",
};

function parseItems(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        icon: String(item?.icon || "check"),
        text: String(item?.text || "Item"),
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

const IconBlockView = ({ node, updateAttributes, selected }: any) => {
  const { previewMode } = useEditorContext();
  const attrs = node.attrs || {};
  const mode = previewMode as PreviewMode;
  const effective = getBpAttrs(attrs, mode);
  const responsive = normalizeResponsiveMap(attrs.responsive);
  const modeOverrides =
    mode === "desktop" ? {} : ((responsive[mode] ?? {}) as Record<string, unknown>);
  const visibility = resolveDeviceVisibility(attrs);
  const visibleInCurrentMode = visibility[mode];

  const title = String(attrs.title || "Lista com Ícones");
  const items = Array.isArray(attrs.items) && attrs.items.length
    ? (attrs.items as IconItem[])
    : [
        { icon: "check", text: "Beneficio 1" },
        { icon: "check", text: "Beneficio 2" },
        { icon: "star", text: "Diferencial" },
      ];
  const align = String(effective.align || attrs.align || "left");
  const widthMode = String(effective.widthMode || attrs.widthMode || "content");
  const spacingY = String(effective.spacingY || attrs.spacingY || "md");

  const updateResponsive = (patch: Record<string, any>) => {
    const next = setBpAttrs(attrs, mode, patch);
    updateAttributes(next);
  };

  const inheritDesktop = () => {
    if (mode === "desktop") return;
    const next = inheritDesktopToBp(attrs, mode, ["align", "widthMode", "spacingY"]);
    updateAttributes(next);
  };

  const updateVisibility = (targetMode: PreviewMode, isVisible: boolean) => {
    const next = setDeviceVisibility(attrs, { [targetMode]: isVisible });
    updateAttributes(next);
  };

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
            <p className="text-xs uppercase text-(--muted-2)">Ícones</p>
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
              const next = window.prompt("Título do bloco", title);
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
                items: [...items, { icon: "check", text: `Item ${items.length + 1}` }],
              })
            }
          >
            <Plus size={12} />
            Item
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
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <li key={`icon-item-${idx}`} className="flex items-center gap-2 text-xs text-(--text)">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--surface) text-[10px] font-bold text-(--muted)">
                    {String(item.icon || "check").slice(0, 2).toUpperCase()}
                  </span>
                  <span>{item.text}</span>
                  <button
                    type="button"
                    className="ml-auto inline-flex rounded border border-(--border) bg-(--surface) p-1 text-(--muted)"
                    onClick={() =>
                      updateAttributes({
                        ...attrs,
                        items: items.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const IconBlock = Node.create({
  name: "icon_block",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: "Lista com Ícones",
        parseHTML: (element) => element.getAttribute("data-title") || "Lista com Ícones",
      },
      items: {
        default: [],
        parseHTML: (element) => parseItems(element.getAttribute("data-items")),
      },
      align: {
        default: "left",
        parseHTML: (element) => element.getAttribute("data-align") || "left",
      },
      widthMode: {
        default: "content",
        parseHTML: (element) => element.getAttribute("data-width-mode") || "content",
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
    return [{ tag: "div[data-type='icon-block']" }];
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

    const styleVars = [
      `--icon-justify:${alignToJustify(baseAlign)}`,
      `--icon-justify-tablet:${alignToJustify(tabletAlign)}`,
      `--icon-justify-mobile:${alignToJustify(mobileAlign)}`,
      `--icon-width:${widthModeToValue(baseWidthMode)}`,
      `--icon-width-tablet:${widthModeToValue(tabletWidthMode)}`,
      `--icon-width-mobile:${widthModeToValue(mobileWidthMode)}`,
      `--icon-spacing:${SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--icon-spacing-tablet:${SPACING_MAP[tabletSpacing] || SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
      `--icon-spacing-mobile:${SPACING_MAP[mobileSpacing] || SPACING_MAP[tabletSpacing] || SPACING_MAP[baseSpacing] || SPACING_MAP.md}`,
    ].join(";");

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "icon-block",
        "data-title": withResponsive.title || "Lista com Ícones",
        "data-items": JSON.stringify(Array.isArray(withResponsive.items) ? withResponsive.items : []),
        "data-align": baseAlign,
        "data-width-mode": baseWidthMode,
        "data-spacing-y": baseSpacing,
        ...visibilityDataAttrs(withResponsive),
        "data-responsive": serializeResponsiveMap(withResponsive.responsive),
        class: "icon-block",
        style: [attrs.style, styleVars].filter(Boolean).join(";"),
      }),
      [
        "div",
        { class: "icon-block__inner" },
        ["p", { class: "icon-block__title" }, withResponsive.title || "Lista com Ícones"],
        [
          "ul",
          { class: "icon-block__list" },
          ...(Array.isArray(withResponsive.items) ? withResponsive.items : []).map((item: any) => [
            "li",
            { class: "icon-block__item" },
            ["span", { class: "icon-block__glyph" }, String(item?.icon || "check").slice(0, 2).toUpperCase()],
            ["span", { class: "icon-block__text" }, String(item?.text || "Item")],
          ]),
        ],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IconBlockView);
  },
});
