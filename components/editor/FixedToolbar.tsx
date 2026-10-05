"use client";

import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  ChevronDown,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  MessageCircleQuestion,
  List,
  ListOrdered,
  Quote,
  ShoppingCart,
  Strikethrough,
  Table as TableIcon,
  Sparkles,
  Underline,
  Youtube,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ProductDialog from "@/components/editor/ProductDialog";
import CtaButtonDialog from "@/components/editor/CtaButtonDialog";
import { getBpAttrs, normalizeResponsiveMap, resolveDeviceVisibility } from "@/lib/editor/responsive";

type Props = {
  editor: Editor | null;
  previewMode: "desktop" | "tablet" | "mobile";
  onPreviewModeChange?: (mode: "desktop" | "tablet" | "mobile") => void;
  onOpenLink: () => void;
  onOpenMedia: () => void;
  onInsertProduct: () => void;
  onInsertYoutube: () => void;
  onInsertTable: () => void;
  onInsertCallout: () => void;
  onInsertFaq: () => void;
  onInsertIconBlock: () => void;
  onInsertCarouselBlock: () => void;
  onAlignImage?: (align: "left" | "center" | "right") => void;
  onUpdateImageResponsive?: (patch: {
    align?: "left" | "center" | "right";
    widthMode?: "full" | "content" | "px";
    maxWidth?: number | null;
    wrap?: "none" | "wrap-left" | "wrap-right";
    spacingY?: "none" | "sm" | "md" | "lg";
  }) => void;
  onUpdateImageVisibility?: (patch: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  }) => void;
  onResetImageResponsive?: (fields?: Array<"align" | "widthMode" | "maxWidth" | "wrap" | "spacingY">) => void;
  onClearImageResponsive?: (fields?: Array<"align" | "widthMode" | "maxWidth" | "wrap" | "spacingY">) => void;
  onSetTableRenderMode?: (mode: "table" | "scroll" | "stack") => void;
  onApplyTableMobileSlide?: () => void;
  onApplyTableMobileCards?: () => void;
  onResetTableRenderMode?: () => void;
  onUpdateTableResponsive?: (patch: {
    renderMode?: "table" | "scroll" | "stack";
    wrapCells?: boolean;
    hiddenColumns?: string;
    columnWidths?: string | number[];
    stackKeyColumn?: number | null;
  }) => void;
  onUpdateTableVisibility?: (patch: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  }) => void;
  onResetTableResponsive?: (
    fields?: Array<"renderMode" | "wrapCells" | "hiddenColumns" | "columnWidths" | "stackKeyColumn">
  ) => void;
  onClearTableResponsive?: (
    fields?: Array<"renderMode" | "wrapCells" | "hiddenColumns" | "columnWidths" | "stackKeyColumn">
  ) => void;
  onMoveBlockUp?: () => void;
  onMoveBlockDown?: () => void;
};

type ClosestNodeMatch = {
  node: any;
  pos: number;
};

function toHiddenColumnsInput(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const tokens = raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => String(item));
  if (!tokens.length) {
    return raw
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  }
  return Array.from(new Set(tokens)).join(", ");
}

function toColumnWidthsInput(value: unknown) {
  if (Array.isArray(value)) {
    const nums = value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => String(Math.round(item * 100) / 100));
    return nums.join(", ");
  }
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = raw
    .replace(/^\[|\]$/g, "")
    .split(/[\s,;|]+/)
    .map((item) => Number.parseFloat(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => String(Math.round(item * 100) / 100));
  return Array.from(new Set(parsed)).join(", ");
}

function findClosestNodeByType(editor: Editor, nodeTypeName: string): ClosestNodeMatch | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== nodeTypeName) continue;
    const pos = depth > 0 ? $from.before(depth) : 0;
    return { node, pos };
  }
  return null;
}

function findFirstCellTextPosFromTable(tableMatch: ClosestNodeMatch | null) {
  if (!tableMatch) return null;
  let textPos: number | null = null;
  tableMatch.node.descendants((node: any, pos: number) => {
    if (node.type?.name !== "tableCell" && node.type?.name !== "tableHeader") return true;
    textPos = tableMatch.pos + pos + 2;
    return false;
  });
  return textPos;
}

function isSelectionInsideTable(editor: Editor) {
  const selection = editor.state.selection as any;
  const nodeType = selection?.node?.type?.name;
  if (nodeType === "table" || nodeType === "tableRow" || nodeType === "tableCell" || nodeType === "tableHeader") {
    return true;
  }

  const hasTableAncestor = ($pos: any) => {
    if (!$pos) return false;
    for (let depth = $pos.depth; depth >= 0; depth -= 1) {
      const typeName = $pos.node(depth)?.type?.name;
      if (typeName === "table" || typeName === "tableRow" || typeName === "tableCell" || typeName === "tableHeader") {
        return true;
      }
    }
    return false;
  };

  return hasTableAncestor(selection?.$from) || hasTableAncestor(selection?.$to);
}

