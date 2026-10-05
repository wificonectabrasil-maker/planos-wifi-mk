"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorContext } from "@/components/editor/EditorContext";

type TermStatus = "not_used" | "consider_using_more" | "in_suggested_range" | "slightly_above_range" | "consider_using_less";

type EntitySuggestion = {
  term: string;
  reason: string;
  confidence: number;
  suggestedLinkType: "about" | "mention";
  aboutUrl: string | null;
  mentionPost: { id: string; title: string; url: string } | null;
};

type SemanticDiagnostics = {
  semantic?: {
    lsiCoverageScore?: number;
    missingRelatedTerms?: string[];
    repeatedTerms?: Array<{ term: string; count: number }>;
    topSemanticTerms?: string[];
  };
  structure?: {
    coverageScore?: number;
    missingSections?: string[];
  };
  warnings?: string[];
};

type SemanticKeywordSuggestion = {
  sourceKeyword: string;
  phrase: string;
  relation: "synonym" | "relation" | "bridge" | "question";
  reason: string;
};

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function splitKeywordInput(value: string) {
  return value
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function getKeywordVariants(keyword: string) {
  const normalized = normalize(keyword);
  const dictionary: Array<[string, string[]]> = [
    ["seo tecnico", ["rastreamento e indexacao", "arquitetura tecnica", "saude tecnica do site"]],
    ["seo local", ["presenca regional", "buscas por cidade", "sinais locais de confianca"]],
    ["google business profile", ["perfil comercial no Google", "mapas e avaliacoes", "categorias e NAP"]],
    ["core web vitals", ["experiencia real do usuario", "metricas de performance", "LCP INP e CLS"]],
    ["performance", ["velocidade percebida", "otimizacao de carregamento", "renderizacao eficiente"]],
    ["schema", ["dados estruturados", "entidades semanticas", "marcacao Schema.org"]],
    ["indexacao", ["paginas descobertas pelo Google", "controle de rastreamento", "canonicals e sitemap"]],
    ["auditoria", ["diagnostico tecnico", "priorizacao de correcoes", "plano de acao SEO"]],
    ["conteudo programatico", ["paginas escalaveis", "templates orientados por dados", "controle de qualidade editorial"]],
    ["automacao", ["workflow operacional", "rotina automatizada", "processo repetivel com IA"]],
  ];

  const found = dictionary.find(([key]) => normalized.includes(key));
  if (found) return found[1];
  return [`contexto de ${keyword}`, `relacao com ${keyword}`, `beneficio ligado a ${keyword}`];
}

function findContextSnippet(docText: string, keyword: string) {
  const sentences = docText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const tokens = normalize(keyword).split(/\s+/).filter((token) => token.length > 3);
  const direct = sentences.find((sentence) => tokens.some((token) => normalize(sentence).includes(token)));
  const fallback = direct || sentences.find((sentence) => sentence.length > 60) || "";
  return fallback.length > 120 ? `${fallback.slice(0, 117).trim()}...` : fallback;
}

function buildSemanticKeywordSuggestions(keywords: string[], docText: string): SemanticKeywordSuggestion[] {
  return keywords.flatMap((keyword) => {
    const variants = getKeywordVariants(keyword);
    const context = findContextSnippet(docText, keyword);
    const contextReason = context
      ? `Ajustado ao trecho: "${context}"`
      : "Use quando o paragrafo tocar no mesmo tema sem repetir a palavra-chave de forma dura.";

    return [
      {
        sourceKeyword: keyword,
        phrase: variants[0],
        relation: "synonym" as const,
        reason: "Variacao natural para evitar repeticao e manter leitura fluida.",
      },
      {
        sourceKeyword: keyword,
        phrase: variants[1] ?? `relacao com ${keyword}`,
        relation: "relation" as const,
        reason: "Termo relacionado que amplia o campo semantico do artigo.",
      },
      {
        sourceKeyword: keyword,
        phrase: `isso se conecta com ${variants[2] ?? keyword}`,
        relation: "bridge" as const,
        reason: contextReason,
      },
    ];
  });
}

function parseTerm(raw: string): { term: string; min: number; max: number } | null {
  const parts = raw.split("|").map((part) => part.trim());
  if (parts.length === 1) return { term: parts[0], min: 1, max: 5 };
  if (parts.length === 3) {
    const term = parts[0];
    const min = Number.parseInt(parts[1], 10);
    const max = Number.parseInt(parts[2], 10);
    if (term && Number.isFinite(min) && Number.isFinite(max)) return { term, min, max };
  }
  if (parts.length === 2 && parts[1].includes("-")) {
    const term = parts[0];
    const [minStr, maxStr] = parts[1].split("-").map((part) => part.trim());
    const min = Number.parseInt(minStr, 10);
    const max = Number.parseInt(maxStr, 10);
    if (term && Number.isFinite(min) && Number.isFinite(max)) return { term, min, max };
  }
  return null;
}

function countOccurrences(text: string, term: string) {
  if (!term) return 0;
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return 0;
  return normalizedText.split(normalizedTerm).length - 1;
}

function getTermStatus(count: number, min: number, max: number): TermStatus {
  if (count === 0) return "not_used";
  if (count < min) return "consider_using_more";
  if (count >= min && count <= max) return "in_suggested_range";
  if (count > max && count <= max * 1.2) return "slightly_above_range";
  return "consider_using_less";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function findFirstUnlinkedTermRange(editor: Editor, term: string) {
  const needle = term.trim().toLowerCase();
  if (!needle) return null;

  let found: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (!node.isText || !node.text) return true;
    if (node.marks.some((mark) => mark.type.name === "link")) return true;
    const index = node.text.toLowerCase().indexOf(needle);
    if (index >= 0) {
      found = { from: pos + index, to: pos + index + term.length };
    }
    return true;
  });
  return found;
}

