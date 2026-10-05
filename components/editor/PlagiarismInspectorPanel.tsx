"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import type { Editor } from "@tiptap/react";

type CopyRiskLevel = "low" | "medium" | "high";

type InternalDuplicateMatch = {
  sourcePostId: string;
  sourceTitle: string;
  sourceSlug: string;
  sourceExcerpt: string;
  chunkText: string;
  alternatives: string[];
  overlapTokens: number;
  similarityScore: number;
  riskLevel: CopyRiskLevel;
};

type InternalDuplicateAnalysis = {
  uniquenessScore: number;
  riskLevel: CopyRiskLevel;
  totalWords: number;
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  comparedPosts: number;
  summary: string;
  semanticDiagnostics?: {
    structure?: {
      coverageScore?: number;
      missingSections?: string[];
    };
    coverage?: {
      lsiCoverageScore?: number;
      missingRelatedTerms?: string[];
    };
    warnings?: string[];
  };
  matches: InternalDuplicateMatch[];
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildProbe(excerpt: string) {
  const words = excerpt
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!words.length) return "";
  return words.slice(0, 8).join(" ");
}

function findRangeByExcerpt(editor: Editor, excerpt: string) {
  const probe = buildProbe(excerpt);
  if (!probe) return null;
  const probeNorm = normalizeText(probe);
  if (!probeNorm) return null;

  let found: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (!node.isText || !node.text) return true;

    const text = String(node.text);
    const textNorm = normalizeText(text);
    const index = textNorm.indexOf(probeNorm);
    if (index < 0) return true;

    found = {
      from: pos + index,
      to: pos + index + probe.length,
    };
    return false;
  });

  return found;
}

function hasClipboardSupport() {
  return typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;
}