function runTableCommand(
  editor: Editor,
  commandName: "addRowAfter" | "deleteRow" | "addColumnAfter" | "deleteColumn" | "deleteTable"
) {
  const runByName = (name: "addRowAfter" | "deleteRow" | "addColumnAfter" | "deleteColumn" | "deleteTable") => {
    const chain = editor.chain().focus();
    if (name === "addRowAfter") return chain.addRowAfter().run();
    if (name === "deleteRow") return chain.deleteRow().run();
    if (name === "addColumnAfter") return chain.addColumnAfter().run();
    if (name === "deleteTable") return chain.deleteTable().run();
    return chain.deleteColumn().run();
  };

  if (runByName(commandName)) return true;

  const cellMatch = findClosestNodeByType(editor, "tableCell") || findClosestNodeByType(editor, "tableHeader");
  if (cellMatch) {
    if (editor.chain().focus().setTextSelection(cellMatch.pos + 1).run() && runByName(commandName)) {
      return true;
    }
  }

  const tableMatch = findClosestNodeByType(editor, "table");
  const firstCellPos = findFirstCellTextPosFromTable(tableMatch);
  if (commandName === "deleteTable" && tableMatch) {
    if (editor.chain().focus().setTextSelection(tableMatch.pos + 1).run() && runByName(commandName)) {
      return true;
    }
  } else if (firstCellPos !== null) {
    const maxPos = Math.max(1, editor.state.doc.content.size - 1);
    const safePos = Math.max(1, Math.min(firstCellPos, maxPos));
    const tr = editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(safePos)));
    editor.view.dispatch(tr);
    if (runByName(commandName)) return true;
  }

  return false;
}

