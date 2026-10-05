"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, Link2, Search, Square, WandSparkles, X, Loader2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useEditorContext } from "@/components/editor/EditorContext";
import {
  clearFindInContent,
  getFindInContentState,
  jumpToFindResult,
  setFindInContentActiveIndex,
  setFindInContentQuery,
} from "@/components/editor/extensions/FindInContent";

type Props = {
  open: boolean;
  onClose: () => void;
};

type LinkType = "external" | "internal" | "affiliate";

type FindPreviewItem = {
  index: number;
  from: number;
  to: number;
  before: string;
  match: string;
  after: string;
  linked: boolean;
  href: string;
};

function currentSelection(editor: Editor | null) {
  if (!editor) return "";
  const { from, to } = editor.state.selection;
  if (from === to) return "";
  return editor.state.doc.textBetween(from, to, " ").trim();
}

function buildSnippet(value: string, maxChars: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  return `...${text.slice(Math.max(0, text.length - maxChars)).trim()}`;
}

function isAmazonLike(url: string) {
  const lower = url.toLowerCase();
  return lower.includes("amazon.") || lower.includes("amzn.to") || lower.includes("a.co");
}

function collectLinkInfo(
  editor: Editor,
  range: { from: number; to: number }
) {
  const hrefs = new Set<string>();
  let linked = false;

  editor.state.doc.nodesBetween(range.from, range.to, (node) => {
    if (!node.isText) return;
    const linkMark = node.marks.find((mark) => mark.type.name === "link");
    if (!linkMark) return;
    linked = true;
    const href = String(linkMark.attrs?.href ?? "").trim();
    if (href) hrefs.add(href);
  });

  if (!linked) return { linked: false, href: "" };
  const list = Array.from(hrefs);
  if (list.length <= 1) {
    return { linked: true, href: list[0] ?? "" };
  }
  return { linked: true, href: `${list[0]} (+${list.length - 1})` };
}

function buildLinkAttrs(options: {
  url: string;
  linkType: LinkType;
  openInNewTab: boolean;
  nofollow: boolean;
  sponsored: boolean;
}) {
  const href = options.url.trim();
  const amazonLike = isAmazonLike(href);
  const effectiveType = amazonLike ? "affiliate" : options.linkType;
  const internal = effectiveType === "internal";
  const affiliate = effectiveType === "affiliate";
  const shouldOpenInNewTab = internal ? false : affiliate ? true : options.openInNewTab;
  const relTokens = new Set<string>();

  if (!internal && (affiliate || options.nofollow)) relTokens.add("nofollow");
  if (!internal && (affiliate || options.sponsored)) relTokens.add("sponsored");
  if (shouldOpenInNewTab) {
    relTokens.add("noopener");
    relTokens.add("noreferrer");
  }

  return {
    href,
    target: shouldOpenInNewTab ? "_blank" : null,
    rel: Array.from(relTokens).join(" ") || null,
    "data-link-type": effectiveType,
    "data-post-id": null,
    "data-entity-type": null,
    "data-entity": null,
  };
}

function applyLinkToRanges(
  editor: Editor,
  ranges: Array<{ from: number; to: number }>,
  attrs: Record<string, any>
) {
  const linkMark = editor.state.schema.marks.link;
  if (!linkMark || !ranges.length) return false;

  const tr = editor.state.tr;
  const ordered = [...ranges].sort((a, b) => b.from - a.from);

  ordered.forEach((range) => {
    const from = Math.max(1, Math.min(range.from, editor.state.doc.content.size));
    const to = Math.max(from, Math.min(range.to, editor.state.doc.content.size));
    tr.removeMark(from, to, linkMark);
    tr.addMark(from, to, linkMark.create(attrs));
  });

  editor.view.dispatch(tr);
  return true;
}

