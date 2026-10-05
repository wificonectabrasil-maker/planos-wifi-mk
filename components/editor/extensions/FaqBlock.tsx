"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
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

type FaqItem = {
  question: string;
  answer: string;
};

function parseResponsiveFromAttr(raw: string | null) {
  if (!raw) return null;
  try {
    return normalizeResponsiveMap(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getModeLabel(mode: PreviewMode) {
  if (mode === "mobile") return "Mobile";
  if (mode === "tablet") return "Tablet";
  return "Desktop";
}

function resolveRenderMode(attrs: Record<string, any>, mode: PreviewMode) {
  const resolved = getBpAttrs(attrs, mode);
  return String(resolved.renderMode || attrs.renderMode || "expanded");
}

function hasRenderModeOverride(attrs: Record<string, any>, mode: PreviewMode) {
  if (mode === "desktop") return false;
  const responsive = normalizeResponsiveMap(attrs.responsive);
  return Object.prototype.hasOwnProperty.call(responsive[mode] || {}, "renderMode");
}

const FaqBlockView = ({ node, updateAttributes, selected }: any) => {
  const { previewMode } = useEditorContext();
  const attrs = node.attrs || {};
  const items: FaqItem[] = Array.isArray(attrs.items) ? attrs.items : [];
  const mode = previewMode;
  const effectiveRenderMode = resolveRenderMode(attrs, mode);
  const overrideActive = hasRenderModeOverride(attrs, mode);
  const visibility = resolveDeviceVisibility(attrs);
  const visibleInCurrentMode = visibility[mode];

  const normalizedItems = useMemo(
    () =>
      items.length
        ? items
        : [
            { question: "Qual o melhor produto?", answer: "Depende do perfil de uso e orçamento." },
            { question: "Como escolher?", answer: "Avalie potência, construção e avaliações reais." },
          ],
    [items]
  );

  const commit = (nextAttrs: Record<string, any>) => updateAttributes(nextAttrs);

  const updateItems = (nextItems: FaqItem[]) => {
    commit({ ...attrs, items: nextItems });
  };

  const updateRenderMode = (nextMode: "expanded" | "accordion") => {
    const nextAttrs = setBpAttrs(attrs, mode, { renderMode: nextMode });
    commit(nextAttrs);
  };

  const clearCurrentModeRenderOverride = () => {
    if (mode === "desktop") return;
    const nextAttrs = inheritDesktopToBp(attrs, mode, ["renderMode"]);
    commit(nextAttrs);
  };

  const updateVisibility = (targetMode: PreviewMode, isVisible: boolean) => {
    const nextAttrs = setDeviceVisibility(attrs, { [targetMode]: isVisible });
    commit(nextAttrs);
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
            <p className="text-xs uppercase text-(--muted-2)">FAQ</p>
            <p className="text-sm font-semibold text-(--text)">Perguntas Frequentes</p>
          </div>
          <span className="rounded-full border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] uppercase tracking-wide text-(--muted-2)">
            Editando: {getModeLabel(mode)}
          </span>
        </div>
        {!visibleInCurrentMode ? (
          <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
            Oculto no modo {getModeLabel(mode)}.
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-(--muted)">
          <label className="mr-1">Render mode {overrideActive ? "•" : ""}</label>
          <select
            value={effectiveRenderMode}
            onChange={(event) => updateRenderMode(event.target.value as "expanded" | "accordion")}
            className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px]"
          >
            <option value="expanded">Lista expandida</option>
            <option value="accordion">Acordeão</option>
          </select>
          {mode !== "desktop" ? (
            <button
              type="button"
              className="rounded-md border border-(--border) px-2 py-1 text-[10px] text-(--muted) hover:bg-(--surface-muted)"
              onClick={clearCurrentModeRenderOverride}
            >
              Herdar do desktop
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
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-(--border) px-2 py-1 text-[11px] text-(--muted) hover:bg-(--surface-muted)"
            onClick={() => updateItems([...normalizedItems, { question: "Nova pergunta", answer: "Nova resposta" }])}
          >
            <Plus size={12} />
            Item
          </button>
        </div>

        <div className="space-y-2">
          {normalizedItems.map((item, index) => (
            <div key={`faq-item-${index}`} className="rounded-md border border-(--border) bg-(--surface-muted) p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase text-(--muted-2)">Pergunta {index + 1}</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-(--border) px-2 py-1 text-[10px] text-(--muted) hover:bg-(--surface)"
                  onClick={() => updateItems(normalizedItems.filter((_, i) => i !== index))}
                >
                  <Trash2 size={11} />
                  Remover
                </button>
              </div>
              <input
                value={item.question}
                onChange={(event) =>
                  updateItems(
                    normalizedItems.map((it, i) => (i === index ? { ...it, question: event.target.value } : it))
                  )
                }
                className="mb-2 w-full rounded border border-(--border) bg-(--surface) px-2 py-1 text-xs"
              />
              <textarea
                value={item.answer}
                onChange={(event) =>
                  updateItems(
                    normalizedItems.map((it, i) => (i === index ? { ...it, answer: event.target.value } : it))
                  )
                }
                rows={2}
                className="w-full rounded border border-(--border) bg-(--surface) px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-(--border) bg-(--surface-muted) p-3">
          <p className="mb-2 text-[10px] uppercase text-(--muted-2)">Preview ({effectiveRenderMode})</p>
          {effectiveRenderMode === "accordion" ? (
            <div className="space-y-2">
              {normalizedItems.map((item, idx) => (
                <details key={`faq-preview-acc-${idx}`} className="rounded border border-(--border) bg-(--surface)">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-(--text)">{item.question}</summary>
                  <div className="px-3 pb-3 text-xs text-(--muted)">{item.answer}</div>
                </details>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {normalizedItems.map((item, idx) => (
                <div key={`faq-preview-exp-${idx}`} className="rounded border border-(--border) bg-(--surface) p-3">
                  <p className="text-xs font-semibold text-(--text)">{item.question}</p>
                  <p className="mt-1 text-xs text-(--muted)">{item.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const FaqBlock = Node.create({
  name: "faq_block",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: {
        default: [],
        parseHTML: (element) => {
          const raw = element.getAttribute("data-items");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        },
      },
      renderMode: {
        default: "expanded",
        parseHTML: (element) => element.getAttribute("data-render-mode") || "expanded",
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
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='faq-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, any>;
    const attrsWithResponsive: Record<string, any> = {
      ...attrs,
      responsive: normalizeResponsiveMap(attrs.responsive),
    };
    const items: FaqItem[] = Array.isArray(attrsWithResponsive.items) ? attrsWithResponsive.items : [];
    const renderModeDesktop = resolveRenderMode(attrsWithResponsive, "desktop");
    const renderModeTablet = resolveRenderMode(attrsWithResponsive, "tablet");
    const renderModeMobile = resolveRenderMode(attrsWithResponsive, "mobile");
    const serializedItems = JSON.stringify(items);
    const serializedResponsive = serializeResponsiveMap(attrsWithResponsive.responsive);

    const expandedChildren = items.map((item) => [
      "article",
      { class: "faq-block__item" },
      ["h3", { class: "faq-block__q" }, item.question || "Pergunta"],
      ["p", { class: "faq-block__a" }, item.answer || "Resposta"],
    ]);

    const accordionChildren = items.map((item) => [
      "details",
      { class: "faq-block__details" },
      ["summary", { class: "faq-block__summary" }, item.question || "Pergunta"],
      ["div", { class: "faq-block__answer" }, item.answer || "Resposta"],
    ]);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "faq-block",
        "data-render-mode": renderModeDesktop,
        "data-render-mode-tablet": renderModeTablet,
        "data-render-mode-mobile": renderModeMobile,
        "data-items": serializedItems,
        ...visibilityDataAttrs(attrsWithResponsive),
        "data-responsive": serializedResponsive,
        class: "faq-block",
      }),
      ["div", { class: "faq-block__expanded" }, ...expandedChildren],
      ["div", { class: "faq-block__accordion" }, ...accordionChildren],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqBlockView);
  },
});