export function FixedToolbar({
  editor,
  previewMode,
  onPreviewModeChange,
  onOpenLink,
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
}: Props) {
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isCtaOpen, setIsCtaOpen] = useState(false);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const [headingValue, setHeadingValue] = useState<"paragraph" | "h2" | "h3" | "h4">("paragraph");
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [imageAlign, setImageAlign] = useState<"left" | "center" | "right" | null>(null);
  const [imageWidthMode, setImageWidthMode] = useState<"full" | "content" | "px">("content");
  const [imageWrap, setImageWrap] = useState<"none" | "wrap-left" | "wrap-right">("none");
  const [imageSpacingY, setImageSpacingY] = useState<"none" | "sm" | "md" | "lg">("md");
  const [imageMaxWidth, setImageMaxWidth] = useState<number | null>(null);
  const [imageOverrides, setImageOverrides] = useState({
    align: false,
    widthMode: false,
    maxWidth: false,
    wrap: false,
    spacingY: false,
  });
  const [imageVisibility, setImageVisibility] = useState({
    desktop: true,
    tablet: true,
    mobile: true,
  });
  const [isTableSelected, setIsTableSelected] = useState(false);
  const [tableRenderMode, setTableRenderMode] = useState<"table" | "scroll" | "stack">("table");
  const [tableModeOverride, setTableModeOverride] = useState(false);
  const [tableWrapCells, setTableWrapCells] = useState(true);
  const [tableWrapOverride, setTableWrapOverride] = useState(false);
  const [tableHiddenColumns, setTableHiddenColumns] = useState("");
  const [tableHiddenOverride, setTableHiddenOverride] = useState(false);
  const [tableColumnWidths, setTableColumnWidths] = useState("");
  const [tableColumnWidthsOverride, setTableColumnWidthsOverride] = useState(false);
  const [tableStackKeyColumn, setTableStackKeyColumn] = useState("");
  const [tableStackKeyOverride, setTableStackKeyOverride] = useState(false);
  const [tableVisibility, setTableVisibility] = useState({
    desktop: true,
    tablet: true,
    mobile: true,
  });
  const [globalStructureNotice, setGlobalStructureNotice] = useState<string | null>(null);
  const [modeScopedNotice, setModeScopedNotice] = useState<string | null>(null);
  const blockMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const blockMenuRef = useRef<HTMLDivElement | null>(null);
  const [blockMenuPosition, setBlockMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const updateState = () => {
      const nextHeading = editor.isActive("heading", { level: 2 })
        ? "h2"
        : editor.isActive("heading", { level: 3 })
          ? "h3"
          : editor.isActive("heading", { level: 4 })
            ? "h4"
            : "paragraph";
      setHeadingValue(nextHeading);

      const selection = editor.state.selection as any;
      const selectedImage = Boolean(selection?.node?.type?.name === "image");
      setIsImageSelected(selectedImage);
      if (selectedImage) {
        const attrs = selection.node.attrs ?? {};
        const responsive = normalizeResponsiveMap(attrs.responsive);
        const modeOverrides =
          previewMode === "desktop"
            ? {}
            : ((responsive[previewMode] ?? {}) as Record<string, unknown>);
        const effectiveAttrs = getBpAttrs(attrs, previewMode);
        const legacyAlign =
          previewMode === "mobile"
            ? attrs["data-mobile-align"] ?? attrs["data-tablet-align"]
            : previewMode === "tablet"
              ? attrs["data-tablet-align"]
              : attrs["data-align"];
        const resolvedAlign = (effectiveAttrs.align || legacyAlign || attrs["data-align"] || "center") as "left" | "center" | "right";
        const resolvedWidthMode = (effectiveAttrs.widthMode || attrs.widthMode || "content") as "full" | "content" | "px";
        const resolvedWrap = (effectiveAttrs.wrap || attrs.wrap || "none") as "none" | "wrap-left" | "wrap-right";
        const resolvedSpacing = (effectiveAttrs.spacingY || attrs.spacingY || "md") as "none" | "sm" | "md" | "lg";
        const resolvedMaxWidthRaw = effectiveAttrs.maxWidth ?? attrs.maxWidth ?? null;
        const resolvedMaxWidth = Number.parseInt(String(resolvedMaxWidthRaw ?? ""), 10);
        const resolvedVisibility = resolveDeviceVisibility(attrs);
        setImageAlign(resolvedAlign);
        setImageWidthMode(resolvedWidthMode);
        setImageWrap(resolvedWrap);
        setImageSpacingY(resolvedSpacing);
        setImageMaxWidth(Number.isFinite(resolvedMaxWidth) ? resolvedMaxWidth : null);
        setImageVisibility(resolvedVisibility);
        setImageOverrides({
          align: Object.prototype.hasOwnProperty.call(modeOverrides, "align"),
          widthMode: Object.prototype.hasOwnProperty.call(modeOverrides, "widthMode"),
          maxWidth: Object.prototype.hasOwnProperty.call(modeOverrides, "maxWidth"),
          wrap: Object.prototype.hasOwnProperty.call(modeOverrides, "wrap"),
          spacingY: Object.prototype.hasOwnProperty.call(modeOverrides, "spacingY"),
        });
      } else {
        setImageAlign(null);
        setImageWidthMode("content");
        setImageWrap("none");
        setImageSpacingY("md");
        setImageMaxWidth(null);
        setImageVisibility({
          desktop: true,
          tablet: true,
          mobile: true,
        });
        setImageOverrides({
          align: false,
          widthMode: false,
          maxWidth: false,
          wrap: false,
          spacingY: false,
        });
      }
      const hasTableSelection = isSelectionInsideTable(editor);
      const tableMatch = hasTableSelection ? findClosestNodeByType(editor, "table") : null;
      setIsTableSelected(hasTableSelection);
      if (hasTableSelection) {
        const attrs = (tableMatch?.node?.attrs ?? editor.getAttributes("table")) as Record<string, any>;
        const responsive = normalizeResponsiveMap(attrs.responsive);
        const modeOverrides =
          previewMode === "desktop"
            ? {}
            : ((responsive[previewMode] ?? {}) as Record<string, unknown>);
        const effectiveAttrs = getBpAttrs(attrs, previewMode);
        const legacyMode =
          previewMode === "mobile"
            ? attrs.renderModeMobile ?? attrs.renderModeTablet
            : previewMode === "tablet"
              ? attrs.renderModeTablet
              : attrs.renderMode;
        const legacyWrap =
          previewMode === "mobile"
            ? attrs.wrapCellsMobile ?? attrs.wrapCellsTablet
            : previewMode === "tablet"
              ? attrs.wrapCellsTablet
              : attrs.wrapCells;
        const legacyHiddenColumns =
          previewMode === "mobile"
            ? attrs.hiddenColumnsMobile ?? attrs.hiddenColumnsTablet
            : previewMode === "tablet"
              ? attrs.hiddenColumnsTablet
              : attrs.hiddenColumns;
        const legacyColumnWidths =
          previewMode === "mobile"
            ? attrs.columnWidthsMobile ?? attrs.columnWidthsTablet
            : previewMode === "tablet"
              ? attrs.columnWidthsTablet
              : attrs.columnWidths;
        const legacyStackKeyColumn =
          previewMode === "mobile"
            ? attrs.stackKeyColumnMobile ?? attrs.stackKeyColumnTablet
            : previewMode === "tablet"
              ? attrs.stackKeyColumnTablet
              : attrs.stackKeyColumn;
        const layoutBucket =
          previewMode === "mobile"
            ? attrs.layout?.mobile ?? attrs.layout?.tablet ?? attrs.layout?.desktop
            : previewMode === "tablet"
              ? attrs.layout?.tablet ?? attrs.layout?.desktop
              : attrs.layout?.desktop;
        const hasExplicitRenderMode =
          Object.prototype.hasOwnProperty.call(modeOverrides, "renderMode") ||
          Boolean(
            previewMode === "mobile"
              ? attrs.renderModeMobile
              : previewMode === "tablet"
                ? attrs.renderModeTablet
                : attrs.renderMode
          );
        const mode = (
          effectiveAttrs.renderMode ||
          layoutBucket?.renderMode ||
          legacyMode ||
          (previewMode === "mobile" && !hasExplicitRenderMode ? "stack" : attrs.renderMode) ||
          "table"
        ) as "table" | "scroll" | "stack";
        const resolvedWrapCells = Boolean(effectiveAttrs.wrapCells ?? layoutBucket?.wrap ?? legacyWrap ?? attrs.wrapCells ?? true);
        const resolvedHiddenColumns = String(
          effectiveAttrs.hiddenColumns || layoutBucket?.hideColumns?.join?.("|") || legacyHiddenColumns || attrs.hiddenColumns || ""
        );
        const resolvedColumnWidths = toColumnWidthsInput(
          effectiveAttrs.columnWidths ?? layoutBucket?.columnWidths ?? legacyColumnWidths ?? attrs.columnWidths ?? ""
        );
        const resolvedStackKeyRaw =
          effectiveAttrs.stackKeyColumn ??
          layoutBucket?.keyColumn ??
          legacyStackKeyColumn ??
          attrs.stackKeyColumn ??
          "";
        const resolvedStackKey = Number.parseInt(String(resolvedStackKeyRaw ?? ""), 10);
        const resolvedVisibility = resolveDeviceVisibility(attrs);
        setTableRenderMode(mode);
        setTableWrapCells(resolvedWrapCells);
        setTableHiddenColumns(toHiddenColumnsInput(resolvedHiddenColumns));
        setTableColumnWidths(resolvedColumnWidths);
        setTableStackKeyColumn(Number.isFinite(resolvedStackKey) && resolvedStackKey > 0 ? String(resolvedStackKey) : "");
        setTableVisibility(resolvedVisibility);
        setTableModeOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "renderMode"));
        setTableWrapOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "wrapCells"));
        setTableHiddenOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "hiddenColumns"));
        setTableColumnWidthsOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "columnWidths"));
        setTableStackKeyOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "stackKeyColumn"));
      } else {
        setTableRenderMode("table");
        setTableWrapCells(true);
        setTableHiddenColumns("");
        setTableColumnWidths("");
        setTableStackKeyColumn("");
        setTableModeOverride(false);
        setTableWrapOverride(false);
        setTableHiddenOverride(false);
        setTableColumnWidthsOverride(false);
        setTableStackKeyOverride(false);
        setTableVisibility({
          desktop: true,
          tablet: true,
          mobile: true,
        });
      }

    };

    updateState();
    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);
    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor, previewMode]);

  useEffect(() => {
    if (!isBlockMenuOpen) return;

    const updatePosition = () => {
      const trigger = blockMenuButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 220;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));
      setBlockMenuPosition({
        top: rect.bottom + 8,
        left,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        (blockMenuButtonRef.current && blockMenuButtonRef.current.contains(target)) ||
        (blockMenuRef.current && blockMenuRef.current.contains(target))
      ) {
        return;
      }
      setIsBlockMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBlockMenuOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isBlockMenuOpen]);

  if (!editor) return null;

  const notifyGlobalStructure = () => {
    if (previewMode === "desktop") return;
    setGlobalStructureNotice("Ação estrutural global: isso afeta Desktop, Tablet e Mobile.");
    window.setTimeout(() => {
      setGlobalStructureNotice((current) =>
        current === "Ação estrutural global: isso afeta Desktop, Tablet e Mobile." ? null : current
      );
    }, 2200);
  };

  const notifyModeScoped = () => {
    if (previewMode === "desktop") return;
    const label = previewMode === "mobile" ? "MOBILE" : "TABLET";
    setModeScopedNotice(`Ajuste responsivo: afeta apenas ${label}.`);
    window.setTimeout(() => {
      setModeScopedNotice((current) =>
        current === `Ajuste responsivo: afeta apenas ${label}.` ? null : current
      );
    }, 2200);
  };

  const runGlobalTableAction = (handler: () => void) => {
    notifyGlobalStructure();
    if (previewMode !== "desktop") {
      const proceed = window.confirm(
        "Ação global: isso afeta Desktop, Tablet e Mobile. Continuar?"
      );
      if (!proceed) return;
    }
    handler();
  };

  const runGlobalBlockAction = (handler: () => void) => {
    notifyGlobalStructure();
    if (previewMode !== "desktop") {
      const proceed = window.confirm(
        "Ação global: inserir/remover/mover bloco afeta todos os modos. Continuar?"
      );
      if (!proceed) return;
    }
    handler();
  };

  const runModeScopedAction = (handler: () => void) => {
    notifyModeScoped();
    handler();
  };

  const currentModeLabel =
    previewMode === "mobile" ? "mobile" : previewMode === "tablet" ? "tablet" : "desktop";
  const tableVisibleOnCurrentMode =
    previewMode === "mobile"
      ? tableVisibility.mobile
      : previewMode === "tablet"
        ? tableVisibility.tablet
        : tableVisibility.desktop;
  const imageVisibleOnCurrentMode =
    previewMode === "mobile"
      ? imageVisibility.mobile
      : previewMode === "tablet"
        ? imageVisibility.tablet
        : imageVisibility.desktop;
  const blockMenu =
    isBlockMenuOpen && blockMenuPosition
      ? createPortal(
          <div
            ref={blockMenuRef}
            className="fixed z-[95] w-[220px] overflow-hidden rounded-[8px] border border-(--border-strong) bg-[rgba(26,26,31,0.98)] shadow-[0_26px_42px_-26px_rgba(0,0,0,0.82)] backdrop-blur-sm"
            style={{ top: `${blockMenuPosition.top}px`, left: `${blockMenuPosition.left}px` }}
          >
            <div className="border-b border-(--border-strong) px-3 py-2">
          <p className="text-[11px] font-semibold text-(--text)">Blocos pouco usados</p>
              <p className="text-[10px] text-(--muted)">Ficam recolhidos para não roubar espaco.</p>
            </div>
            <div className="flex flex-col p-2">
              <DropdownAction
                icon={<MessageCircleQuestion size={15} />}
                label="FAQ"
                tone="text-(--brand-hot)"
                onClick={() => {
                  setIsBlockMenuOpen(false);
                  runGlobalBlockAction(onInsertFaq);
                }}
              />
              <DropdownAction
                icon={<List size={15} />}
                label="Ícones"
                tone="text-(--brand-accent)"
                onClick={() => {
                  setIsBlockMenuOpen(false);
                  runGlobalBlockAction(onInsertIconBlock);
                }}
              />
              <DropdownAction
                icon={<ImageIcon size={15} />}
                label="Carousel"
                tone="text-(--brand-primary)"
                onClick={() => {
                  setIsBlockMenuOpen(false);
                  runGlobalBlockAction(onInsertCarouselBlock);
                }}
              />
              <DropdownAction
                icon={<Sparkles size={15} />}
                label="CTA"
                tone="text-(--admin-warning)"
                onClick={() => {
                  setIsBlockMenuOpen(false);
                  runGlobalBlockAction(() => setIsCtaOpen(true));
                }}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="admin-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5 text-xs text-(--text)">
        <div className="flex items-center gap-2">
          <select
            value={headingValue}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "paragraph") {
                editor.chain().focus().setParagraph().run();
              } else if (value === "h2") {
                editor.chain().focus().setHeading({ level: 2 }).run();
              } else if (value === "h3") {
                editor.chain().focus().setHeading({ level: 3 }).run();
              } else {
                editor.chain().focus().setHeading({ level: 4 }).run();
              }
            }}
            className="admin-select min-h-[32px] w-[118px] px-2 py-1 text-[11px]"
          >
            <option value="paragraph">Parágrafo</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="h4">H4</option>
          </select>
        </div>

        <Separator />

        <ToolbarButton
          label="Negrito"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Itálico"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Sublinhado"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Riscado"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton
          label="Quote / Callout"
          active={editor.isActive("blockquote")}
          onClick={onInsertCallout}
        >
          <Quote size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton
          label="Lista"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Lista ordenada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton label="Link" onClick={onOpenLink}>
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Imagem" onClick={onOpenMedia}>
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="YouTube" onClick={onInsertYoutube}>
          <Youtube size={16} />
        </ToolbarButton>
        <ToolbarButton label="Tabela" onClick={() => runGlobalTableAction(onInsertTable)}>
          <TableIcon size={16} />
        </ToolbarButton>
        {isTableSelected ? (
          <>
            <span className="admin-badge admin-badge-warning">
              Tabela
            </span>
            <span className="admin-badge admin-badge-warning">
              Global
            </span>
          </>
        ) : null}
        <button
          type="button"
          ref={blockMenuButtonRef}
          aria-expanded={isBlockMenuOpen}
          aria-haspopup="menu"
          onClick={() => setIsBlockMenuOpen((current) => !current)}
          className={`ml-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[5px] border px-2.5 text-[11px] font-bold shadow-[0_12px_20px_-18px_rgba(0,0,0,0.56)] transition-all ${
            isBlockMenuOpen
              ? "border-[rgba(64,209,219,0.72)] bg-[rgba(42,42,48,0.98)] text-(--brand-accent)"
              : "border-(--border-strong) bg-[rgba(42,42,48,0.98)] text-(--text) hover:border-[rgba(64,209,219,0.58)] hover:bg-[rgba(42,42,48,1)]"
          }`}
        >
          <Sparkles size={16} />
          Blocos
          <ChevronDown size={14} className={isBlockMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
        <button
          type="button"
          onClick={() => runGlobalBlockAction(() => setIsProductOpen(true))}
          className="admin-button-primary ml-2 h-8 shrink-0 rounded-[5px] px-2.5 py-0 text-[11px] shadow-[0_14px_24px_-18px_rgba(0,0,0,0.62)]"
        >
          <ShoppingCart size={16} />
          Produto
        </button>
      </div>

      {isTableSelected ? (
        <div className="mt-1 flex w-full min-w-0 flex-wrap items-center gap-1 overflow-visible rounded-[6px] border border-(--border-strong) bg-[rgba(26,26,31,0.98)] px-2 py-1 text-[10px] text-(--text) shadow-[0_12px_22px_-20px_rgba(0,0,0,0.66)]">
          <ToolbarButton
            label="Adicionar linha"
            onClick={() => runGlobalTableAction(() => void runTableCommand(editor, "addRowAfter"))}
          >
            <span className="text-[10px] font-semibold">Linha +</span>
          </ToolbarButton>
          <ToolbarButton
            label="Remover linha"
            onClick={() => runGlobalTableAction(() => void runTableCommand(editor, "deleteRow"))}
          >
            <span className="text-[10px] font-semibold">Linha -</span>
          </ToolbarButton>
          <ToolbarButton
            label="Adicionar coluna"
            onClick={() => runGlobalTableAction(() => void runTableCommand(editor, "addColumnAfter"))}
          >
            <span className="text-[10px] font-semibold">Coluna +</span>
          </ToolbarButton>
          <ToolbarButton
            label="Remover coluna"
            onClick={() => runGlobalTableAction(() => void runTableCommand(editor, "deleteColumn"))}
          >
            <span className="text-[10px] font-semibold">Coluna -</span>
          </ToolbarButton>
          <ToolbarButton
            label="Remover tabela"
            onClick={() => {
              runGlobalTableAction(() => {
                const confirmed = window.confirm("Remover esta tabela inteira?");
                if (!confirmed) return;
                void runTableCommand(editor, "deleteTable");
              });
            }}
          >
            <span className="text-[10px] font-semibold text-(--admin-danger)">Tabela -</span>
          </ToolbarButton>

          <span className="mx-1 hidden h-4 w-px shrink-0 bg-(--border) md:inline-flex" />

          <span className="admin-badge admin-badge-positive">
            Modo
          </span>
          <span className="text-(--muted)">Ambiente:</span>
          <div className="inline-flex items-center overflow-hidden rounded-[5px] border border-[rgba(64,209,219,0.3)] bg-[rgba(24,24,32,0.72)]">
            <button
              type="button"
              onClick={() => onPreviewModeChange?.("desktop")}
              className={`px-1.5 py-0.5 transition ${
                previewMode === "desktop"
                  ? "bg-[rgba(42,42,48,0.98)] font-semibold text-(--brand-accent)"
                  : "text-(--muted) hover:bg-[rgba(64,209,219,0.06)] hover:text-(--text)"
              }`}
            >
              D
            </button>
            <button
              type="button"
              onClick={() => onPreviewModeChange?.("tablet")}
              className={`border-l border-(--border-strong) px-1.5 py-0.5 transition ${
                previewMode === "tablet"
                  ? "bg-[rgba(42,42,48,0.98)] font-semibold text-(--brand-accent)"
                  : "text-(--muted) hover:bg-[rgba(64,209,219,0.06)] hover:text-(--text)"
              }`}
            >
              T
            </button>
            <button
              type="button"
              onClick={() => onPreviewModeChange?.("mobile")}
              className={`border-l border-(--border-strong) px-1.5 py-0.5 transition ${
                previewMode === "mobile"
                  ? "bg-[rgba(42,42,48,0.98)] font-semibold text-(--brand-accent)"
                  : "text-(--muted) hover:bg-[rgba(64,209,219,0.06)] hover:text-(--text)"
              }`}
            >
              M
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onApplyTableMobileSlide?.();
              onPreviewModeChange?.("mobile");
              setTableRenderMode("scroll");
            }}
            className="rounded-[5px] border border-[rgba(64,209,219,0.46)] bg-(--surface-muted) px-1.5 py-0.5 font-semibold text-(--brand-accent) transition hover:bg-[rgba(42,42,48,0.72)]"
            title="Aplica apenas no mobile: render scroll + sem quebra de linha"
          >
            Slide mobile
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyTableMobileCards?.();
              onPreviewModeChange?.("mobile");
              setTableRenderMode("stack");
            }}
            className="rounded-[5px] border border-[rgba(167,157,77,0.5)] bg-(--surface-muted) px-1.5 py-0.5 font-semibold text-(--admin-warning) transition hover:bg-[rgba(42,42,48,0.72)]"
            title="Aplica apenas no mobile: render em cards (stack)"
          >
            Cards mobile
          </button>
          <span>Render tabela {tableModeOverride && previewMode !== "desktop" ? "*" : ""}</span>
          <select
            value={tableRenderMode}
            onChange={(event) => {
              const mode = event.target.value as "table" | "scroll" | "stack";
              setTableRenderMode(mode);
              runModeScopedAction(() => onSetTableRenderMode?.(mode));
            }}
            className="rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1 py-0.5 text-[10px] text-(--text) focus:border-[rgba(64,209,219,0.64)] focus:outline-none"
          >
            <option value="table">Table</option>
            <option value="scroll">Scroll</option>
            <option value="stack">Stack</option>
          </select>
          <label className="inline-flex items-center gap-1 rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1.5 py-0.5">
            <input
              type="checkbox"
              checked={tableWrapCells}
              onChange={(event) => {
                const next = event.target.checked;
                setTableWrapCells(next);
                runModeScopedAction(() => onUpdateTableResponsive?.({ wrapCells: next }));
              }}
            />
            Wrap {tableWrapOverride && previewMode !== "desktop" ? "*" : ""}
          </label>
          <input
            type="text"
            value={tableHiddenColumns}
            onChange={(event) => {
              const next = event.target.value;
              setTableHiddenColumns(next);
              runModeScopedAction(() => onUpdateTableResponsive?.({ hiddenColumns: next }));
            }}
            placeholder={
              tableHiddenOverride && previewMode !== "desktop"
                ? "Ocultar colunas * ex: 2,4"
                : "Ocultar colunas ex: 2,4"
            }
            className="w-40 rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1 py-0.5 text-[10px] text-(--text) placeholder:text-(--text) focus:border-[rgba(64,209,219,0.64)] focus:outline-none"
          />
          <input
            type="text"
            value={tableColumnWidths}
            onChange={(event) => {
              const next = event.target.value;
              setTableColumnWidths(next);
              runModeScopedAction(() => onUpdateTableResponsive?.({ columnWidths: next }));
            }}
            placeholder={
              tableColumnWidthsOverride && previewMode !== "desktop"
                ? "Larguras * ex: 20,35,45"
                : "Larguras ex: 20,35,45"
            }
            className="w-44 rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1 py-0.5 text-[10px] text-(--text) placeholder:text-(--text) focus:border-[rgba(64,209,219,0.64)] focus:outline-none"
          />
          <span>Título stack {tableStackKeyOverride && previewMode !== "desktop" ? "*" : ""}</span>
          <input
            type="number"
            min={1}
            value={tableStackKeyColumn}
            onChange={(event) => {
              const raw = event.target.value;
              setTableStackKeyColumn(raw);
              const parsed = Number.parseInt(raw, 10);
              runModeScopedAction(() =>
                onUpdateTableResponsive?.({
                  stackKeyColumn: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                })
              );
            }}
            placeholder={tableStackKeyOverride && previewMode !== "desktop" ? "Título* col" : "Título col"}
            title="Coluna-chave para o título do card no modo stack"
            className="w-24 rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1 py-0.5 text-[10px] text-(--text) placeholder:text-(--text) focus:border-[rgba(64,209,219,0.64)] focus:outline-none"
          />
          <label className="inline-flex items-center gap-1 rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1.5 py-0.5">
            <input
              type="checkbox"
              checked={tableVisibleOnCurrentMode}
              onChange={(event) => {
                const next = event.target.checked;
                const patch =
                  previewMode === "mobile"
                    ? ({ mobile: next } as { mobile: boolean })
                    : previewMode === "tablet"
                      ? ({ tablet: next } as { tablet: boolean })
                      : ({ desktop: next } as { desktop: boolean });
                setTableVisibility((current) => ({ ...current, [previewMode]: next }));
                runModeScopedAction(() => onUpdateTableVisibility?.(patch));
              }}
            />
            Visível no {currentModeLabel}
          </label>
          {previewMode !== "desktop" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  runModeScopedAction(() => {
                    onResetTableResponsive?.();
                    onResetTableRenderMode?.();
                  });
                }}
                className="rounded-[5px] border border-[rgba(64,209,219,0.45)] bg-(--surface-muted) px-1.5 py-0.5 text-[10px] font-semibold text-(--brand-accent) transition hover:bg-[rgba(42,42,48,0.72)]"
              >
                Herdar desktop
              </button>
              <button
                type="button"
                onClick={() => runModeScopedAction(() => onClearTableResponsive?.())}
                className="rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1.5 py-0.5 text-[10px] font-semibold text-(--text) transition hover:border-[rgba(64,209,219,0.52)] hover:bg-[rgba(42,42,48,0.72)]"
              >
                Limpar override
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {blockMenu}

      <ProductDialog isOpen={isProductOpen} onClose={() => setIsProductOpen(false)} editor={editor} />
      <CtaButtonDialog isOpen={isCtaOpen} onClose={() => setIsCtaOpen(false)} editor={editor} />

      {onAlignImage ? (
        <>
          {isImageSelected ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-(--border-strong) bg-[rgba(26,26,31,0.98)] px-2 py-1 text-[10px] text-(--text) shadow-[0_12px_22px_-20px_rgba(0,0,0,0.66)]">
              <span className="admin-badge admin-badge-positive">
                Modo
              </span>
              <span className="font-semibold">
                Imagem ({previewMode}) {imageOverrides.align && previewMode !== "desktop" ? "* align" : ""}
              </span>
              <span>Largura {imageOverrides.widthMode && previewMode !== "desktop" ? "*" : ""}</span>
              <select
                value={imageWidthMode}
                onChange={(event) => {
                  const next = event.target.value as "full" | "content" | "px";
                  setImageWidthMode(next);
                  runModeScopedAction(() => onUpdateImageResponsive?.({ widthMode: next }));
                }}
                className="rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1 py-0.5 text-[10px] text-(--text) focus:border-[rgba(64,209,219,0.64)] focus:outline-none"
              >
                <option value="content">Largura conteúdo</option>
                <option value="full">Largura total</option>
                <option value="px">Largura fixa (px)</option>
              </select>
              {imageWidthMode === "px" ? (
                <input
                  type="number"
                  value={imageMaxWidth ?? ""}
                  placeholder={previewMode !== "desktop" && imageOverrides.maxWidth ? "max px *" : "max px"}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    const parsed = Number.isFinite(next) ? next : null;
                    setImageMaxWidth(parsed);
                    runModeScopedAction(() => onUpdateImageResponsive?.({ maxWidth: parsed }));
                  }}
                  className="w-20 rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1 py-0.5 text-[10px] text-(--text) placeholder:text-(--text) focus:border-[rgba(64,209,219,0.64)] focus:outline-none"
                />
              ) : null}
              <span>Wrap {imageOverrides.wrap && previewMode !== "desktop" ? "*" : ""}</span>
              <select
                value={imageWrap}
                onChange={(event) => {
                  const next = event.target.value as "none" | "wrap-left" | "wrap-right";
                  setImageWrap(next);
                  runModeScopedAction(() => onUpdateImageResponsive?.({ wrap: next }));
                }}
                className="rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1 py-0.5 text-[10px] text-(--text) focus:border-[rgba(64,209,219,0.64)] focus:outline-none"
              >
                <option value="none">Sem wrap</option>
                <option value="wrap-left">Wrap esquerda</option>
                <option value="wrap-right">Wrap direita</option>
              </select>
              <span>Spacing {imageOverrides.spacingY && previewMode !== "desktop" ? "*" : ""}</span>
              <select
                value={imageSpacingY}
                onChange={(event) => {
                  const next = event.target.value as "none" | "sm" | "md" | "lg";
                  setImageSpacingY(next);
                  runModeScopedAction(() => onUpdateImageResponsive?.({ spacingY: next }));
                }}
                className="rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1 py-0.5 text-[10px] text-(--text) focus:border-[rgba(64,209,219,0.64)] focus:outline-none"
              >
                <option value="none">Sem margem</option>
                <option value="sm">Espaço P</option>
                <option value="md">Espaço M</option>
                <option value="lg">Espaço G</option>
              </select>
              <label className="inline-flex items-center gap-1 rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1.5 py-0.5">
                <input
                  type="checkbox"
                  checked={imageVisibleOnCurrentMode}
                  onChange={(event) => {
                    const next = event.target.checked;
                    const patch =
                      previewMode === "mobile"
                        ? ({ mobile: next } as { mobile: boolean })
                        : previewMode === "tablet"
                          ? ({ tablet: next } as { tablet: boolean })
                          : ({ desktop: next } as { desktop: boolean });
                    setImageVisibility((current) => ({ ...current, [previewMode]: next }));
                    runModeScopedAction(() => onUpdateImageVisibility?.(patch));
                  }}
                />
                Visível no {currentModeLabel}
              </label>
              {previewMode !== "desktop" ? (
                <>
                  <button
                    type="button"
                    onClick={() => runModeScopedAction(() => onResetImageResponsive?.())}
                    className="rounded-[5px] border border-[rgba(64,209,219,0.45)] bg-(--surface-muted) px-1.5 py-0.5 text-[10px] font-semibold text-(--brand-accent) transition hover:bg-[rgba(42,42,48,0.72)]"
                  >
                    Herdar desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => runModeScopedAction(() => onClearImageResponsive?.())}
                    className="rounded-[5px] border border-(--border-strong) bg-[rgba(24,24,32,0.72)] px-1.5 py-0.5 text-[10px] font-semibold text-(--text) transition hover:border-[rgba(64,209,219,0.52)] hover:bg-[rgba(42,42,48,0.72)]"
                  >
                    Limpar override
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {globalStructureNotice ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[85] -translate-x-1/2 rounded-[8px] border border-[rgba(167,157,77,0.54)] bg-[rgba(60,60,60,0.95)] px-3 py-2 text-[11px] font-medium text-(--admin-warning) shadow-[0_20px_30px_-22px_rgba(0,0,0,0.86)]">
          {globalStructureNotice}
        </div>
      ) : null}
      {modeScopedNotice ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[85] -translate-x-1/2 rounded-[8px] border border-[rgba(64,209,219,0.52)] bg-[rgba(60,60,60,0.95)] px-3 py-2 text-[11px] font-medium text-(--brand-accent) shadow-[0_20px_30px_-22px_rgba(0,0,0,0.86)]">
          {modeScopedNotice}
        </div>
      ) : null}
    </div>
  );
}

function DropdownAction({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-[5px] border border-transparent px-2.5 py-2 text-left text-[11px] font-semibold transition hover:border-[rgba(64,209,219,0.34)] hover:bg-[rgba(64,209,219,0.04)] ${tone}`}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] border border-current/20 bg-[rgba(24,24,32,0.72)]">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[5px] border px-1.5 py-0 text-[11px] font-semibold shadow-[0_10px_16px_-14px_rgba(0,0,0,0.56)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(64,209,219,0.42)] ${
        active
          ? "border-[rgba(64,209,219,0.74)] bg-[rgba(42,42,48,0.98)] text-(--brand-accent)"
          : "border-(--border-strong) bg-[rgba(42,42,48,0.98)] text-(--text) hover:border-[rgba(64,209,219,0.56)] hover:bg-[rgba(42,42,48,1)]"
      } ${disabled ? "cursor-not-allowed opacity-45 saturate-50" : ""}`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="hidden h-5 w-px shrink-0 bg-(--border) md:inline-flex" />;
}




