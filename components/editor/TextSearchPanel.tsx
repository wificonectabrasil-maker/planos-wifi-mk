"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, WandSparkles } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import {
  clearFindInContent,
  getFindInContentState,
  jumpToFindResult,
  setFindInContentActiveIndex,
  setFindInContentQuery,
} from "@/components/editor/extensions/FindInContent";

type FindPreviewItem = {
  index: number;
  from: number;
  to: number;
  before: string;
  match: string;
  after: string;
};

function buildSnippet(value: string, maxChars: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  return `...${text.slice(Math.max(0, text.length - maxChars)).trim()}`;
}

export function TextSearchPanel() {
  const { editor } = useEditorContext();
  const [queryInput, setQueryInput] = useState("");

  const findState = getFindInContentState(editor);
  const totalMatches = findState.ranges.length;
  const activeIndex = totalMatches > 0 ? findState.activeIndex : -1;

  const previews = useMemo(() => {
    if (!editor || !totalMatches) return [];
    const maxItems = 40;
    const items = findState.ranges.slice(0, maxItems).map((range, index) => {
      const from = Math.max(1, range.from - 48);
      const to = Math.min(editor.state.doc.content.size, range.to + 48);
      const before = buildSnippet(editor.state.doc.textBetween(from, range.from, " ", " "), 48);
      const match = editor.state.doc.textBetween(range.from, range.to, " ", " ");
      const after = buildSnippet(editor.state.doc.textBetween(range.to, to, " ", " "), 48);
      return {
        index,
        from: range.from,
        to: range.to,
        before,
        match,
        after,
      } satisfies FindPreviewItem;
    });
    return items;
  }, [editor, findState.ranges, totalMatches]);

  useEffect(() => {
    if (!editor) return;
    return () => {
      clearFindInContent(editor);
    };
  }, [editor]);

  const runSearch = () => {
    if (!editor) return;
    setFindInContentQuery(editor, queryInput);
    const next = getFindInContentState(editor);
    if (next.ranges.length > 0) {
      jumpToFindResult(editor, next.ranges[0]);
    }
  };

  const clearSearch = () => {
    if (!editor) return;
    setQueryInput("");
    clearFindInContent(editor);
  };

  const focusResult = (index: number) => {
    if (!editor || !totalMatches) return;
    const safeIndex = Math.min(totalMatches - 1, Math.max(0, index));
    const range = findState.ranges[safeIndex];
    if (!range) return;
    setFindInContentActiveIndex(editor, safeIndex);
    jumpToFindResult(editor, range);
  };

  const jumpRelative = (delta: number) => {
    if (!totalMatches) return;
    const base = activeIndex >= 0 ? activeIndex : 0;
    const next = (base + delta + totalMatches) % totalMatches;
    focusResult(next);
  };

  const openQuickFind = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("editor:open-quick-find"));
  };

  return (
    <section className="admin-subpane space-y-2 p-2">
      <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
        <span className="flex items-center gap-1.5">
          <Search size={14} />
          Buscar No Artigo
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-(--muted-2)">
            {totalMatches} resultado{totalMatches === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={openQuickFind}
            className="admin-button-soft inline-flex min-h-0 items-center gap-1 px-2 py-1 text-[10px] text-(--brand-hot)"
          >
            <WandSparkles size={12} />
            Popup
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runSearch();
            }
          }}
          placeholder="Digite palavra ou frase..."
          className="admin-input min-h-[34px] px-3 py-1.5 text-[11px]"
        />
        <button
          type="button"
          onClick={runSearch}
          className="admin-button-primary min-h-[34px] px-3 py-1.5 text-[10px]"
        >
          Buscar
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => jumpRelative(-1)}
          disabled={!totalMatches}
          className="admin-button-soft min-h-[30px] flex-1 px-2 py-1 text-[10px] disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => jumpRelative(1)}
          disabled={!totalMatches}
          className="admin-button-soft min-h-[30px] flex-1 px-2 py-1 text-[10px] disabled:opacity-50"
        >
          Próxima
        </button>
        <button
          type="button"
          onClick={clearSearch}
          className="admin-button-soft min-h-[30px] px-2 py-1 text-[10px]"
        >
          Limpar
        </button>
      </div>

      {totalMatches > 0 ? (
        <div className="admin-scrollbar max-h-[180px] space-y-1 overflow-y-auto rounded-[12px] border border-(--border) bg-(--surface) p-2">
          {previews.map((item) => (
            <button
              key={`${item.from}-${item.to}-${item.index}`}
              type="button"
              onClick={() => focusResult(item.index)}
              className={`w-full rounded border px-2 py-1 text-left text-[10px] ${
                item.index === activeIndex
                  ? "border-[rgba(11,98,107,0.24)] bg-[rgba(15,155,142,0.08)] text-(--brand-hot)"
                  : "border-(--border) bg-(--surface-muted) text-(--text)"
              }`}
            >
              <span className="font-semibold">#{item.index + 1}</span>{" "}
              <span className="text-(--muted)">{item.before}</span>{" "}
              <mark className="rounded bg-[rgba(255,196,92,0.45)] px-0.5 text-(--text)">{item.match}</mark>{" "}
              <span className="text-(--muted)">{item.after}</span>
            </button>
          ))}
          {totalMatches > previews.length ? (
            <p className="text-[10px] text-(--muted-2)">
              Mostrando {previews.length} de {totalMatches} resultados.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[12px] border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted-2)">
          Use o campo acima para localizar palavra ou frase no artigo e navegar pelo contexto.
        </div>
      )}
    </section>
  );
}
