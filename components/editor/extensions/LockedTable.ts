import { mergeAttributes } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import type { EditorState } from "@tiptap/pm/state";
import { getBpAttrs, normalizeResponsiveMap, serializeResponsiveMap, visibilityDataAttrs } from "@/lib/editor/responsive";

function selectionHasLockedTable(state: EditorState) {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      return Boolean(node.attrs?.locked);
    }
  }
  return false;
}

function parseResponsive(raw: string | null) {
  if (!raw) return null;
  try {
    return normalizeResponsiveMap(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseLayout(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function toHiddenColumnsString(value: unknown) {
  if (Array.isArray(value)) {
    const tokens = value
      .map((item) => Number.parseInt(String(item), 10))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => String(item));
    return tokens.length ? `|${Array.from(new Set(tokens)).join("|")}|` : "";
  }
  return String(value || "");
}

function parseColumnWidths(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const normalized = parsed
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => Math.round(item * 100) / 100);
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

function normalizeColumnWidths(value: unknown) {
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
      const name = suffix ? `${baseVar}-${suffix}` : baseVar;
      return `${name}:${cssValue}`;
    })
    .filter(Boolean);
}

export const LockedTable = Table.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      locked: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-locked") === "true",
        renderHTML: (attributes) => (attributes.locked ? { "data-locked": "true" } : {}),
      },
      renderMode: {
        default: "table",
        parseHTML: (element) => element.getAttribute("data-render-mode") || "table",
      },
      renderModeTablet: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-render-mode-tablet"),
      },
      renderModeMobile: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-render-mode-mobile"),
      },
      wrapCells: {
        default: true,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-wrap-cells");
          if (raw === "false") return false;
          if (raw === "true") return true;
          return true;
        },
      },
      wrapCellsTablet: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-wrap-cells-tablet");
          if (raw === "false") return false;
          if (raw === "true") return true;
          return null;
        },
      },
      wrapCellsMobile: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-wrap-cells-mobile");
          if (raw === "false") return false;
          if (raw === "true") return true;
          return null;
        },
      },
      hiddenColumns: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-hidden-columns") || "",
      },
      hiddenColumnsTablet: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-hidden-columns-tablet"),
      },
      hiddenColumnsMobile: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-hidden-columns-mobile"),
      },
      columnWidths: {
        default: [],
        parseHTML: (element) => parseColumnWidths(element.getAttribute("data-column-widths")) ?? [],
      },
      columnWidthsTablet: {
        default: null,
        parseHTML: (element) => parseColumnWidths(element.getAttribute("data-column-widths-tablet")),
      },
      columnWidthsMobile: {
        default: null,
        parseHTML: (element) => parseColumnWidths(element.getAttribute("data-column-widths-mobile")),
      },
      stackKeyColumn: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-stack-key-column");
          const parsed = Number.parseInt(String(raw ?? ""), 10);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        },
      },
      stackKeyColumnTablet: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-stack-key-column-tablet");
          const parsed = Number.parseInt(String(raw ?? ""), 10);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        },
      },
      stackKeyColumnMobile: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-stack-key-column-mobile");
          const parsed = Number.parseInt(String(raw ?? ""), 10);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        },
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
      layout: {
        default: null,
        parseHTML: (element) => parseLayout(element.getAttribute("data-layout")),
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

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, any>;
    const withResponsive: Record<string, any> = {
      ...attrs,
      responsive: normalizeResponsiveMap(attrs.responsive),
    };
    const desktopResolved = getBpAttrs(withResponsive, "desktop");
    const tabletResolved = getBpAttrs(withResponsive, "tablet");
    const mobileResolved = getBpAttrs(withResponsive, "mobile");
    const layoutDesktop = withResponsive.layout?.desktop || {};
    const layoutTablet = withResponsive.layout?.tablet || {};
    const layoutMobile = withResponsive.layout?.mobile || {};
    const baseMode = String(desktopResolved.renderMode || layoutDesktop.renderMode || withResponsive.renderMode || "table");
    const tabletMode = String(tabletResolved.renderMode || layoutTablet.renderMode || withResponsive.renderModeTablet || baseMode);
    const mobileMode = String(
      mobileResolved.renderMode ||
      layoutMobile.renderMode ||
      withResponsive.renderModeMobile ||
      tabletMode ||
      "stack"
    );
    const baseWrapCells = Boolean(desktopResolved.wrapCells ?? layoutDesktop.wrap ?? withResponsive.wrapCells ?? true);
    const tabletWrapCells = Boolean(tabletResolved.wrapCells ?? layoutTablet.wrap ?? withResponsive.wrapCellsTablet ?? baseWrapCells);
    const mobileWrapCells = Boolean(mobileResolved.wrapCells ?? layoutMobile.wrap ?? withResponsive.wrapCellsMobile ?? tabletWrapCells ?? baseWrapCells);
    const baseHiddenColumns = String(
      desktopResolved.hiddenColumns ||
      toHiddenColumnsString(layoutDesktop.hideColumns) ||
      withResponsive.hiddenColumns ||
      ""
    );
    const tabletHiddenColumns = String(
      tabletResolved.hiddenColumns ||
      toHiddenColumnsString(layoutTablet.hideColumns) ||
      withResponsive.hiddenColumnsTablet ||
      baseHiddenColumns
    );
    const mobileHiddenColumns = String(
      mobileResolved.hiddenColumns ||
      toHiddenColumnsString(layoutMobile.hideColumns) ||
      withResponsive.hiddenColumnsMobile ||
      tabletHiddenColumns ||
      baseHiddenColumns
    );
    const baseColumnWidths =
      normalizeColumnWidths(desktopResolved.columnWidths || layoutDesktop.columnWidths || withResponsive.columnWidths) ||
      null;
    const tabletColumnWidths =
      normalizeColumnWidths(tabletResolved.columnWidths || layoutTablet.columnWidths || withResponsive.columnWidthsTablet) ||
      baseColumnWidths;
    const mobileColumnWidths =
      normalizeColumnWidths(mobileResolved.columnWidths || layoutMobile.columnWidths || withResponsive.columnWidthsMobile) ||
      tabletColumnWidths ||
      baseColumnWidths;
    const normalizeKeyColumn = (value: unknown) => {
      const parsed = Number.parseInt(String(value ?? ""), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };
    const baseKeyColumn =
      normalizeKeyColumn(desktopResolved.stackKeyColumn || layoutDesktop.keyColumn || withResponsive.stackKeyColumn) || null;
    const tabletKeyColumn =
      normalizeKeyColumn(tabletResolved.stackKeyColumn || layoutTablet.keyColumn || withResponsive.stackKeyColumnTablet) ||
      baseKeyColumn;
    const mobileKeyColumn =
      normalizeKeyColumn(mobileResolved.stackKeyColumn || layoutMobile.keyColumn || withResponsive.stackKeyColumnMobile) ||
      tabletKeyColumn ||
      baseKeyColumn;
    const baseStyle = typeof withResponsive.style === "string" ? withResponsive.style : "";
    const columnWidthVars = [
      ...buildColumnWidthVars(baseColumnWidths),
      ...buildColumnWidthVars(tabletColumnWidths, "tablet"),
      ...buildColumnWidthVars(mobileColumnWidths, "mobile"),
    ].join(";");
    const mergedStyle = [baseStyle, columnWidthVars].filter(Boolean).join(";");
    const layout = {
      desktop: {
        renderMode: baseMode,
        wrap: baseWrapCells,
        hideColumns: toHiddenColumnsString(baseHiddenColumns)
          .split("|")
          .map((item) => Number.parseInt(item, 10))
          .filter((item) => Number.isFinite(item) && item > 0),
        columnWidths: baseColumnWidths || [],
        keyColumn: baseKeyColumn,
      },
      tablet: {
        renderMode: tabletMode,
        wrap: tabletWrapCells,
        hideColumns: toHiddenColumnsString(tabletHiddenColumns)
          .split("|")
          .map((item) => Number.parseInt(item, 10))
          .filter((item) => Number.isFinite(item) && item > 0),
        columnWidths: tabletColumnWidths || [],
        keyColumn: tabletKeyColumn,
      },
      mobile: {
        renderMode: mobileMode,
        wrap: mobileWrapCells,
        hideColumns: toHiddenColumnsString(mobileHiddenColumns)
          .split("|")
          .map((item) => Number.parseInt(item, 10))
          .filter((item) => Number.isFinite(item) && item > 0),
        columnWidths: mobileColumnWidths || [],
        keyColumn: mobileKeyColumn,
      },
    };

    return [
      "table",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
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
        "data-layout": JSON.stringify(layout),
        ...visibilityDataAttrs(withResponsive),
        "data-responsive": serializeResponsiveMap(withResponsive.responsive),
        style: mergedStyle || null,
      }),
      ["tbody", 0],
    ];
  },

  addCommands() {
    const parentCommands = (this.parent?.() || {}) as Record<string, any>;
    const allowWhenLocked = new Set([
      "addColumnBefore",
      "addColumnAfter",
      "deleteColumn",
      "addRowBefore",
      "addRowAfter",
      "deleteRow",
      "deleteTable",
    ]);

    const wrap = (commandName: string) => {
      const parentCommand = parentCommands[commandName];
      if (!parentCommand) return undefined;
      return (...args: any[]) => ({ state, dispatch, editor }: any) => {
        if (selectionHasLockedTable(state) && !allowWhenLocked.has(commandName)) return false;
        return parentCommand(...args)({ state, dispatch, editor });
      };
    };

    return {
      ...parentCommands,
      addColumnBefore: wrap("addColumnBefore"),
      addColumnAfter: wrap("addColumnAfter"),
      deleteColumn: wrap("deleteColumn"),
      addRowBefore: wrap("addRowBefore"),
      addRowAfter: wrap("addRowAfter"),
      deleteRow: wrap("deleteRow"),
      deleteTable: wrap("deleteTable"),
      mergeCells: wrap("mergeCells"),
      splitCell: wrap("splitCell"),
      toggleHeaderRow: wrap("toggleHeaderRow"),
      toggleHeaderColumn: wrap("toggleHeaderColumn"),
      toggleHeaderCell: wrap("toggleHeaderCell"),
    } as any;
  },
});
