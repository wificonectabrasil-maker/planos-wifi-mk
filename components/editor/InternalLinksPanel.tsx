"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Link2, RefreshCcw, Search, Sparkles } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import type { Editor } from "@tiptap/react";

type LinkSuggestion = {
  candidateId: string;
  postId: string;
  title: string;
  url: string;
  slug: string;
  anchorBucket: "START" | "MID" | "END";
  role: "PILLAR" | "SUPPORT" | "AUX" | null;
  position: number | null;
  score: number;
  semanticScore: number;
  hierarchyScore: number;
  anchorText: string;
  reason: string;
  suggestedAnchorModification?: string;
  linkingPrinciple?: string;
  semanticBridge?: string;
  sourceGuidance?: string;
  supportSources?: string[];
  source: "ai" | "heuristic";
  expectedByPlan?: boolean;
  alreadyLinked: boolean;
};

type AutoPlanItem = {
  suggestion: LinkSuggestion;
  status: "pending" | "applied" | "skipped";
  note: string;
};

type LinkSuggestionDiagnostics = {
  semantic?: {
    lsiCoverageScore?: number;
    missingRelatedTerms?: string[];
  };
  structure?: {
    coverageScore?: number;
    missingSections?: string[];
  };
  warnings?: string[];
};

type PlanLinkDiagnostics = {
  expectedTotal: number;
  present: Array<{ targetSlug: string; anchor: string }>;
  missing: Array<{ targetSlug: string; anchor: string }>;
  duplicateTargetSlugs: string[];
  outsideSilo: Array<{ targetSlug: string; targetSiloSlug: string }>;
  coverageScore: number;
} | null;

function roleBadge(role: LinkSuggestion["role"]) {
  if (role === "PILLAR") return "border border-[color:var(--admin-warning)] bg-(--surface-muted) text-(--admin-warning)";
  if (role === "SUPPORT") return "border border-[color:var(--admin-positive)] bg-(--surface-muted) text-(--admin-positive)";
  if (role === "AUX") return "border border-[color:var(--border-strong)] bg-(--surface-muted) text-(--text)";
  return "border border-(--border) bg-(--surface-muted) text-(--muted)";
}

function roleLabel(role: LinkSuggestion["role"], position: number | null) {
  if (role === "PILLAR") return "Pilar #1";
  if (role === "SUPPORT") return typeof position === "number" ? `Suporte #${position}` : "Suporte";
  if (role === "AUX") return typeof position === "number" ? `Aux #${position}` : "Aux";
  return "Sem papel";
}

function scoreTone(score: number) {
  if (score >= 75) return "text-(--admin-positive)";
  if (score >= 55) return "text-(--admin-warning)";
  return "text-(--admin-danger)";
}

function bucketLabel(bucket: LinkSuggestion["anchorBucket"]) {
  if (bucket === "START") return "Topo";
  if (bucket === "MID") return "Meio";
  return "Final";
}

function normalizeComparable(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findUnlinkedTermRanges(editor: Editor, term: string) {
  const needle = normalizeComparable(term.trim());
  if (!needle) return [];

  const ranges: Array<{ from: number; to: number }> = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    if (node.marks.some((mark) => mark.type.name === "link")) return true;

    const text = String(node.text ?? "");
    const haystack = normalizeComparable(text);
    if (!haystack) return true;

    let cursor = 0;
    while (cursor < haystack.length) {
      const index = haystack.indexOf(needle, cursor);
      if (index < 0) break;
      ranges.push({ from: pos + index, to: pos + index + needle.length });
      cursor = index + Math.max(needle.length, 1);
    }
    return true;
  });

  return ranges;
}

function findFirstUnlinkedTermRange(editor: Editor, term: string) {
  const ranges = findUnlinkedTermRanges(editor, term);
  return ranges[0] ?? null;
}

