import type { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type FindRange = {
  from: number;
  to: number;
};

export type FindInContentState = {
  query: string;
  ranges: FindRange[];
  activeIndex: number;
  decorations: DecorationSet;
};

type FindMeta =
  | { type: "set-query"; query: string }
  | { type: "set-active-index"; index: number }
  | { type: "clear" };

const MAX_FIND_MATCHES = 1200;

export const findInContentPluginKey = new PluginKey<FindInContentState>("find-in-content");

function emptyState(): FindInContentState {
  return {
    query: "",
    ranges: [],
    activeIndex: 0,
    decorations: DecorationSet.empty,
  };
}

function normalizeForFind(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function findRanges(doc: any, query: string): FindRange[] {
  const needle = normalizeForFind(query.trim());
  if (!needle) return [];

  const out: FindRange[] = [];
  doc.descendants((node: any, pos: number) => {
    if (!node?.isText || !node.text) return true;
    if (out.length >= MAX_FIND_MATCHES) return false;

    const haystack = normalizeForFind(String(node.text ?? ""));
    if (!haystack) return true;

    let cursor = 0;
    while (cursor < haystack.length) {
      const index = haystack.indexOf(needle, cursor);
      if (index < 0) break;
      out.push({
        from: pos + index,
        to: pos + index + needle.length,
      });
      if (out.length >= MAX_FIND_MATCHES) break;
      cursor = index + Math.max(needle.length, 1);
    }

    return out.length < MAX_FIND_MATCHES;
  });

  return out;
}

function buildDecorations(doc: any, ranges: FindRange[], activeIndex: number) {
  if (!ranges.length) return DecorationSet.empty;
  const decorations = ranges.map((range, index) =>
    Decoration.inline(range.from, range.to, {
      class: index === activeIndex ? "editor-find-hit editor-find-hit-active" : "editor-find-hit",
      "data-find-hit-index": String(index + 1),
    })
  );
  return DecorationSet.create(doc, decorations);
}

function normalizeIndex(index: number, size: number) {
  if (!Number.isFinite(index) || size <= 0) return 0;
  if (index < 0) return 0;
  if (index >= size) return size - 1;
  return Math.floor(index);
}

function computeState(doc: any, query: string, activeIndex: number): FindInContentState {
  const ranges = query ? findRanges(doc, query) : [];
  const nextActive = normalizeIndex(activeIndex, ranges.length || 1);
  return {
    query,
    ranges,
    activeIndex: ranges.length ? nextActive : 0,
    decorations: buildDecorations(doc, ranges, ranges.length ? nextActive : 0),
  };
}

export const FindInContent = Extension.create({
  name: "findInContent",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindInContentState>({
        key: findInContentPluginKey,
        state: {
          init: (_config, state) => {
            return computeState(state.doc, "", 0);
          },
          apply: (tr, pluginState, _oldState, newState) => {
            const baseState = pluginState ?? emptyState();
            const meta = tr.getMeta(findInContentPluginKey) as FindMeta | undefined;

            if (!meta && !tr.docChanged) return baseState;

            if (meta?.type === "clear") {
              return computeState(newState.doc, "", 0);
            }

            if (meta?.type === "set-query") {
              const query = String(meta.query ?? "").trim();
              return computeState(newState.doc, query, 0);
            }

            if (meta?.type === "set-active-index") {
              if (!baseState.query) return baseState;
              if (!tr.docChanged) {
                const nextActive = normalizeIndex(meta.index, baseState.ranges.length || 1);
                return {
                  ...baseState,
                  activeIndex: baseState.ranges.length ? nextActive : 0,
                  decorations: buildDecorations(newState.doc, baseState.ranges, baseState.ranges.length ? nextActive : 0),
                };
              }
              return computeState(newState.doc, baseState.query, meta.index);
            }

            if (tr.docChanged && baseState.query) {
              return computeState(newState.doc, baseState.query, baseState.activeIndex);
            }

            return baseState;
          },
        },
        props: {
          decorations: (state) => findInContentPluginKey.getState(state)?.decorations ?? DecorationSet.empty,
        },
      }),
    ];
  },
});

export function getFindInContentState(editor: Editor | null): FindInContentState {
  if (!editor) return emptyState();
  return findInContentPluginKey.getState(editor.state) ?? emptyState();
}

export function setFindInContentQuery(editor: Editor | null, query: string) {
  if (!editor || editor.isDestroyed) return;
  const tr = editor.state.tr.setMeta(findInContentPluginKey, {
    type: "set-query",
    query,
  } satisfies FindMeta);
  editor.view.dispatch(tr);
}

export function setFindInContentActiveIndex(editor: Editor | null, index: number) {
  if (!editor || editor.isDestroyed) return;
  const tr = editor.state.tr.setMeta(findInContentPluginKey, {
    type: "set-active-index",
    index,
  } satisfies FindMeta);
  editor.view.dispatch(tr);
}

export function clearFindInContent(editor: Editor | null) {
  if (!editor || editor.isDestroyed) return;
  const tr = editor.state.tr.setMeta(findInContentPluginKey, {
    type: "clear",
  } satisfies FindMeta);
  editor.view.dispatch(tr);
}

export function jumpToFindResult(editor: Editor | null, range: FindRange) {
  if (!editor || editor.isDestroyed) return;
  const from = clamp(range.from, 1, editor.state.doc.content.size);
  const to = clamp(range.to, from, editor.state.doc.content.size);
  editor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run();
}
