"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { EditorContent } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Laptop,
  MoveDown,
  MoveUp,
  Redo2,
  Search,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
import { ArticleFindDialog } from "@/components/editor/ArticleFindDialog";
import { FixedToolbar } from "@/components/editor/FixedToolbar";
import { useEditorContext } from "@/components/editor/EditorContext";
import { getBpAttrs } from "@/lib/editor/responsive";

type PreviewMode = "desktop" | "tablet" | "mobile";

function subscribeHeaderCenterSlot(onStoreChange: () => void) {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => undefined;
  }

  const observer = new MutationObserver(() => {
    onStoreChange();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}

function getHeaderCenterSlotSnapshot() {
  if (typeof document === "undefined") return null;
  return document.getElementById("admin-editor-center-slot");
}

function getHeaderCenterSlotServerSnapshot() {
  return null;
}

function formatRelativeTime(value?: Date | null) {
  if (!value) return "Sem salvamento recente";
  const diff = Date.now() - value.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes <= 0) return "Salvo agora";
  if (minutes === 1) return "Salvo ha 1 min";
  return `Salvo ha ${minutes} min`;
}

function formatArticleDate(value?: Date | null) {
  if (!value) return "";
  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function pickFirstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizeComparable(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function parseHiddenColumns(raw: string | null) {
  if (!raw) return new Set<number>();
  const values = raw
    .split(/[\s,;|]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0);
  return new Set(values);
}

function parsePositiveInt(raw: string | null) {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function findHeaderLabels(table: HTMLTableElement) {
  const explicitHeaderRow = table.tHead?.rows?.[0] ?? null;
  const fallbackHeaderRow = explicitHeaderRow
    ? null
    : Array.from(table.rows).find((row) =>
        Array.from(row.cells).some((cell) => cell.tagName.toLowerCase() === "th")
      ) ?? null;
  const headerRow = explicitHeaderRow ?? fallbackHeaderRow;
  if (!headerRow) return { labels: [] as string[], headerRow: null as HTMLTableRowElement | null };
  const labels = Array.from(headerRow.cells).map((cell, index) => {
    const text = (cell.textContent || "").replace(/\s+/g, " ").trim();
    return text || `Coluna ${index + 1}`;
  });
  return { labels, headerRow };
}

function setFlag(el: Element, attr: string, enabled: boolean) {
  if (enabled) {
    el.setAttribute(attr, "true");
    return;
  }
  el.removeAttribute(attr);
}

function enhanceResponsiveTablePreview(table: HTMLTableElement, mode: PreviewMode) {
  const { labels, headerRow } = findHeaderLabels(table);
  const allRows = table.tBodies.length
    ? Array.from(table.tBodies).flatMap((tbody) => Array.from(tbody.rows))
    : Array.from(table.rows).filter((row) => row !== headerRow);

  const hiddenDesktop = parseHiddenColumns(table.getAttribute("data-hidden-columns"));
  const hiddenTablet = parseHiddenColumns(
    table.getAttribute("data-hidden-columns-tablet") || table.getAttribute("data-hidden-columns")
  );
  const hiddenMobile = parseHiddenColumns(
    table.getAttribute("data-hidden-columns-mobile") ||
      table.getAttribute("data-hidden-columns-tablet") ||
      table.getAttribute("data-hidden-columns")
  );
  const keyDesktop = parsePositiveInt(table.getAttribute("data-stack-key-column"));
  const keyTablet =
    parsePositiveInt(table.getAttribute("data-stack-key-column-tablet")) ??
    parsePositiveInt(table.getAttribute("data-stack-key-column"));
  const keyMobile =
    parsePositiveInt(table.getAttribute("data-stack-key-column-mobile")) ??
    parsePositiveInt(table.getAttribute("data-stack-key-column-tablet")) ??
    parsePositiveInt(table.getAttribute("data-stack-key-column"));

  const activeKey = mode === "mobile" ? keyMobile : mode === "tablet" ? keyTablet : keyDesktop;
  const activeHidden = mode === "mobile" ? hiddenMobile : mode === "tablet" ? hiddenTablet : hiddenDesktop;

  allRows.forEach((row) => {
    const cells = Array.from(row.cells);
    let stackTitle = "";

    cells.forEach((cell, index) => {
      const col = index + 1;
      const isTd = cell.tagName.toLowerCase() === "td";
      const label = labels[index] || `Coluna ${col}`;
      cell.setAttribute("data-col-index", String(col));
      if (isTd) {
        cell.setAttribute("data-label", label);
      }

      const hasImage = Boolean(cell.querySelector("img"));
      const hasCta = Boolean(
        cell.querySelector(
          '[data-type="cta-button"], .cta-button, [data-type="affiliate-cta"], a[rel*="sponsored"], a[href*="amazon."], a[href*="a.co"], a[href*="amzn.to"]'
        )
      );
      const kind = hasCta ? "cta" : hasImage ? "media" : "text";
      if (isTd) {
        cell.setAttribute("data-cell-kind", kind);
      }

      setFlag(cell, "data-key-desktop", keyDesktop === col);
      setFlag(cell, "data-key-tablet", keyTablet === col);
      setFlag(cell, "data-key-mobile", keyMobile === col);
      setFlag(cell, "data-hidden-desktop", hiddenDesktop.has(col));
      setFlag(cell, "data-hidden-tablet", hiddenTablet.has(col));
      setFlag(cell, "data-hidden-mobile", hiddenMobile.has(col));
      setFlag(cell, "data-hidden-active", activeHidden.has(col));

      if (activeKey === col) {
        const candidateTitle = (cell.textContent || "").replace(/\s+/g, " ").trim();
        if (candidateTitle) stackTitle = candidateTitle;
      }
    });

    if (stackTitle) {
      row.setAttribute("data-stack-title", stackTitle);
    } else {
      row.removeAttribute("data-stack-title");
    }
  });
}

export function EditorCanvas() {
  const {
    editor,
    postId,
    onOpenLinkDialog,
    onOpenMedia,
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
    saving,
    lastSavedAt,
    onSave,
    meta,
    silos,
    previewMode,
    setPreviewMode,
  } = useEditorContext();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [canMoveUp, setCanMoveUp] = useState(false);
  const [canMoveDown, setCanMoveDown] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [imageAlign, setImageAlign] = useState<"left" | "center" | "right" | null>(null);
  const headerCenterSlot = useSyncExternalStore(
    subscribeHeaderCenterSlot,
    getHeaderCenterSlotSnapshot,
    getHeaderCenterSlotServerSnapshot
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const onScroll = () => {
      const max = element.scrollHeight - element.clientHeight;
      setScrollProgress(max > 0 ? element.scrollTop / max : 0);
    };
    onScroll();
    element.addEventListener("scroll", onScroll);
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!editor) return;

    const syncTables = () => {
      const root = scrollRef.current;
      if (!root) return;
      const tables = root.querySelectorAll(".editor-content table");
      tables.forEach((table) => {
        enhanceResponsiveTablePreview(table as HTMLTableElement, previewMode);
      });
    };

    const syncOnNextFrame = () => {
      if (typeof window === "undefined") return;
      window.requestAnimationFrame(syncTables);
    };

    syncOnNextFrame();
    editor.on("transaction", syncOnNextFrame);
    editor.on("selectionUpdate", syncOnNextFrame);

    return () => {
      editor.off("transaction", syncOnNextFrame);
      editor.off("selectionUpdate", syncOnNextFrame);
    };
  }, [editor, previewMode]);

  useEffect(() => {
    if (!editor) return;

    const updateSelectionState = () => {
      const selection = editor.state.selection as any;
      const selectedImage = Boolean(selection?.node?.type?.name === "image");
      setIsImageSelected(selectedImage);

      if (selectedImage) {
        const attrs = selection.node.attrs ?? {};
        const effectiveAttrs = getBpAttrs(attrs, previewMode);
        const legacyAlign =
          previewMode === "mobile"
            ? attrs["data-mobile-align"] ?? attrs["data-tablet-align"]
            : previewMode === "tablet"
              ? attrs["data-tablet-align"]
              : attrs["data-align"];
        const resolvedAlign = (effectiveAttrs.align || legacyAlign || attrs["data-align"] || "center") as
          | "left"
          | "center"
          | "right";
        setImageAlign(resolvedAlign);
      } else {
        setImageAlign(null);
      }

      const currentPos =
        editor.state.selection.$from.depth >= 1
          ? editor.state.selection.$from.before(1)
          : Math.max(0, editor.state.selection.from);
      let index = -1;
      let count = 0;
      editor.state.doc.forEach((_node, offset, i) => {
        count += 1;
        if (offset === currentPos) index = i;
      });
      setCanMoveUp(index > 0);
      setCanMoveDown(index >= 0 && index < count - 1);
    };

    updateSelectionState();
    editor.on("selectionUpdate", updateSelectionState);
    editor.on("transaction", updateSelectionState);

    return () => {
      editor.off("selectionUpdate", updateSelectionState);
      editor.off("transaction", updateSelectionState);
    };
  }, [editor, previewMode]);

  useEffect(() => {
    const openQuickFind = () => setFindOpen(true);

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        openQuickFind();
      }
    };

    const onQuickFindEvent = () => openQuickFind();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("editor:open-quick-find", onQuickFindEvent as EventListener);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("editor:open-quick-find", onQuickFindEvent as EventListener);
    };
  }, []);

  const savedLabel = useMemo(() => formatRelativeTime(lastSavedAt), [lastSavedAt]);
  const articleUpdatedLabel = useMemo(() => formatArticleDate(lastSavedAt), [lastSavedAt]);
  const previewPath = useMemo(() => (postId ? `/admin/preview/${postId}` : ""), [postId]);
  const canPreview = Boolean(previewPath);
  const currentSilo = useMemo(
    () => silos.find((item) => item.id === meta.siloId) ?? null,
    [meta.siloId, silos]
  );
  const displayTitle = useMemo(
    () => pickFirstText(meta.title, meta.targetKeyword, "Título do artigo"),
    [meta.targetKeyword, meta.title]
  );
  const displayAuthor = useMemo(
    () => pickFirstText(meta.expertName, meta.authorName, "Equipe projeto"),
    [meta.authorName, meta.expertName]
  );
  const reviewerName = useMemo(() => pickFirstText(meta.reviewedBy), [meta.reviewedBy]);
  const showReviewer = Boolean(
    reviewerName && normalizeComparable(reviewerName) !== normalizeComparable(displayAuthor)
  );
  const heroAlt = useMemo(
    () => pickFirstText(meta.heroImageAlt, displayTitle, "Capa do artigo"),
    [displayTitle, meta.heroImageAlt]
  );
  const previewWidths: Record<typeof previewMode, number> = {
    desktop: 1200,
    tablet: 768,
    mobile: 390,
  };
  const previewWidth = previewMode === "desktop" ? "100%" : `${previewWidths[previewMode]}px`;
  const editorActionClass =
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[5px] border border-[rgba(64,209,219,0.34)] bg-[rgba(42,42,48,0.98)] px-2.5 text-[11px] font-semibold text-(--text) shadow-[0_12px_18px_-18px_rgba(0,0,0,0.56)] transition hover:border-[rgba(64,209,219,0.62)] hover:bg-[rgba(42,42,48,1)]";
  const editorPrimaryActionClass =
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[5px] border border-[rgba(64,209,219,0.72)] bg-[rgba(42,42,48,0.98)] px-2.5 text-[11px] font-semibold text-(--brand-accent) shadow-[0_14px_24px_-20px_rgba(0,0,0,0.56)] transition hover:brightness-95";
  const editorIconActionClass =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-[rgba(64,209,219,0.34)] bg-[rgba(42,42,48,0.98)] text-(--text) shadow-[0_10px_14px_-14px_rgba(0,0,0,0.56)] transition hover:border-[rgba(64,209,219,0.62)] hover:bg-[rgba(42,42,48,1)] disabled:cursor-not-allowed disabled:opacity-45";
  const editorIconActionActiveClass =
    "border-[rgba(64,209,219,0.78)] bg-[rgba(42,42,48,0.98)] text-(--brand-accent)";
  const editorHeaderControls = (
    <div className="admin-scrollbar flex min-w-0 items-center justify-center gap-2 overflow-x-auto overflow-y-hidden py-0.5 text-[11px] text-(--muted)">
      <div className="flex shrink-0 items-center gap-2 rounded-[5px] border border-[rgba(64,209,219,0.3)] bg-[rgba(42,42,48,0.98)] px-2.5 py-1 shadow-[0_12px_20px_-18px_rgba(0,0,0,0.56)]">
        <span className="font-semibold text-(--text)">Editor</span>
        <span className="h-1 w-12 rounded-sm bg-(--surface-muted)">
          <span
            className="block h-1 rounded-sm bg-(--brand-hot) transition-all"
            style={{ width: `${Math.min(100, scrollProgress * 100)}%` }}
          />
        </span>
        <span className={saving ? "text-(--admin-warning)" : "text-(--muted)"}>{saving ? "Salvando..." : savedLabel}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className={editorIconActionClass}
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
          title="Desfazer"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className={editorIconActionClass}
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
          title="Refazer"
        >
          <Redo2 size={16} />
        </button>
        <button
          type="button"
          className={editorIconActionClass}
          disabled={!canMoveUp}
          onClick={() => onMoveBlockUp?.()}
          title="Mover bloco para cima"
        >
          <MoveUp size={16} />
        </button>
        <button
          type="button"
          className={editorIconActionClass}
          disabled={!canMoveDown}
          onClick={() => onMoveBlockDown?.()}
          title="Mover bloco para baixo"
        >
          <MoveDown size={16} />
        </button>
        <button
          type="button"
          className={`${editorIconActionClass} ${imageAlign === "left" ? editorIconActionActiveClass : ""}`}
          disabled={!isImageSelected}
          onClick={() => onAlignImage?.("left")}
          title="Alinhar esquerda"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          className={`${editorIconActionClass} ${imageAlign === "center" ? editorIconActionActiveClass : ""}`}
          disabled={!isImageSelected}
          onClick={() => onAlignImage?.("center")}
          title="Centralizar imagem"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          className={`${editorIconActionClass} ${imageAlign === "right" ? editorIconActionActiveClass : ""}`}
          disabled={!isImageSelected}
          onClick={() => onAlignImage?.("right")}
          title="Alinhar direita"
        >
          <AlignRight size={16} />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1 rounded-[5px] border border-[rgba(64,209,219,0.3)] bg-[rgba(42,42,48,0.98)] p-0.5 shadow-[0_12px_20px_-18px_rgba(0,0,0,0.56)]">
        <span className="pl-2 text-[10px] font-semibold tracking-[0.01em] text-(--muted-2)">Modos</span>
        <button
          type="button"
          onClick={() => setPreviewMode("desktop")}
          className={`rounded-[5px] px-1.5 py-1 transition ${
            previewMode === "desktop"
              ? "bg-[rgba(42,42,48,0.98)] text-(--brand-accent) shadow-[0_8px_14px_-12px_rgba(0,0,0,0.46)]"
              : "text-(--muted-2) hover:bg-[rgba(64,209,219,0.06)] hover:text-(--brand-accent)"
          }`}
          title="Desktop"
        >
          <Laptop size={14} />
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode("tablet")}
          className={`rounded-[5px] px-1.5 py-1 transition ${
            previewMode === "tablet"
              ? "bg-[rgba(42,42,48,0.98)] text-(--brand-accent) shadow-[0_8px_14px_-12px_rgba(0,0,0,0.46)]"
              : "text-(--muted-2) hover:bg-[rgba(64,209,219,0.06)] hover:text-(--brand-accent)"
          }`}
          title="Tablet"
        >
          <Tablet size={14} />
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode("mobile")}
          className={`rounded-[5px] px-1.5 py-1 transition ${
            previewMode === "mobile"
              ? "bg-[rgba(42,42,48,0.98)] text-(--brand-accent) shadow-[0_8px_14px_-12px_rgba(0,0,0,0.46)]"
              : "text-(--muted-2) hover:bg-[rgba(64,209,219,0.06)] hover:text-(--brand-accent)"
          }`}
          title="Mobile"
        >
          <Smartphone size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFindOpen(true)}
        className={editorActionClass}
        title="Buscar e linkar termos no artigo (Ctrl+F)"
      >
        <Search size={14} />
        <span>Buscar</span>
      </button>
      <button type="button" onClick={() => void onSave()} className={editorPrimaryActionClass}>
        Salvar
      </button>
      <button
        type="button"
        onClick={() => {
          if (!canPreview) return;
          window.open(previewPath, "_blank", "noopener,noreferrer");
        }}
        disabled={!canPreview}
        className={canPreview ? editorActionClass : `${editorActionClass} opacity-55`}
        title={canPreview ? "Abrir preview do rascunho" : "Salve o rascunho para habilitar o preview"}
      >
        Preview
      </button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-transparent">
      {headerCenterSlot ? createPortal(editorHeaderControls, headerCenterSlot) : null}

      <div className="admin-glass z-30 shrink-0 border-b border-(--border-strong) bg-[rgba(26,26,31,0.96)]">
        <div className="flex min-w-0 items-center gap-2 px-2 py-1 text-[11px] text-(--muted) md:px-3">
          {!headerCenterSlot ? <div className="flex shrink-0 items-center gap-1.5">{editorHeaderControls}</div> : null}

          <FixedToolbar
            editor={editor}
            previewMode={previewMode}
            onOpenLink={onOpenLinkDialog}
            onOpenMedia={onOpenMedia}
            onInsertProduct={onInsertProduct}
            onInsertYoutube={onInsertYoutube}
            onInsertTable={onInsertTable}
            onInsertCallout={onInsertCallout}
            onInsertFaq={onInsertFaq}
            onInsertIconBlock={onInsertIconBlock}
            onInsertCarouselBlock={onInsertCarouselBlock}
            onAlignImage={onAlignImage}
            onUpdateImageResponsive={onUpdateImageResponsive}
            onUpdateImageVisibility={onUpdateImageVisibility}
            onResetImageResponsive={onResetImageResponsive}
            onClearImageResponsive={onClearImageResponsive}
            onSetTableRenderMode={onSetTableRenderMode}
            onApplyTableMobileSlide={onApplyTableMobileSlide}
            onApplyTableMobileCards={onApplyTableMobileCards}
            onResetTableRenderMode={onResetTableRenderMode}
            onUpdateTableResponsive={onUpdateTableResponsive}
            onUpdateTableVisibility={onUpdateTableVisibility}
            onResetTableResponsive={onResetTableResponsive}
            onClearTableResponsive={onClearTableResponsive}
            onMoveBlockUp={onMoveBlockUp}
            onMoveBlockDown={onMoveBlockDown}
            onPreviewModeChange={setPreviewMode}
          />
        </div>
      </div>

      <div ref={scrollRef} className="admin-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto min-h-full w-full px-1.5 py-1.5 md:px-2 md:py-2">
          {editor ? (
            <div
              data-preview-mode={previewMode}
              data-editor-preview="true"
              className={`editor-preview-shell editor-public-preview post-page relative mx-auto w-full ${
                previewMode === "desktop" ? "max-w-[1360px]" : "editor-preview-device-frame overflow-hidden rounded-[24px]"
              }`}
              style={previewMode === "desktop" ? undefined : { maxWidth: previewWidth }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px]" style={{ background: 'linear-gradient(to bottom, #f8fafc, rgba(248,250,252,0.2), transparent)' }} />

              <section className="relative z-10 bg-transparent">
                <article className="page-in relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-5 md:px-6">
                  <header className="space-y-3">
                    <nav className="text-[11px] text-(--muted-2)">
                      <span>Home</span> / <span>{currentSilo?.name ?? "Silo"}</span> / {displayTitle}
                    </nav>

                    <div>
                      <span className="inline-flex items-center rounded-full border border-(--border) bg-white/80 dark:bg-slate-900/80 px-3 py-1 text-xs font-semibold text-(--muted-2)">
                        Voltar para {currentSilo?.name ?? "o silo"}
                      </span>
                    </div>

                    <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{displayTitle}</h1>

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-(--muted)">
                      <div className="flex items-center gap-1">
                        <span className="text-(--muted-2)">Por</span>
                        <span className="font-semibold text-(--ink)">{displayAuthor}</span>
                      </div>

                      {showReviewer ? (
                        <div className="flex items-center gap-1 border-l border-(--border) pl-4">
                          <span className="text-(--muted-2)">Revisão tecnica</span>
                          <span className="font-semibold text-(--ink)">{reviewerName}</span>
                        </div>
                      ) : null}

                      {articleUpdatedLabel ? (
                        <div className="flex items-center gap-1 border-l border-(--border) pl-4">
                          <span className="text-(--muted-2)">Atualizado</span>
                          <time>{articleUpdatedLabel}</time>
                        </div>
                      ) : null}
                    </div>
                  </header>

                  {meta.heroImageUrl ? (
                    <div className="mt-6 overflow-hidden rounded-xl">
                      <div
                        role="img"
                        aria-label={heroAlt}
                        className="aspect-[1200/630] w-full bg-(--surface-muted) bg-cover bg-center"
                        style={{ backgroundImage: `url("${meta.heroImageUrl}")` }}
                      />
                    </div>
                  ) : null}
                </article>
              </section>

              <article className="page-in relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-5 md:px-6">
                <div className="mx-auto max-w-[920px]">
                  <div className="content">
                    <EditorContent editor={editor} className="editor-content content" />
                  </div>
                </div>
              </article>
            </div>
          ) : null}
        </div>
      </div>

      <ArticleFindDialog open={findOpen} onClose={() => setFindOpen(false)} />
    </div>
  );
}