type CopyActionState = {
  markedIndex: number | null;
  copiedIndex: number | null;
};

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function badgeTone(level: CopyRiskLevel) {
  if (level === "high") return "border-red-200 bg-red-50 text-red-700";
  if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function PlagiarismInspectorPanel() {
  const { editor, meta, docText, postId } = useEditorContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<InternalDuplicateAnalysis | null>(null);
  const [actionState, setActionState] = useState<CopyActionState>({
    markedIndex: null,
    copiedIndex: null,
  });

  const wordCount = useMemo(() => {
    const text = (editor?.getText() ?? docText ?? "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [docText, editor]);

  const runInspection = async () => {
    if (!meta.siloId) {
      setError("Este post precisa estar em um silo para revisar duplicacao interna.");
      setAnalysis(null);
      return;
    }

    const text = (editor?.getText() ?? docText ?? "").trim();
    if (!text || text.split(/\s+/).filter(Boolean).length < 80) {
      setError("Escreva pelo menos 80 palavras para rodar o inspetor.");
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/seo/internal-duplication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          siloId: meta.siloId,
          text,
          targetKeyword: meta.targetKeyword,
          maxMatches: 10,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.message || json?.error || "Falha ao inspecionar copias.");
        setAnalysis(null);
        return;
      }

      setAnalysis(json.analysis as InternalDuplicateAnalysis);
      setActionState({ markedIndex: null, copiedIndex: null });
    } catch (requestError: any) {
      setError(requestError?.message || "Falha ao inspecionar copias.");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const markMatchInEditor = (match: InternalDuplicateMatch, index: number) => {
    if (!editor) return;
    const range = findRangeByExcerpt(editor, match.chunkText);
    if (!range) {
      setError("Não encontrei esse trecho no texto atual para marcar.");
      return;
    }

    editor.chain().focus().setTextSelection(range).setMark("highlight", { color: "#FECACA" }).run();
    setActionState((prev) => ({ ...prev, markedIndex: index }));
  };

  const clearHighlights = () => {
    if (!editor) return;
    const to = editor.state.doc.content.size;
    if (to <= 1) return;
    editor.chain().focus().setTextSelection({ from: 1, to }).unsetMark("highlight").run();
    setActionState((prev) => ({ ...prev, markedIndex: null }));
  };

  const copyAlternative = async (text: string, index: number) => {
    if (!hasClipboardSupport()) return;
    try {
      await navigator.clipboard.writeText(text);
      setActionState((prev) => ({ ...prev, copiedIndex: index }));
    } catch {
      // no-op
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-(--muted)">
        <span className="flex items-center gap-2">
          {analysis && analysis.uniquenessScore >= 80 ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          Inspetor de Duplicacao Interna (Silo)
        </span>
        <span className="text-[10px] text-(--muted-2)">{wordCount} palavras</span>
      </div>

      <button
        type="button"
        onClick={runInspection}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded bg-(--text) px-3 py-2 text-[11px] font-semibold text-(--surface) transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        <Search size={14} />
        {loading ? "Inspecionando..." : "Revisar contra posts do silo"}
      </button>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">
          {error}
        </div>
      ) : null}

      {analysis ? (
        <div className="space-y-3 rounded border border-(--border) bg-(--surface) p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase text-(--muted)">Unicidade estimada</div>
              <div className={`text-xl font-bold ${scoreTone(analysis.uniquenessScore)}`}>{analysis.uniquenessScore}%</div>
            </div>
            <div className="text-right">
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${badgeTone(analysis.riskLevel)}`}>
                {analysis.riskLevel}
              </span>
              <div className="mt-1 text-[10px] text-(--muted)">Posts comparados: {analysis.comparedPosts}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
              <div className="font-semibold text-(--text)">{analysis.checkedChunks}</div>
              <div className="text-(--muted)">trechos</div>
            </div>
            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
              <div className="font-semibold text-amber-700">{analysis.suspectChunks}</div>
              <div className="text-(--muted)">suspeitos</div>
            </div>
            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
              <div className="font-semibold text-red-700">{analysis.highRiskChunks}</div>
              <div className="text-(--muted)">alto risco</div>
            </div>
          </div>

          <p className="text-[11px] text-(--muted)">{analysis.summary}</p>

          {analysis.semanticDiagnostics ? (
            <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted)">
              <div className="font-semibold uppercase text-(--text)">Base LSI / PNL</div>
              <div>
                Cobertura LSI:{" "}
                <span className="font-semibold text-(--text)">
                  {Math.round(analysis.semanticDiagnostics.coverage?.lsiCoverageScore ?? 0)}%
                </span>
              </div>
              <div>
                Estrutura PNL:{" "}
                <span className="font-semibold text-(--text)">
                  {Math.round(analysis.semanticDiagnostics.structure?.coverageScore ?? 0)}%
                </span>
              </div>
              {(analysis.semanticDiagnostics.structure?.missingSections?.length ?? 0) > 0 ? (
                <div>
                  Faltando: {analysis.semanticDiagnostics.structure?.missingSections?.slice(0, 4).join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}

          {analysis.matches.length > 0 ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearHighlights}
                className="rounded border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] font-semibold text-(--text) hover:border-(--brand-hot)"
              >
                Limpar marcacoes
              </button>
            </div>
          ) : null}

          {analysis.matches.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase text-(--muted)">Trechos parecidos no silo</div>
              {analysis.matches.slice(0, 5).map((match, index) => (
                <div key={`${match.sourcePostId}-${index}`} className="space-y-2 rounded border border-(--border) bg-(--surface-muted) p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${badgeTone(match.riskLevel)}`}>
                      {(match.similarityScore * 100).toFixed(0)}%
                    </span>
                    <span className="truncate text-[10px] text-(--muted)">tokens em comum: {match.overlapTokens}</span>
                  </div>

                  <a
                    href={`/admin/editor/${match.sourcePostId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-blue-600 hover:underline"
                    title={match.sourceTitle}
                  >
                    {match.sourceTitle || "Abrir post fonte"}
                    <ExternalLink size={10} />
                  </a>
                  <p className="text-[10px] text-(--muted)">/{match.sourceSlug}</p>

                  <div className="rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--text)">
                    <div className="font-semibold uppercase text-[9px] text-(--muted)">Trecho atual</div>
                    <p className="mt-1 line-clamp-3">{match.chunkText}</p>
                  </div>

                  <div className="rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--text)">
                    <div className="font-semibold uppercase text-[9px] text-(--muted)">Trecho similar no silo</div>
                    <p className="mt-1 line-clamp-3">{match.sourceExcerpt}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => markMatchInEditor(match, index)}
                    className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--text) hover:border-(--brand-hot)"
                  >
                    {actionState.markedIndex === index ? "Marcado no texto" : "Marcar no texto"}
                  </button>

                  {match.alternatives?.length ? (
                    <div className="space-y-1 rounded border border-(--border) bg-(--surface) p-2">
                      <div className="text-[9px] font-semibold uppercase text-(--muted)">Alternativas</div>
                      {match.alternatives.map((alternative, altIndex) => {
                        const copyKey = index * 10 + altIndex;
                        return (
                          <div key={copyKey} className="space-y-1 rounded border border-(--border) bg-(--surface-muted) p-2">
                            <p className="text-[10px] text-(--text)">{alternative}</p>
                            <button
                              type="button"
                              onClick={() => copyAlternative(alternative, copyKey)}
                              disabled={!hasClipboardSupport()}
                              className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--text) disabled:opacity-50"
                            >
                              {actionState.copiedIndex === copyKey ? "Copiado" : "Copiar alternativa"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-700">
              <ShieldCheck size={12} />
              Nenhum indicio forte de duplicacao interna nos trechos analisados.
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
        <div className="flex items-center gap-1 font-semibold uppercase">
          <AlertTriangle size={11} />
          Observacao
        </div>
        <p className="mt-1">
          A revisão e feita apenas com posts do mesmo silo e serve para orientar a reescrita final.
        </p>
      </div>
    </section>
  );
}