function isSelectionCompatibleWithAnchor(editor: Editor, anchor: string) {
  const { from, to } = editor.state.selection;
  if (from === to) return false;
  const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
  const normalizedSelection = normalizeComparable(selectedText);
  const normalizedAnchor = normalizeComparable(anchor);
  if (!normalizedSelection || !normalizedAnchor) return false;
  if (normalizedSelection === normalizedAnchor) return true;
  if (normalizedSelection.includes(normalizedAnchor)) return true;
  if (normalizedAnchor.includes(normalizedSelection) && normalizedSelection.split(" ").length >= 2) return true;
  return false;
}

export function InternalLinksPanel() {
  const { docText, editor, meta, postId, links } = useEditorContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [search, setSearch] = useState("");
  const [autoPlan, setAutoPlan] = useState<AutoPlanItem[] | null>(null);
  const [autoApplying, setAutoApplying] = useState(false);
  const [autoSummary, setAutoSummary] = useState<{ applied: number; skipped: number } | null>(null);
  const [diagnostics, setDiagnostics] = useState<LinkSuggestionDiagnostics | null>(null);
  const [planLinks, setPlanLinks] = useState<PlanLinkDiagnostics>(null);
  const [pendingApplyCandidateId, setPendingApplyCandidateId] = useState<string | null>(null);
  const [previewCursorByCandidate, setPreviewCursorByCandidate] = useState<Record<string, number>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) =>
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suggestions;
    return suggestions.filter((item) => item.title.toLowerCase().includes(term) || item.anchorText.toLowerCase().includes(term));
  }, [search, suggestions]);

  const occurrenceCountByCandidate = useMemo(() => {
    if (!editor) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    suggestions.forEach((suggestion) => {
      map[suggestion.candidateId] = findUnlinkedTermRanges(editor, suggestion.anchorText).length;
    });
    return map;
  }, [editor, suggestions]);

  const runSuggestions = async () => {
    if (!editor) return;
    if (!meta.siloId) {
      setError("Defina um silo no post para gerar links internos hierárquicos.");
      setSuggestions([]);
      setPlanLinks(null);
      return;
    }

    const text = editor.getText().trim() || docText.trim();
    if (!text || text.split(/\s+/).filter(Boolean).length < 80) {
      setError("Escreva pelo menos 80 palavras para gerar sugestões.");
      setSuggestions([]);
      setPlanLinks(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/internal-link-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          siloId: meta.siloId,
          title: meta.title,
          keyword: meta.targetKeyword,
          text,
          existingLinks: links.map((link) => ({
            href: link.href,
            text: link.text,
            dataPostId: link.dataPostId ?? null,
            type: link.type,
          })),
          maxSuggestions: 20,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.message || json?.error || "Falha ao gerar links internos.");
        setSuggestions([]);
        setSource("");
        setAutoPlan(null);
        setAutoSummary(null);
        setDiagnostics(null);
        setPlanLinks(null);
        setPendingApplyCandidateId(null);
        setPreviewCursorByCandidate({});
        return;
      }

      const rawSuggestions = Array.isArray(json?.suggestions) ? (json.suggestions as Partial<LinkSuggestion>[]) : [];
      const nextSuggestions: LinkSuggestion[] = rawSuggestions
        .filter((item): item is Partial<LinkSuggestion> & { postId: string; title: string; url: string; slug: string; anchorText: string } =>
          Boolean(item && item.postId && item.title && item.url && item.slug && item.anchorText)
        )
        .map((item, index) => ({
          candidateId: item.candidateId || `${item.postId}::${item.anchorText.toLowerCase()}::${index}`,
          postId: item.postId,
          title: item.title,
          url: item.url,
          slug: item.slug,
          anchorBucket: item.anchorBucket ?? "MID",
          role: item.role ?? null,
          position: typeof item.position === "number" ? item.position : null,
          score: typeof item.score === "number" ? item.score : 0,
          semanticScore: typeof item.semanticScore === "number" ? item.semanticScore : 0,
          hierarchyScore: typeof item.hierarchyScore === "number" ? item.hierarchyScore : 0,
          anchorText: item.anchorText,
          reason: typeof item.reason === "string" ? item.reason : "",
          suggestedAnchorModification:
            typeof item.suggestedAnchorModification === "string" ? item.suggestedAnchorModification : undefined,
          linkingPrinciple: typeof item.linkingPrinciple === "string" ? item.linkingPrinciple : undefined,
          semanticBridge: typeof item.semanticBridge === "string" ? item.semanticBridge : undefined,
          sourceGuidance: typeof item.sourceGuidance === "string" ? item.sourceGuidance : undefined,
          supportSources: Array.isArray(item.supportSources) ? item.supportSources.filter((source): source is string => typeof source === "string") : undefined,
          source: (item.source === "ai" ? "ai" : "heuristic") as "ai" | "heuristic",
          expectedByPlan: Boolean(item.expectedByPlan),
          alreadyLinked: Boolean(item.alreadyLinked),
        }))
        .filter((item) => !item.alreadyLinked && item.score >= 4);
      setSuggestions(nextSuggestions);
      setSource(String(json?.source || ""));
      setDiagnostics((json?.diagnostics as LinkSuggestionDiagnostics) ?? null);
      setPlanLinks((json?.planLinks as PlanLinkDiagnostics) ?? null);
      if (nextSuggestions.length === 0 && json?.message) {
        setError(String(json.message));
      }
      setAutoPlan(null);
      setAutoSummary(null);
      setPendingApplyCandidateId(null);
      setPreviewCursorByCandidate({});
    } catch (requestError: any) {
      setError(requestError?.message || "Falha ao gerar links internos.");
      setSuggestions([]);
      setSource("");
      setAutoPlan(null);
      setAutoSummary(null);
      setDiagnostics(null);
      setPlanLinks(null);
      setPendingApplyCandidateId(null);
      setPreviewCursorByCandidate({});
    } finally {
      setLoading(false);
    }
  };

  const previewSuggestionAnchor = (suggestion: LinkSuggestion) => {
    if (!editor) return;
    const ranges = findUnlinkedTermRanges(editor, suggestion.anchorText);
    if (!ranges.length) {
      setError("Não encontrei esta âncora em texto livre para revisar contexto.");
      return;
    }
    const cursor = previewCursorByCandidate[suggestion.candidateId] ?? 0;
    const targetIndex = ranges.length ? cursor % ranges.length : 0;
    const range = ranges[targetIndex];
    if (!range) return;

    editor.chain().focus().setTextSelection(range).scrollIntoView().run();
    setPendingApplyCandidateId(suggestion.candidateId);
    setPreviewCursorByCandidate((prev) => ({
      ...prev,
      [suggestion.candidateId]: targetIndex + 1,
    }));
    setError(null);
  };

  const applySuggestion = (suggestion: LinkSuggestion) => {
    if (!editor) return;
    setError(null);
    const attrs = {
      href: suggestion.url,
      target: null,
      rel: null,
      "data-link-type": "internal",
      "data-post-id": suggestion.postId,
    } as any;

    const anchor = suggestion.anchorText?.trim();
    if (!anchor) {
      setError("Sugestão sem âncora natural disponível para aplicação.");
      return;
    }

    const naturalRange = findFirstUnlinkedTermRange(editor, anchor);
    if (naturalRange) {
      const { from, to } = editor.state.selection;
      const sameRange = from === naturalRange.from && to === naturalRange.to;
      if (!sameRange || pendingApplyCandidateId !== suggestion.candidateId) {
        editor.chain().focus().setTextSelection(naturalRange).scrollIntoView().run();
        setPendingApplyCandidateId(suggestion.candidateId);
        setError("Contexto localizado. Revise a frase e clique novamente para confirmar o link.");
        return;
      }

      editor.chain().focus().setTextSelection(naturalRange).setLink(attrs).run();
      setPendingApplyCandidateId(null);
      return;
    }

    if (isSelectionCompatibleWithAnchor(editor, anchor)) {
      editor.chain().focus().setLink(attrs).run();
      setPendingApplyCandidateId(null);
      return;
    }

    setError(
      "Não encontrei ocorrência natural da âncora sugerida. Selecione exatamente essa âncora (ou trecho equivalente) e tente novamente."
    );
  };

  const buildAutoPlan = () => {
    const prioritized = suggestions
      .filter((item) => !item.alreadyLinked)
      .sort((a, b) => b.score - a.score);
    const uniqueTargets = new Set(prioritized.map((item) => item.postId)).size;
    const planLimit = Math.min(6, Math.max(3, uniqueTargets));

    if (!prioritized.length) {
      setAutoPlan([]);
      setAutoSummary(null);
      return;
    }

    const chosen: LinkSuggestion[] = [];
    const addIfUnique = (candidate?: LinkSuggestion) => {
      if (!candidate) return;
      if (chosen.some((item) => item.postId === candidate.postId)) return;
      chosen.push(candidate);
    };

    (["START", "MID", "END"] as LinkSuggestion["anchorBucket"][]).forEach((bucket) => {
      addIfUnique(prioritized.find((item) => item.anchorBucket === bucket));
    });
    prioritized.forEach((item) => {
      if (chosen.length >= planLimit) return;
      addIfUnique(item);
    });

    setAutoPlan(
      chosen.slice(0, planLimit).map((suggestion) => ({
        suggestion,
        status: "pending",
        note: "Aguardando confirmação",
      }))
    );
    setAutoSummary(null);
  };

  const applyAutoPlan = async () => {
    if (!editor || !autoPlan?.length) return;
    setAutoApplying(true);

    const attrsFor = (suggestion: LinkSuggestion) =>
      ({
        href: suggestion.url,
        target: null,
        rel: null,
        "data-link-type": "internal",
        "data-post-id": suggestion.postId,
      }) as any;

    let applied = 0;
    let skipped = 0;

    const next: AutoPlanItem[] = autoPlan.map((item) => {
      const suggestion = item.suggestion;
      const attrs = attrsFor(suggestion);
      const anchorCandidates = [suggestion.anchorText].filter(Boolean);

      let range: { from: number; to: number } | null = null;
      let anchorUsed = "";
      for (const candidate of anchorCandidates) {
        range = findFirstUnlinkedTermRange(editor, candidate);
        if (range) {
          anchorUsed = candidate;
          break;
        }
      }

      if (!range) {
        skipped += 1;
        return {
          ...item,
          status: "skipped",
          note: "Sem ocorrência natural para esta âncora",
        };
      }

      editor.chain().focus().setTextSelection(range).setLink(attrs).run();
      applied += 1;
      return {
        ...item,
        status: "applied",
        note: `Aplicado em: \"${anchorUsed}\"`,
      };
    });

    setAutoPlan(next);
    setAutoSummary({ applied, skipped });
    setPendingApplyCandidateId(null);
    setAutoApplying(false);
  };

  const cancelAutoPlan = () => {
    setAutoPlan(null);
    setAutoSummary(null);
    setPendingApplyCandidateId(null);
  };

  return (
    <section className="admin-subpane space-y-3 p-2.5">
      <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
        <span className="flex items-center gap-1.5">
          <Link2 size={14} />
          Links Internos IA
          <span className="admin-ai-badge">IA</span>
        </span>
        <span className="text-[10px] text-(--muted-2)">{suggestions.length} sugestões</span>
      </div>

      <button
        type="button"
        onClick={runSuggestions}
        disabled={loading}
        className="admin-ai-control flex w-full items-center justify-center gap-2 px-3 py-2 text-[11px] font-semibold disabled:opacity-50"
      >
        {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Gerando sugestões..." : "IA: sugerir links internos"}
      </button>

      {suggestions.length > 0 ? (
        <button
          type="button"
          onClick={buildAutoPlan}
          disabled={loading || autoApplying}
          className="admin-button-soft w-full px-3 py-2 text-[11px] disabled:opacity-50"
        >
          Modo automático (com confirmação)
        </button>
      ) : null}

      {source ? <p className="text-[10px] text-(--muted-2)">Fonte: {source}</p> : null}

      {planLinks ? (
        <div className="rounded-[12px] border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase text-(--text)">Plano KGR</span>
            <span className={planLinks.coverageScore >= 80 ? "text-(--admin-positive)" : "text-(--admin-warning)"}>
              {planLinks.present.length}/{planLinks.expectedTotal} links
            </span>
          </div>
          {planLinks.missing.length > 0 ? (
            <div className="mt-1 line-clamp-3">
              Faltando:{" "}
              {planLinks.missing
                .slice(0, 4)
                .map((item) => `${item.targetSlug} (${item.anchor})`)
                .join("; ")}
            </div>
          ) : (
            <div className="mt-1 text-(--admin-positive)">Links esperados cobertos.</div>
          )}
          {planLinks.duplicateTargetSlugs.length > 0 ? (
            <div className="mt-1 text-(--admin-warning)">
              Duplicados: {planLinks.duplicateTargetSlugs.slice(0, 3).join(", ")}
            </div>
          ) : null}
          {planLinks.outsideSilo.length > 0 ? (
            <div className="mt-1 text-(--admin-warning)">
              Fora do silo: {planLinks.outsideSilo.slice(0, 3).map((item) => item.targetSlug).join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}

      {diagnostics ? (
        <div className="admin-ai-surface rounded-[12px] border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
          <div className="font-semibold uppercase text-(--text)">Diagnóstico LSI/PNL</div>
          <div>
            Cobertura LSI:{" "}
            <span className="font-semibold text-(--text)">{Math.round(diagnostics.semantic?.lsiCoverageScore ?? 0)}%</span>
          </div>
          <div>
            Estrutura PNL:{" "}
            <span className="font-semibold text-(--text)">{Math.round(diagnostics.structure?.coverageScore ?? 0)}%</span>
          </div>
          {(diagnostics.semantic?.missingRelatedTerms?.length ?? 0) > 0 ? (
            <div className="line-clamp-2">
              Termos faltando no texto: {diagnostics.semantic?.missingRelatedTerms?.slice(0, 4).join(", ")}
            </div>
          ) : null}
          {(diagnostics.warnings?.length ?? 0) > 0 ? (
            <div className="text-(--admin-warning)">{diagnostics.warnings?.slice(0, 2).join(" ")}</div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-(--admin-danger) bg-(--surface) p-2.5 text-[11px] text-(--admin-danger)">{error}</div> : null}

      {autoPlan ? (
        <div className="space-y-2 rounded-[12px] border border-(--admin-warning) bg-(--surface) p-2.5">
          <div className="text-[11px] font-semibold uppercase text-(--admin-warning)">Prévia do plano automático</div>
          {autoPlan.length === 0 ? (
            <p className="text-[10px] text-(--admin-warning)">Não há candidatos novos para aplicar automaticamente.</p>
          ) : (
            autoPlan.map((item) => (
              <div key={item.suggestion.candidateId} className="rounded-[11px] border border-(--admin-warning) bg-(--surface-muted) p-2 text-[10px]">
                <div className="font-semibold text-(--text)">{item.suggestion.title}</div>
                <div className="text-(--muted)">Âncora: {item.suggestion.anchorText}</div>
                <div className="text-(--muted)">Posição: {bucketLabel(item.suggestion.anchorBucket)}</div>
                <div className="text-(--muted)">Status: {item.status}</div>
                <div className="text-(--muted-2)">{item.note}</div>
              </div>
            ))
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyAutoPlan}
              disabled={autoApplying || autoPlan.length === 0}
              className="admin-button-primary min-h-[32px] flex-1 px-2 py-1.5 text-[10px] disabled:opacity-50"
            >
              {autoApplying ? "Aplicando..." : "Confirmar aplicação"}
            </button>
            <button
              type="button"
              onClick={cancelAutoPlan}
              disabled={autoApplying}
              className="admin-button-soft min-h-[32px] flex-1 px-2 py-1.5 text-[10px] text-(--admin-warning) disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          {autoSummary ? (
            <div className="rounded-[11px] border border-(--admin-warning) bg-(--surface-muted) p-2 text-[10px] text-(--admin-warning)">
              Aplicados: {autoSummary.applied} | Pulados: {autoSummary.skipped}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-(--muted-2)" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filtrar sugestões..."
          className="admin-input min-h-[36px] py-1.5 pl-7 pr-2 text-[11px]"
        />
      </div>

      <div className="admin-scrollbar max-h-[320px] space-y-2 overflow-y-auto">
        {!loading && filtered.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-(--muted-2)">
            Gere sugestões para ver links priorizados por hierarquia e semântica.
          </p>
        ) : null}

        {filtered.map((suggestion) => (
          <div key={suggestion.candidateId} className="space-y-2 rounded-[12px] border border-(--border) bg-(--surface) p-2.5 shadow-[0_14px_24px_-28px_rgba(10,29,37,0.26)]">
            {(() => {
              const occurrenceCount = occurrenceCountByCandidate[suggestion.candidateId] ?? 0;
              const isOpen = !!expandedCards[suggestion.candidateId];
              return (
                <>
                  <button
                    type="button"
                    onClick={() => toggleCard(suggestion.candidateId)}
                    className="flex w-full items-start justify-between gap-2 text-left hover:opacity-90"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-semibold text-(--text)">{suggestion.title}</div>
                      <div className="truncate text-[9px] text-(--muted-2)">{suggestion.url}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-[11px] font-bold ${scoreTone(suggestion.score)}`}>{suggestion.score.toFixed(0)}%</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${roleBadge(suggestion.role)}`}>
                          {roleLabel(suggestion.role, suggestion.position)}
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-(--muted) transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-2 text-[9px] text-(--muted)">
                    <span>Semântica: {suggestion.semanticScore.toFixed(0)}%</span>
                    <span>Hierarquia: {suggestion.hierarchyScore.toFixed(0)}</span>
                    <span>Posição do texto: {bucketLabel(suggestion.anchorBucket)}</span>
                    <span>Ocorrências: {occurrenceCount}</span>
                    {suggestion.position ? <span>Hierarquia: {roleLabel(suggestion.role, suggestion.position)}</span> : null}
                    {suggestion.expectedByPlan ? <span className="text-(--admin-positive)">Esperado KGR</span> : null}
                    {suggestion.alreadyLinked ? <span className="text-(--admin-warning)">Já linkado</span> : null}
                  </div>

                  {isOpen ? (
                    <div className="rounded-[11px] border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--text) animate-in fade-in duration-150">
                      <div>
                        <strong>Âncora sugerida:</strong> {suggestion.anchorText}
                      </div>
                      <div className="mt-1 text-(--muted)">{suggestion.reason}</div>
                      {suggestion.suggestedAnchorModification ? (
                        <div className="mt-2 rounded-md border border-(--border) bg-(--surface) p-2 text-(--muted)">
                          <strong>Microajuste sugerido:</strong> {suggestion.suggestedAnchorModification}
                        </div>
                      ) : null}
                      {suggestion.linkingPrinciple || suggestion.semanticBridge ? (
                        <div className="mt-2 grid gap-2">
                          {suggestion.linkingPrinciple ? (
                            <div className="rounded-md border border-(--border) bg-(--surface) p-2 text-(--muted)">
                              <strong>Princípio:</strong> {suggestion.linkingPrinciple}
                            </div>
                          ) : null}
                          {suggestion.semanticBridge ? (
                            <div className="rounded-md border border-(--border) bg-(--surface) p-2 text-(--muted)">
                              <strong>Ponte semântica:</strong> {suggestion.semanticBridge}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {suggestion.sourceGuidance ? (
                        <div className="mt-2 line-clamp-2 text-[9px] text-(--muted-2)">
                          Base aplicada: {suggestion.sourceGuidance}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => previewSuggestionAnchor(suggestion)}
                      disabled={occurrenceCount <= 0}
                      className="admin-button-soft min-h-[32px] px-2 py-1.5 text-[10px] disabled:opacity-40"
                    >
                      Ver frase ({occurrenceCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="admin-button-primary min-h-[32px] px-2 py-1.5 text-[10px]"
                    >
                      {pendingApplyCandidateId === suggestion.candidateId ? "Confirmar link" : "Aplicar link interno"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>

      <div className="rounded-[12px] border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted-2)">
        Dica: clique em &quot;Ver frase&quot; para revisar o contexto. O botão &quot;Aplicar&quot; exige confirmação na âncora localizada.
      </div>
    </section>
  );
}