export function TermsPanel() {
  const { docText, meta, editor, setMeta, postId } = useEditorContext();
  const [filter, setFilter] = useState<TermStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [authorityQuery, setAuthorityQuery] = useState("");
  const [semanticKeywords, setSemanticKeywords] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<EntitySuggestion[]>([]);
  const [aiDiagnostics, setAiDiagnostics] = useState<SemanticDiagnostics | null>(null);

  const termsData = useMemo(() => {
    const parsed: Array<{ term: string; min: number; max: number; count: number; status: TermStatus }> = [];

    for (const raw of meta.supportingKeywords) {
      const result = parseTerm(raw);
      if (!result) continue;
      const count = countOccurrences(docText, result.term);
      parsed.push({ ...result, count, status: getTermStatus(count, result.min, result.max) });
    }

    for (const entity of meta.entities) {
      if (parsed.some((entry) => normalize(entry.term) === normalize(entity))) continue;
      const count = countOccurrences(docText, entity);
      parsed.push({ term: entity, min: 1, max: 5, count, status: getTermStatus(count, 1, 5) });
    }

    return parsed;
  }, [docText, meta.entities, meta.supportingKeywords]);

  const filteredTerms = useMemo(
    () =>
      termsData.filter((entry) => {
        const matchesFilter = filter === "all" || entry.status === filter;
        const matchesSearch = !search || normalize(entry.term).includes(normalize(search));
        return matchesFilter && matchesSearch;
      }),
    [filter, search, termsData]
  );

  const semanticKeywordSuggestions = useMemo(
    () => buildSemanticKeywordSuggestions(splitKeywordInput(semanticKeywords), docText),
    [docText, semanticKeywords]
  );

  const handleCopyList = () => {
    const csv = `term,count,min,max,status\n${termsData
      .map((item) => `${item.term},${item.count},${item.min},${item.max},${item.status}`)
      .join("\n")}`;
    navigator.clipboard.writeText(csv);
  };

  const handleInsertTerm = (term: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`${term} `).run();
  };

  const addLocalEntity = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    if (meta.entities.some((item) => normalize(item) === normalize(clean))) return;
    setMeta({ entities: [...meta.entities, clean] });
  };

  const localEntityIdeas = useMemo(() => {
    const base = localAddress.trim();
    if (!base) return [];
    return [
      `hospitais e clinicas proximas de ${base}`,
      `farmacias de referencia em ${base}`,
      `pracas e pontos de referencia em ${base}`,
      `escolas e instituicoes em ${base}`,
      `restaurantes e comercios locais em ${base}`,
    ];
  }, [localAddress]);

  const authorityIdeas = useMemo(() => {
    const topic = authorityQuery.trim() || meta.targetKeyword || meta.title;
    if (!topic.trim()) return [];
    return [
      `Wikipedia: ${topic}`,
      `gov.br: ${topic}`,
      `Ministério da Saúde: ${topic}`,
      `Sociedade Brasileira de Dermatologia: ${topic}`,
    ];
  }, [authorityQuery, meta.targetKeyword, meta.title]);

  const addEntityToMeta = (term: string) => {
    if (meta.entities.some((item) => normalize(item) === normalize(term))) return;
    setMeta({ entities: [...meta.entities, term] });
  };

  const applySemanticLink = (suggestion: EntitySuggestion, mode: "about" | "mention") => {
    if (!editor) return;
    const href = mode === "about" ? suggestion.aboutUrl : suggestion.mentionPost?.url;
    if (!href) return;

    const attrs = {
      href,
      target: mode === "about" ? "_blank" : null,
      rel: mode === "about" ? "about noopener noreferrer" : "mention",
      "data-link-type": mode,
      "data-post-id": mode === "mention" ? suggestion.mentionPost?.id ?? null : null,
      "data-entity-type": mode,
      "data-entity": mode,
    };

    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().setLink(attrs).run();
      return;
    }

    const range = findFirstUnlinkedTermRange(editor, suggestion.term);
    if (range) {
      editor.chain().focus().setTextSelection(range).setLink(attrs).run();
      return;
    }

    const html = `<a href="${escapeAttr(attrs.href)}"${
      attrs.target ? ` target="${attrs.target}"` : ""
    }${attrs.rel ? ` rel="${escapeAttr(attrs.rel)}"` : ""} data-link-type="${attrs["data-link-type"]}"${
      attrs["data-post-id"] ? ` data-post-id="${attrs["data-post-id"]}"` : ""
    } data-entity-type="${attrs["data-entity-type"]}" data-entity="${attrs["data-entity"]}">${escapeHtml(
      suggestion.term
    )}</a> `;
    editor.chain().focus().insertContent(html).run();
  };

  const runAISuggestions = async () => {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text || text.split(/\s+/).filter(Boolean).length < 80) {
      setAiError("Escreva pelo menos 80 palavras para gerar sugestões.");
      setAiSuggestions([]);
      setAiDiagnostics(null);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/admin/entity-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meta.title,
          keyword: meta.targetKeyword,
          postId,
          text,
          existingEntities: meta.entities,
          supportingKeywords: meta.supportingKeywords,
          maxSuggestions: 8,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setAiError(json?.message || json?.error || "Falha ao gerar sugestões.");
        setAiSuggestions([]);
        setAiDiagnostics(null);
        return;
      }

      const suggestions = Array.isArray(json?.suggestions) ? (json.suggestions as EntitySuggestion[]) : [];
      setAiSuggestions(suggestions);
      setAiDiagnostics((json?.diagnostics as SemanticDiagnostics) ?? null);
    } catch (error: any) {
      setAiError(error?.message || "Falha ao gerar sugestões.");
      setAiSuggestions([]);
      setAiDiagnostics(null);
    } finally {
      setAiLoading(false);
    }
  };

  const statusMeta: Record<
    TermStatus,
    { cardClass: string; badgeClass: string; label: string; filterActiveClass: string }
  > = {
    not_used: {
      cardClass: "border-[color:var(--admin-danger)] bg-(--surface)",
      badgeClass: "border-[color:var(--admin-danger)] bg-(--surface-muted) text-(--admin-danger)",
      label: "Não usado",
      filterActiveClass: "border-[color:var(--admin-danger)] bg-(--surface) text-(--admin-danger)",
    },
    consider_using_more: {
      cardClass: "border-[color:var(--admin-warning)] bg-(--surface)",
      badgeClass: "border-[color:var(--admin-warning)] bg-(--surface-muted) text-(--admin-warning)",
      label: "Usar mais",
      filterActiveClass: "border-[color:var(--admin-warning)] bg-(--surface) text-(--admin-warning)",
    },
    in_suggested_range: {
      cardClass: "border-[color:var(--admin-positive)] bg-(--surface)",
      badgeClass: "border-[color:var(--admin-positive)] bg-(--surface-muted) text-(--admin-positive)",
      label: "Na faixa",
      filterActiveClass: "border-[color:var(--admin-positive)] bg-(--surface) text-(--admin-positive)",
    },
    slightly_above_range: {
      cardClass: "border-[color:var(--admin-warning)] bg-(--surface)",
      badgeClass: "border-[color:var(--admin-warning)] bg-(--surface-muted) text-(--admin-warning)",
      label: "Acima",
      filterActiveClass: "border-[color:var(--admin-warning)] bg-(--surface) text-(--admin-warning)",
    },
    consider_using_less: {
      cardClass: "border-[color:var(--admin-danger)] bg-(--surface)",
      badgeClass: "border-[color:var(--admin-danger)] bg-(--surface-muted) text-(--admin-danger)",
      label: "Usar menos",
      filterActiveClass: "border-[color:var(--admin-danger)] bg-(--surface) text-(--admin-danger)",
    },
  };
  const neutralFilterClass = "border-(--border) bg-(--surface) text-(--muted)";

  return (
    <section className="admin-subpane space-y-2.5 p-2">
      <div className="flex items-center justify-between text-sm font-semibold uppercase text-(--text)">
        <span className="inline-flex items-center gap-2">
          <span>Termos / LSI</span>
          <span className="admin-ai-badge">IA</span>
        </span>
        <button
          onClick={handleCopyList}
          className="rounded-md border border-(--border) bg-(--surface) px-3 py-1.5 text-xs font-semibold text-(--brand-hot) transition-colors hover:border-(--brand-hot)"
        >
          Copy
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={runAISuggestions}
          disabled={aiLoading}
          className="admin-ai-control w-full px-3 py-2 text-[11px] font-semibold disabled:opacity-50"
        >
          {aiLoading ? "IA analisando entidades..." : "IA: sugerir entidades e links"}
        </button>

        <div className="admin-ai-surface rounded-md border border-(--border) bg-(--surface) p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase text-(--muted)">Palavras-chave semanticas</p>
            <span className="text-[9px] text-(--muted-2)">sinonimos e relacoes</span>
          </div>
          <textarea
            value={semanticKeywords}
            onChange={(event) => setSemanticKeywords(event.target.value)}
            placeholder="Ex: SEO local, Core Web Vitals, dados estruturados"
            rows={2}
            className="admin-textarea mt-2 min-h-[58px] py-1.5 text-[11px]"
          />
          {semanticKeywordSuggestions.length > 0 ? (
            <div className="mt-2 max-h-[190px] space-y-1.5 overflow-y-auto pr-1">
              {semanticKeywordSuggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.sourceKeyword}-${suggestion.phrase}-${index}`}
                  className="rounded border border-(--border) bg-(--surface-muted) p-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-(--text)">{suggestion.phrase}</div>
                      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-(--brand-hot)">
                        {suggestion.relation} de {suggestion.sourceKeyword}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInsertTerm(suggestion.phrase)}
                      className="shrink-0 rounded border border-(--brand-hot) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--brand-hot) hover:bg-[rgba(64,209,219,0.1)]"
                    >
                      Inserir
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-(--muted)">{suggestion.reason}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-(--border) bg-(--surface) p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase text-(--muted)">SEO local</p>
            <span className="text-[9px] text-(--muted-2)">endereco ou regiao</span>
          </div>
          <input
            value={localAddress}
            onChange={(event) => setLocalAddress(event.target.value)}
            placeholder="Ex: Av. Paulista, Sao Paulo"
            className="admin-input mt-2 min-h-[34px] py-1.5 text-[11px]"
          />
          {localEntityIdeas.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {localEntityIdeas.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => addLocalEntity(item)}
                  className="rounded border border-(--border) bg-(--surface-muted) px-2 py-1 text-[9px] font-semibold text-(--muted) hover:border-(--brand-hot) hover:text-(--brand-hot)"
                >
                  + {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-(--border) bg-(--surface) p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase text-(--muted)">Fontes de autoridade</p>
            <span className="text-[9px] text-(--muted-2)">topicos serios</span>
          </div>
          <input
            value={authorityQuery}
            onChange={(event) => setAuthorityQuery(event.target.value)}
            placeholder="Tema para Wikipedia, gov.br ou entidade tecnica"
            className="admin-input mt-2 min-h-[34px] py-1.5 text-[11px]"
          />
          {authorityIdeas.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {authorityIdeas.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => addLocalEntity(item)}
                  className="rounded border border-(--border) bg-(--surface-muted) px-2 py-1 text-[9px] font-semibold text-(--muted) hover:border-(--brand-hot) hover:text-(--brand-hot)"
                >
                  + {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {aiError ? <div className="rounded-xl border border-[color:var(--admin-danger)] bg-(--surface) p-2.5 text-[11px] text-(--admin-danger)">{aiError}</div> : null}

      {aiDiagnostics ? (
        <div className="admin-ai-surface space-y-1 rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
          <div className="font-semibold uppercase text-(--text)">Diagnóstico LSI/PNL</div>
          <div>
            Cobertura LSI: <span className="font-semibold text-(--text)">{Math.round(aiDiagnostics.semantic?.lsiCoverageScore ?? 0)}%</span>
          </div>
          <div>
            Estrutura PNL: <span className="font-semibold text-(--text)">{Math.round(aiDiagnostics.structure?.coverageScore ?? 0)}%</span>
          </div>
          {(aiDiagnostics.semantic?.missingRelatedTerms?.length ?? 0) > 0 ? (
            <div className="line-clamp-2">
              Falta cobrir: {aiDiagnostics.semantic?.missingRelatedTerms?.slice(0, 4).join(", ")}
            </div>
          ) : null}
          {(aiDiagnostics.warnings?.length ?? 0) > 0 ? (
            <div className="text-(--admin-warning)">{aiDiagnostics.warnings?.slice(0, 2).join(" ")}</div>
          ) : null}
        </div>
      ) : null}

      {aiSuggestions.length > 0 ? (
        <div className="admin-ai-surface space-y-2 rounded border border-(--border) bg-(--surface) p-2">
          <div className="text-[11px] font-semibold uppercase text-(--muted)">Sugestões de entidades</div>
          {aiSuggestions.map((suggestion, index) => (
            <div key={`${suggestion.term}-${index}`} className="rounded border border-(--border) bg-(--surface-muted) p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[12px] font-semibold text-(--text)">{suggestion.term}</div>
                <span className="rounded bg-(--surface) px-2 py-0.5 text-[10px] font-semibold text-(--muted)">
                  {(suggestion.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-(--muted)">{suggestion.reason}</p>

              {suggestion.mentionPost ? (
                 <p className="mt-1 truncate text-[10px] text-(--brand-hot)">Mention sugerido: {suggestion.mentionPost.title}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addEntityToMeta(suggestion.term)}
                  className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--text)"
                >
                  + Entidade
                </button>

                {suggestion.aboutUrl ? (
                  <button
                    type="button"
                    onClick={() => applySemanticLink(suggestion, "about")}
                    className="rounded border border-(--brand-accent) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--brand-accent)"
                  >
                    Link About
                  </button>
                ) : null}

                {suggestion.mentionPost ? (
                  <button
                    type="button"
                    onClick={() => applySemanticLink(suggestion, "mention")}
                    className="rounded border border-(--brand-hot) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--brand-hot)"
                  >
                    Link Mention
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar termo..."
          className="admin-input min-h-[36px] py-1.5 text-[11px]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            filter === "all" ? "border-(--brand-hot) bg-(--surface) text-(--brand-hot)" : neutralFilterClass
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter("not_used")}
          className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            filter === "not_used" ? statusMeta.not_used.filterActiveClass : neutralFilterClass
          }`}
        >
          Não usado
        </button>
        <button
          onClick={() => setFilter("consider_using_more")}
          className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            filter === "consider_using_more" ? statusMeta.consider_using_more.filterActiveClass : neutralFilterClass
          }`}
        >
          Usar mais
        </button>
        <button
          onClick={() => setFilter("in_suggested_range")}
          className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            filter === "in_suggested_range" ? statusMeta.in_suggested_range.filterActiveClass : neutralFilterClass
          }`}
        >
          Na faixa
        </button>
        <button
          onClick={() => setFilter("slightly_above_range")}
          className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            filter === "slightly_above_range" ? statusMeta.slightly_above_range.filterActiveClass : neutralFilterClass
          }`}
        >
          Acima
        </button>
        <button
          onClick={() => setFilter("consider_using_less")}
          className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            filter === "consider_using_less" ? statusMeta.consider_using_less.filterActiveClass : neutralFilterClass
          }`}
        >
          Usar menos
        </button>
      </div>

      <div className="rounded border border-(--border-strong) bg-(--surface) p-2 text-xs text-(--text)">
        Termos (formato:{" "}
        <code className="rounded border border-(--border-strong) !bg-(--surface-muted) px-1 py-0.5 text-[10px] font-semibold !text-(--text)">
          termo|min|max
        </code>{" "}
        ou{" "}
        <code className="rounded border border-(--border-strong) !bg-(--surface-muted) px-1 py-0.5 text-[10px] font-semibold !text-(--text)">
          termo|min-max
        </code>
        )
      </div>

      <div className="max-h-[340px] space-y-1.5 overflow-y-auto">
        {filteredTerms.length === 0 ? (
          <p className="py-4 text-center text-sm text-(--muted-2)">{search ? "Nenhum termo encontrado na busca." : "Nenhum termo definido."}</p>
        ) : null}

        {filteredTerms.map((termData, index) => (
          <div
            key={`${termData.term}-${index}`}
            className={`flex items-center justify-between gap-2 rounded-lg border-l-4 border-r border-t border-b px-2.5 py-2 shadow-sm ${statusMeta[termData.status].cardClass}`}
          >
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="truncate text-[13px] font-semibold text-(--text)">{termData.term}</div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${statusMeta[termData.status].badgeClass}`}>
                  {statusMeta[termData.status].label}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-(--muted)">
                <span className="font-mono text-(--text)">{termData.count}x</span> na página • faixa {termData.min}-{termData.max}
              </div>
            </div>
            <button
              onClick={() => handleInsertTerm(termData.term)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-(--border) bg-(--surface-muted) text-lg font-bold text-(--brand-hot) transition-colors hover:border-[rgba(64,209,219,0.52)]"
              title="Inserir termo no cursor"
            >
              +
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