export function ArticleFindDialog({ open, onClose }: Props) {
  const { editor, onOpenLinkDialog, meta, postId, setActiveSuggestion } = useEditorContext();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);
  const [queryInput, setQueryInput] = useState("");
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<LinkType>("external");
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [nofollow, setNofollow] = useState(false);
  const [sponsored, setSponsored] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [, setRenderTick] = useState(0);
  const [loadingSuggestionIndex, setLoadingSuggestionIndex] = useState<number | null>(null);

  const handleSuggestImprovement = async (item: FindPreviewItem) => {
    if (!editor) return;
    setLoadingSuggestionIndex(item.index);
    try {
      const response = await fetch("/api/admin/improve-fragment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.match,
          title: meta.title || "",
          keyword: meta.targetKeyword || "",
          slug: meta.slug || "",
          siloId: meta.siloId || "",
          postId: postId || "",
          position: `busca ocorrência #${item.index + 1}`,
          reason: "search",
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao chamar API de melhoria");
      }

      const res = await response.json();
      if (res.ok) {
        setActiveSuggestion({
          from: item.from,
          to: item.to,
          originalText: item.match,
          improvedText: res.improvedText,
          explanation: res.explanation,
          options: res.options || [],
          selectedOptionIndex: 0,
        });
        onClose();
      } else {
        alert(res.error || "Ocorreu um erro ao obter sugestões.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro de rede ao obter sugestões.");
    } finally {
      setLoadingSuggestionIndex(null);
    }
  };

  const findState = getFindInContentState(editor);
  const totalMatches = findState.ranges.length;
  const activeIndex = totalMatches > 0 ? findState.activeIndex : -1;
  const amazonDetected = isAmazonLike(linkUrl);
  const effectiveLinkType: LinkType = amazonDetected ? "affiliate" : linkType;
  const internalLinkMode = effectiveLinkType === "internal";
  const affiliateLinkMode = effectiveLinkType === "affiliate";
  const effectiveOpenInNewTab = internalLinkMode ? false : affiliateLinkMode ? true : openInNewTab;
  const effectiveNofollow = internalLinkMode ? false : affiliateLinkMode ? true : nofollow;
  const effectiveSponsored = internalLinkMode ? false : affiliateLinkMode ? true : sponsored;
  const relationshipLocked = internalLinkMode || affiliateLinkMode;

  const previews = useMemo(() => {
    if (!editor || !totalMatches) return [];
    const maxItems = 80;

    return findState.ranges.slice(0, maxItems).map((range, index) => {
      const from = Math.max(1, range.from - 56);
      const to = Math.min(editor.state.doc.content.size, range.to + 56);
      const before = buildSnippet(editor.state.doc.textBetween(from, range.from, " ", " "), 56);
      const match = editor.state.doc.textBetween(range.from, range.to, " ", " ");
      const after = buildSnippet(editor.state.doc.textBetween(range.to, to, " ", " "), 56);
      const linkInfo = collectLinkInfo(editor, range);

      return {
        index,
        from: range.from,
        to: range.to,
        before,
        match,
        after,
        linked: linkInfo.linked,
        href: linkInfo.href,
      } satisfies FindPreviewItem;
    });
  }, [editor, findState.ranges, totalMatches]);

  const handleClose = useCallback(() => {
    if (editor) {
      clearFindInContent(editor);
    }
    setFeedback("");
    onClose();
  }, [editor, onClose]);

  useEffect(() => {
    if (!open || !editor) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    const preferredQuery = (findState.query || currentSelection(editor) || queryInput).trim();
    window.requestAnimationFrame(() => {
      if (preferredQuery) {
        setQueryInput(preferredQuery);
        if (preferredQuery !== findState.query) {
          setFindInContentQuery(editor, preferredQuery);
        }
        const next = getFindInContentState(editor);
        if (next.ranges.length > 0) {
          setSelectedIndexes(next.ranges.map((_, index) => index));
          setFindInContentActiveIndex(editor, 0);
          jumpToFindResult(editor, next.ranges[0]);
        } else {
          setSelectedIndexes([]);
        }
      }
      setFeedback("");
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, [editor, findState.query, open, queryInput]);

  useEffect(() => {
    if (!open || !editor) return;

    const sync = () => {
      setRenderTick((value) => value + 1);
    };

    editor.on("transaction", sync);
    editor.on("selectionUpdate", sync);
    return () => {
      editor.off("transaction", sync);
      editor.off("selectionUpdate", sync);
    };
  }, [editor, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const selectedCount = selectedIndexes.length;

  function runSearch() {
    if (!editor) return;
    const nextQuery = queryInput.trim();
    if (!nextQuery) {
      setSelectedIndexes([]);
      clearFindInContent(editor);
      return;
    }

    setFindInContentQuery(editor, nextQuery);
    const next = getFindInContentState(editor);
    setSelectedIndexes(next.ranges.map((_, index) => index));

    if (next.ranges.length > 0) {
      setFindInContentActiveIndex(editor, 0);
      jumpToFindResult(editor, next.ranges[0]);
      setFeedback("");
      return;
    }

    setFeedback("Nenhuma ocorrência encontrada no artigo.");
  }

  function focusResult(index: number) {
    if (!editor || !totalMatches) return;
    const safeIndex = Math.max(0, Math.min(index, totalMatches - 1));
    const range = findState.ranges[safeIndex];
    if (!range) return;
    setFindInContentActiveIndex(editor, safeIndex);
    jumpToFindResult(editor, range);
  }

  function jumpRelative(delta: number) {
    if (!totalMatches) return;
    const base = activeIndex >= 0 ? activeIndex : 0;
    const next = (base + delta + totalMatches) % totalMatches;
    focusResult(next);
  }

  function toggleIndex(index: number) {
    setSelectedIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index].sort((a, b) => a - b)
    );
  }

  function selectAll() {
    setSelectedIndexes(findState.ranges.map((_, index) => index));
  }

  function clearSelection() {
    setSelectedIndexes([]);
  }

  function clearSearch() {
    if (!editor) return;
    setQueryInput("");
    setSelectedIndexes([]);
    setFeedback("");
    clearFindInContent(editor);
  }

  function applyToIndexes(indexes: number[], label: string) {
    if (!editor) return;
    const href = linkUrl.trim();
    if (!href) {
      setFeedback("Informe a URL antes de aplicar os links.");
      return;
    }
    if (!indexes.length) {
      setFeedback("Selecione ao menos uma ocorrência.");
      return;
    }

    const attrs = buildLinkAttrs({
      url: href,
      linkType,
      openInNewTab,
      nofollow,
      sponsored,
    });
    const ranges = indexes
      .map((index) => findState.ranges[index])
      .filter(Boolean)
      .map((range) => ({ from: range.from, to: range.to }));

    if (!ranges.length) {
      setFeedback("Não foi possível localizar as ocorrências selecionadas.");
      return;
    }

    const applied = applyLinkToRanges(editor, ranges, attrs);
    if (!applied) {
      setFeedback("Falha ao aplicar os links.");
      return;
    }

    focusResult(indexes[0]);
    setFeedback(`${label}: ${ranges.length} ocorrência${ranges.length === 1 ? "" : "s"} atualizada${ranges.length === 1 ? "" : "s"}.`);
  }

  function openAdvancedLinkForActive() {
    if (!editor || activeIndex < 0) return;
    focusResult(activeIndex);
    onClose();
    window.requestAnimationFrame(() => {
      onOpenLinkDialog();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-95 flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-(--border) bg-(--surface) shadow-2xl">
        <div className="flex items-center justify-between border-b border-(--border) px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-(--text)">
            <Search size={16} />
            Buscar E Linkar No Artigo
          </div>
          <button type="button" onClick={handleClose} className="text-(--muted-2) hover:text-(--text)">
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.45fr)_340px]">
          <div className="flex min-h-0 flex-col border-b border-(--border) lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-(--border) px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2">
                  <Search size={15} className="text-(--muted-2)" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        runSearch();
                      }
                    }}
                    placeholder="Digite uma palavra ou frase do artigo..."
                    className="w-full bg-transparent text-sm text-(--text) outline-none placeholder:text-(--placeholder)"
                  />
                </div>
                <button type="button" onClick={runSearch} className="admin-button-primary min-h-[38px] rounded-xl px-4">
                  Buscar
                </button>
                <button type="button" onClick={clearSearch} className="admin-button-soft min-h-[38px] rounded-xl px-3">
                  Limpar
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-(--muted)">
                <span className="admin-badge admin-badge-neutral">
                  {totalMatches} resultado{totalMatches === 1 ? "" : "s"}
                </span>
                <span className="admin-badge admin-badge-neutral">
                  {selectedCount} marcado{selectedCount === 1 ? "" : "s"}
                </span>
                <button type="button" onClick={() => jumpRelative(-1)} disabled={!totalMatches} className="admin-button-soft min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] disabled:opacity-50">
                  Anterior
                </button>
                <button type="button" onClick={() => jumpRelative(1)} disabled={!totalMatches} className="admin-button-soft min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] disabled:opacity-50">
                  Próxima
                </button>
                <button type="button" onClick={selectAll} disabled={!totalMatches} className="admin-button-soft min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] disabled:opacity-50">
                  Marcar tudo
                </button>
                <button type="button" onClick={clearSelection} disabled={!selectedCount} className="admin-button-soft min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] disabled:opacity-50">
                  Limpar marcação
                </button>
                <button
                  type="button"
                  onClick={openAdvancedLinkForActive}
                  disabled={activeIndex < 0}
                  className="admin-button-ghost min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] disabled:opacity-50"
                >
                  <WandSparkles size={13} />
                  Super Link no ativo
                </button>
              </div>
            </div>

            <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {totalMatches > 0 ? (
                <div className="space-y-2">
                  {previews.map((item) => {
                    const selected = selectedIndexes.includes(item.index);
                    const active = item.index === activeIndex;
                    return (
                      <div
                        key={`${item.from}-${item.to}-${item.index}`}
                        className={`rounded-xl border p-2 ${active ? "border-[rgba(34,71,73,0.22)] bg-[rgba(34,71,73,0.08)]" : "border-(--border) bg-(--surface-muted)"}`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleIndex(item.index)}
                            className={`mt-0.5 shrink-0 rounded-md border p-1 ${selected ? "border-[rgba(34,71,73,0.2)] bg-[rgba(34,71,73,0.12)] text-(--brand-hot)" : "border-(--border) bg-(--surface) text-(--muted-2)"}`}
                            title={selected ? "Desmarcar ocorrencia" : "Marcar ocorrencia"}
                          >
                            {selected ? <CheckSquare size={14} /> : <Square size={14} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => focusResult(item.index)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-(--muted-2)">
                              <span className="font-semibold text-(--text)">#{item.index + 1}</span>
                              {item.linked ? (
                                <span className="rounded-full border border-[rgba(34,71,73,0.14)] bg-[rgba(34,71,73,0.08)] px-2 py-0.5 font-semibold text-(--brand-hot)">
                                  Já linkado
                                </span>
                              ) : (
                                <span className="rounded-full border border-(--border) bg-(--surface) px-2 py-0.5 font-semibold text-(--muted)">
                                  Sem link
                                </span>
                              )}
                              {item.href ? <span className="truncate text-(--muted)">{item.href}</span> : null}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-(--text)">
                              <span className="text-(--muted)">{item.before}</span>{" "}
                              <mark className="rounded bg-[rgba(96,165,250,0.3)] px-1 py-0.5 text-(--text)">{item.match}</mark>{" "}
                              <span className="text-(--muted)">{item.after}</span>
                            </div>
                          </button>

                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => applyToIndexes([item.index], "Aplicado so nesta ocorrencia")}
                              className="admin-button-soft min-h-[30px] shrink-0 rounded-lg px-2.5 py-1 text-[10px]"
                            >
                              So esta
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSuggestImprovement(item)}
                              disabled={loadingSuggestionIndex !== null}
                              className="admin-button-soft text-(--admin-positive) border-[color:var(--admin-positive)]/20 hover:bg-(--admin-positive)/10 min-h-[30px] shrink-0 rounded-lg px-2.5 py-1 text-[10px] flex items-center justify-center gap-1"
                              title="Sugerir melhorias e alternativas para este trecho"
                            >
                              {loadingSuggestionIndex === item.index ? (
                                <Loader2 size={10} className="animate-spin text-(--admin-positive)" />
                              ) : (
                                <WandSparkles size={10} />
                              )}
                              {loadingSuggestionIndex === item.index ? "Gerando..." : "Melhorar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {totalMatches > previews.length ? (
                    <p className="px-1 text-[11px] text-(--muted-2)">
                      Mostrando {previews.length} de {totalMatches} ocorrências.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-(--border) bg-(--surface-muted) px-4 py-8 text-center text-sm text-(--muted)">
                  Busque uma palavra ou frase para marcar todas as ocorrências no artigo.
                </div>
              )}
            </div>
          </div>

          <div className="admin-scrollbar min-h-0 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface-muted) p-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-(--muted)">
                  <Link2 size={14} />
                  Aplicar Link
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase text-(--muted-2)">Tipo</label>
                  <select
                    value={effectiveLinkType}
                    disabled={amazonDetected}
                    onChange={(event) => setLinkType(event.target.value as LinkType)}
                    className="admin-select mt-2 min-h-[40px] rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="external">Externo</option>
                    <option value="internal">Interno</option>
                    <option value="affiliate">Afiliado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase text-(--muted-2)">URL</label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder={internalLinkMode ? "/silo/slug" : "https://..."}
                    className="admin-input mt-2 min-h-[40px] rounded-xl px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-(--muted-2)">
                    Para link interno, use a rota da página. Exemplo: <span className="font-semibold">/melhores-produtos-para-site-oleosa-e-com-acne/serum-para-acne</span>
                  </p>
                </div>

                <label className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${internalLinkMode ? "border-(--border) bg-[rgba(255,255,255,0.64)] text-(--muted-2)" : "border-(--border) bg-(--surface) text-(--text)"}`}>
                  <span>Abrir em nova aba</span>
                  <input
                    type="checkbox"
                    checked={effectiveOpenInNewTab}
                    disabled={relationshipLocked}
                    onChange={(event) => setOpenInNewTab(event.target.checked)}
                  />
                </label>

                <label className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${internalLinkMode ? "border-(--border) bg-[rgba(255,255,255,0.64)] text-(--muted-2)" : "border-(--border) bg-(--surface) text-(--text)"}`}>
                  <span>Nofollow</span>
                  <input
                    type="checkbox"
                    checked={effectiveNofollow}
                    disabled={relationshipLocked}
                    onChange={(event) => setNofollow(event.target.checked)}
                  />
                </label>

                <label className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${internalLinkMode ? "border-(--border) bg-[rgba(255,255,255,0.64)] text-(--muted-2)" : "border-(--border) bg-(--surface) text-(--text)"}`}>
                  <span>Sponsored</span>
                  <input
                    type="checkbox"
                    checked={effectiveSponsored}
                    disabled={relationshipLocked}
                    onChange={(event) => setSponsored(event.target.checked)}
                  />
                </label>

                {amazonDetected ? (
                  <div className="rounded-lg border border-(--admin-amazon) bg-(--admin-amazon-soft) px-3 py-2 text-[11px] text-(--admin-amazon)">
                    URL Amazon detectada: o link será tratado como afiliado, com `sponsored`, `nofollow` e nova aba.
                  </div>
                ) : null}
              </section>

              <section className="space-y-2 rounded-xl border border-(--border) bg-(--surface) p-3">
                <div className="text-[11px] font-semibold uppercase text-(--muted-2)">Ações rápidas</div>
                <button
                  type="button"
                  onClick={() => activeIndex >= 0 && applyToIndexes([activeIndex], "Aplicado no resultado ativo")}
                  disabled={activeIndex < 0}
                  className="admin-button-primary flex w-full justify-center rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                >
                  Aplicar no ativo
                </button>
                <button
                  type="button"
                  onClick={() => applyToIndexes(selectedIndexes, "Aplicado nos marcados")}
                  disabled={!selectedCount}
                  className="admin-button-soft flex w-full justify-center rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                >
                  Aplicar nos marcados
                </button>
                <button
                  type="button"
                  onClick={() => applyToIndexes(findState.ranges.map((_, index) => index), "Aplicado em todos")}
                  disabled={!totalMatches}
                  className="admin-button-soft flex w-full justify-center rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                >
                  Aplicar em todos
                </button>
              </section>

              <section className="rounded-xl border border-(--border) bg-(--surface-muted) p-3 text-[11px] text-(--muted)">
                <p className="font-semibold uppercase text-(--muted-2)">Como usar</p>
                <p className="mt-2">1. Busque o termo no artigo.</p>
                <p>2. Confira os trechos marcados.</p>
                <p>3. Informe a URL e aplique no ativo, nos marcados ou em todos.</p>
                <p>4. Para escolher um destino interno com mais detalhe, use Super Link no ativo.</p>
              </section>

              {feedback ? (
                <div className="rounded-xl border border-[rgba(34,71,73,0.14)] bg-[rgba(34,71,73,0.08)] px-3 py-2 text-sm text-(--brand-hot)">
                  {feedback}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
