"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Clipboard, ExternalLink, FileCheck2, Search, ShieldAlert, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import type { EditorMeta } from "@/components/editor/types";
import {
  buildInternalDuplicationGptBrief,
  buildInternalDuplicationEditorReport,
  buildInternalDuplicationExecutiveReport,
  type InternalDuplicationReportArticle,
} from "@/lib/seo/internalDuplicationReport";

type CopyRiskLevel = "low" | "medium" | "high";
type InternalScanScope = "silo" | "site";

type ExternalCopyMatch = {
  queryExcerpt: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceDomain: string;
  sourceSnippet: string;
  similarityScore: number;
  overlapTokens: number;
  riskLevel: CopyRiskLevel;
};

type ExternalCopyAnalysis = {
  uniquenessScore: number;
  riskLevel: CopyRiskLevel;
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  summary: string;
  matches: ExternalCopyMatch[];
};

type InternalDuplicateMatch = {
  sourcePostId: string;
  sourceTitle: string;
  sourceSlug: string;
  sourceExcerpt: string;
  chunkText: string;
  overlapTokens: number;
  similarityScore: number;
  riskLevel: CopyRiskLevel;
  matchType?: "copy_overlap" | "shared_template" | "keyword_overlap" | "intent_conflict" | "acceptable_silo_overlap";
  matchLabel?: string;
  editorialSeverity?: "ok" | "monitor" | "rewrite_before_publish";
  recommendedAction?: "rewrite" | "differentiate_angle" | "move_section" | "link" | "ignore";
  actionLabel?: string;
  actionReason?: string;
  sourceGuidance?: string;
  acceptableOverlapReason?: string;
  differentiationInstruction?: string;
  alternatives?: string[];
};

type InternalPriorityAction = {
  id: string;
  label: string;
  severity: "ok" | "monitor" | "rewrite_before_publish";
  recommendedAction: "rewrite" | "differentiate_angle" | "move_section" | "link" | "ignore";
  matchType: "copy_overlap" | "shared_template" | "keyword_overlap" | "intent_conflict" | "acceptable_silo_overlap";
  reason: string;
  currentExcerpt: string;
  comparedTitle: string;
  comparedSlug: string;
  similarityScore: number;
  sourceGuidance?: string;
  differentiationInstruction?: string;
};

type InternalExecutiveSummary = {
  status: "ok" | "publish_now" | "monitor" | "rewrite_before_publish";
  label: string;
  mainIssue: string;
  nextAction: string;
  topProblems: string[];
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
  executiveSummary?: InternalExecutiveSummary;
  priorityActions?: InternalPriorityAction[];
  gptBrief?: string;
  supportSources?: Array<{ title: string; guidance: string; url?: string; localPath?: string }>;
  supportContext?: string;
  matches: InternalDuplicateMatch[];
};

type SchemaReview = {
  schemaType: EditorMeta["schemaType"];
  score: number;
  ready: boolean;
  blockers: string[];
  warnings: string[];
  notes: string[];
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function buildContentSignature(text: string, meta: EditorMeta) {
  const normalized = normalizeText(text);
  return [
    normalized.split(/\s+/).filter(Boolean).length,
    normalized.length,
    hashString(normalized.slice(0, 3000)),
    normalizeText(meta.title),
    normalizeText(meta.targetKeyword),
    meta.schemaType,
  ].join(":");
}

function scoreTone(score: number) {
  if (score >= 80) return "text-(--admin-positive)";
  if (score >= 60) return "text-(--admin-warning)";
  return "text-(--admin-danger)";
}

function badgeTone(level: CopyRiskLevel) {
  if (level === "high") return "border-[rgba(143,91,73,0.16)] bg-(--admin-danger-soft) text-(--admin-danger)";
  if (level === "medium") return "border-[rgba(138,105,64,0.18)] bg-(--admin-warning-soft) text-(--admin-warning)";
  return "border-[rgba(41,94,82,0.18)] bg-(--admin-positive-soft) text-(--admin-positive)";
}

function executiveTone(status?: InternalExecutiveSummary["status"]) {
  if (status === "rewrite_before_publish") return "border-[rgba(143,91,73,0.16)] bg-(--admin-danger-soft) text-(--admin-danger)";
  if (status === "monitor") return "border-[rgba(138,105,64,0.18)] bg-(--admin-warning-soft) text-(--admin-warning)";
  return "border-[rgba(41,94,82,0.18)] bg-(--admin-positive-soft) text-(--admin-positive)";
}

function matchSeverityTone(level?: InternalDuplicateMatch["editorialSeverity"]) {
  if (level === "rewrite_before_publish") return "bg-(--admin-danger-soft) text-(--admin-danger)";
  if (level === "monitor") return "bg-(--admin-warning-soft) text-(--admin-warning)";
  return "bg-(--admin-positive-soft) text-(--admin-positive)";
}

function actionableInternalMatches(analysis: InternalDuplicateAnalysis) {
  return analysis.matches
    .filter((match) => (match.editorialSeverity ?? (match.riskLevel === "low" ? "ok" : "monitor")) !== "ok")
    .slice(0, 3);
}

function editorHierarchyLabel(meta: EditorMeta) {
  const role = meta.siloRole === "PILLAR" ? "Pilar" : meta.siloRole === "AUX" ? "Auxiliar" : "Suporte";
  const position = typeof meta.siloPosition === "number" && Number.isFinite(meta.siloPosition) ? ` #${meta.siloPosition}` : "";
  return `${role}${position}`;
}

function mapEditorReportArticle(
  meta: EditorMeta,
  analysis: InternalDuplicateAnalysis,
  stale: boolean
): InternalDuplicationReportArticle {
  return {
    title: meta.title || "Artigo em edicao",
    slug: meta.slug || "sem-slug",
    hierarchy: editorHierarchyLabel(meta),
    uniquenessScore: analysis.uniquenessScore,
    riskLevel: analysis.riskLevel,
    summary: analysis.summary,
    comparedPosts: analysis.comparedPosts,
    checkedChunks: analysis.checkedChunks,
    suspectChunks: analysis.suspectChunks,
    highRiskChunks: analysis.highRiskChunks,
    stale,
    executiveSummary: analysis.executiveSummary,
    priorityActions: analysis.priorityActions,
    gptBrief: analysis.gptBrief,
    supportSources: analysis.supportSources,
    supportContext: analysis.supportContext,
    matches: analysis.matches.map((match) => ({
      sourceTitle: match.sourceTitle,
      sourceSlug: match.sourceSlug,
      sourceHierarchy: null,
      chunkText: match.chunkText,
      sourceExcerpt: match.sourceExcerpt,
      similarityScore: match.similarityScore,
      overlapTokens: match.overlapTokens,
      riskLevel: match.riskLevel,
      matchType: match.matchType,
      matchLabel: match.matchLabel,
      editorialSeverity: match.editorialSeverity,
      actionLabel: match.actionLabel,
      actionReason: match.actionReason,
      sourceGuidance: match.sourceGuidance,
      acceptableOverlapReason: match.acceptableOverlapReason,
      differentiationInstruction: match.differentiationInstruction,
      alternatives: match.alternatives,
    })),
  };
}

function detectFaqContent(text: string, html: string) {
  return (
    /data-type=["']faq-block["']/i.test(html) ||
    /\b(perguntas frequentes|faq|duvidas frequentes|dúvidas frequentes)\b/i.test(text)
  );
}

function buildSchemaReview(meta: EditorMeta, text: string, html: string): SchemaReview {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  let score = 100;

  const hasFaqInContent = detectFaqContent(text, html);
  const schemaType = meta.schemaType ?? "article";

  if (schemaType === "review") {
    if (!Array.isArray(meta.amazonProducts) || meta.amazonProducts.length === 0) {
      blockers.push("Schema Review exige pelo menos 1 produto vinculado.");
      score -= 35;
    } else {
      notes.push(`${meta.amazonProducts.length} produto(s) vinculado(s) ao review.`);
    }
  }

  if (schemaType === "howto") {
    if (!Array.isArray(meta.howto) || meta.howto.length === 0) {
      blockers.push("Schema HowTo exige passos preenchidos.");
      score -= 35;
    } else {
      notes.push(`${meta.howto.length} passo(s) configurado(s) no HowTo.`);
    }
  }

  if (schemaType === "faq") {
    if (!Array.isArray(meta.faq) || meta.faq.length === 0) {
      if (hasFaqInContent) {
        warnings.push("FAQ detectado no texto, mas sem perguntas estruturadas no schema.");
        score -= 12;
      } else {
        blockers.push("Schema FAQ exige perguntas e respostas estruturadas.");
        score -= 35;
      }
    } else {
      notes.push(`${meta.faq.length} pergunta(s) configurada(s) no FAQ.`);
    }
  }

  if (schemaType === "article" && hasFaqInContent) {
    warnings.push("FAQ detectado no conteúdo. Avalie trocar o schema para FAQ.");
    score -= 8;
  }

  if (schemaType !== "article" && (!meta.sources || meta.sources.length === 0)) {
    warnings.push("Adicione fontes para sustentar o schema e a revisão editorial.");
    score -= 8;
  }

  if (!meta.metaDescription?.trim()) {
    warnings.push("Meta description vazia. Revise antes de publicar.");
    score -= 6;
  }

  return {
    schemaType,
    score: Math.max(0, score),
    ready: blockers.length === 0,
    blockers,
    warnings,
    notes,
  };
}

function StatCard({
  label,
  value,
  tone,
  helper,
}: {
  label: string;
  value: string;
  tone: string;
  helper: string;
}) {
  return (
    <div className="admin-subpane p-3">
      <div className="text-[10px] font-semibold uppercase text-(--muted)">{label}</div>
      <div className={`mt-1 text-lg font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-[10px] text-(--muted)">{helper}</div>
    </div>
  );
}

function findContiguousTextPosition(editor: any, searchText: string): { from: number; to: number } | null {
  if (!editor || !searchText) return null;
  const doc = editor.state.doc;
  const docSize = doc.content.size;

  let found: { from: number; to: number } | null = null;

  // Gather all text nodes with their start and end positions
  const textNodes: Array<{ text: string; from: number; to: number }> = [];
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      textNodes.push({
        text: node.text,
        from: pos,
        to: pos + node.text.length,
      });
    }
  });

  // Join all text nodes and create mapping
  let joinedText = "";
  const indexMap: number[] = [];

  for (const node of textNodes) {
    for (let i = 0; i < node.text.length; i++) {
      joinedText += node.text[i];
      indexMap.push(node.from + i);
    }
  }

  const target = searchText.trim().replace(/\s+/g, " ");
  let startIdx = joinedText.indexOf(searchText);

  if (startIdx === -1) {
    // try normalized match
    const normJoined = joinedText.replace(/\s+/g, " ");
    const normTarget = target;
    const normIdx = normJoined.indexOf(normTarget);
    if (normIdx !== -1) {
      for (let i = 0; i < joinedText.length; i++) {
        const remaining = joinedText.slice(i).replace(/\s+/g, " ");
        if (remaining.startsWith(normTarget)) {
          startIdx = i;
          break;
        }
      }
    }
  }

  if (startIdx !== -1) {
    const endIdx = startIdx + searchText.length;
    const from = indexMap[startIdx];
    const to = indexMap[Math.min(endIdx - 1, indexMap.length - 1)] + 1;
    if (from !== undefined && to !== undefined) {
      found = { from, to };
    }
  }

  if (!found) {
    const partial = searchText.slice(0, 20);
    for (const node of textNodes) {
      const idx = node.text.indexOf(partial);
      if (idx !== -1) {
        found = { from: node.from + idx, to: Math.min(docSize, node.from + idx + searchText.length) };
        break;
      }
    }
  }

  return found;
}

function ResultPlaceholder({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(58,88,95,0.95)] bg-[rgba(68,68,68,0.94)] px-3 py-2.5 text-[11px] font-medium leading-relaxed text-[rgba(207,219,225,0.92)]">
      {text}
    </div>
  );
}

export function ReviewPanel() {
  const { editor, docText, docHtml, meta, postId, setActiveSuggestion } = useEditorContext();
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [externalAnalysis, setExternalAnalysis] = useState<ExternalCopyAnalysis | null>(null);
  const [externalSignature, setExternalSignature] = useState<string | null>(null);

  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalAnalysis, setInternalAnalysis] = useState<InternalDuplicateAnalysis | null>(null);
  const [internalSignature, setInternalSignature] = useState<string | null>(null);
  const [internalScope, setInternalScope] = useState<InternalScanScope>("silo");
  const [internalScopeAtScan, setInternalScopeAtScan] = useState<InternalScanScope>("silo");
  const [internalCopyStatus, setInternalCopyStatus] = useState<string | null>(null);
  const [loadingMatchIndex, setLoadingMatchIndex] = useState<number | null>(null);

  const handleSuggestDuplicationRephrase = async (match: InternalDuplicateMatch, idx: number) => {
    if (!editor) return;
    setLoadingMatchIndex(idx);
    try {
      const coords = findContiguousTextPosition(editor, match.chunkText);
      const from = coords ? coords.from : 1;
      const to = coords ? coords.to : Math.min(editor.state.doc.content.size, 100);

      const response = await fetch("/api/admin/improve-fragment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: match.chunkText,
          title: meta.title || "",
          keyword: meta.targetKeyword || "",
          slug: meta.slug || "",
          siloId: meta.siloId || "",
          postId: postId || "",
          position: `duplicação com /${match.sourceSlug}`,
          reason: "duplication",
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao chamar API de reescrita");
      }

      const res = await response.json();
      if (res.ok) {
        setActiveSuggestion({
          from,
          to,
          originalText: match.chunkText,
          improvedText: res.improvedText,
          explanation: res.explanation,
          options: res.options || [],
          selectedOptionIndex: 0,
        });

        // Smooth scroll sidebar left container to focus on Guardian panel where activeSuggestion is loaded
        const container = document.getElementById("intelligence-scroll-container");
        if (container) {
          setTimeout(() => {
            const el = container.querySelector(".admin-ai-surface") || container.querySelector("#guardian-section-root");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
              container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
            }
          }, 100);
        }
      } else {
        alert(res.error || "Ocorreu um erro ao obter sugestões.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro de rede ao obter sugestões.");
    } finally {
      setLoadingMatchIndex(null);
    }
  };

  const currentText = useMemo(() => (docText || editor?.getText() || "").trim(), [docText, editor]);
  const currentWordCount = useMemo(
    () => currentText.split(/\s+/).filter(Boolean).length,
    [currentText]
  );
  const currentSignature = useMemo(() => buildContentSignature(currentText, meta), [currentText, meta]);
  const schemaReview = useMemo(() => buildSchemaReview(meta, currentText, docHtml), [meta, currentText, docHtml]);

  const externalStale = Boolean(externalAnalysis && externalSignature && externalSignature !== currentSignature);
  const internalStale = Boolean(
    internalAnalysis &&
      internalSignature &&
      (internalSignature !== currentSignature || internalScopeAtScan !== internalScope)
  );

  const internalReportArticle = useMemo(() => {
    if (!internalAnalysis) return null;
    return mapEditorReportArticle(meta, internalAnalysis, internalStale);
  }, [internalAnalysis, internalStale, meta]);

  const internalReportText = useMemo(() => {
    if (!internalReportArticle) return "";
    return buildInternalDuplicationEditorReport({
      scopeLabel: internalScopeAtScan === "site" ? "Site inteiro" : "Silo atual",
      article: internalReportArticle,
    });
  }, [internalReportArticle, internalScopeAtScan]);

  const internalExecutiveReportText = useMemo(() => {
    if (!internalReportArticle) return "";
    return buildInternalDuplicationExecutiveReport({
      scopeLabel: internalScopeAtScan === "site" ? "Site inteiro" : "Silo atual",
      article: internalReportArticle,
    });
  }, [internalReportArticle, internalScopeAtScan]);

  const internalGptBriefText = useMemo(() => {
    if (!internalReportArticle) return "";
    return buildInternalDuplicationGptBrief({
      scopeLabel: internalScopeAtScan === "site" ? "Site inteiro" : "Silo atual",
      article: internalReportArticle,
    });
  }, [internalReportArticle, internalScopeAtScan]);

  const internalActionableMatches = useMemo(
    () => (internalAnalysis ? actionableInternalMatches(internalAnalysis) : []),
    [internalAnalysis]
  );

  const runExternalScan = async () => {
    if (currentWordCount < 80) {
      setExternalError("Escreva pelo menos 80 palavras para estimar unicidade externa.");
      setExternalAnalysis(null);
      return;
    }

    setExternalLoading(true);
    setExternalError(null);
    try {
      const response = await fetch("/api/seo/plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentText,
          maxQueries: 6,
          num: 5,
          hl: "pt-BR",
          gl: "BR",
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setExternalError(json?.message || json?.error || "Falha ao escanear a web.");
        setExternalAnalysis(null);
        return;
      }

      setExternalAnalysis(json.analysis as ExternalCopyAnalysis);
      setExternalSignature(currentSignature);
    } catch (error: any) {
      setExternalError(error?.message || "Falha ao escanear a web.");
      setExternalAnalysis(null);
    } finally {
      setExternalLoading(false);
    }
  };

  const runInternalScan = async () => {
    if (currentWordCount < 80) {
      setInternalError("Escreva pelo menos 80 palavras para revisar duplicacao interna.");
      setInternalAnalysis(null);
      return;
    }

    if (internalScope === "silo" && !meta.siloId) {
      setInternalError("Selecione um silo para comparar com o silo atual.");
      setInternalAnalysis(null);
      return;
    }

    setInternalLoading(true);
    setInternalError(null);
    setInternalCopyStatus(null);
    try {
      const response = await fetch("/api/seo/internal-duplication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          siloId: meta.siloId || undefined,
          text: currentText,
          targetKeyword: meta.targetKeyword,
          maxMatches: 8,
          scope: internalScope,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setInternalError(json?.message || json?.error || "Falha ao revisar duplicacao interna.");
        setInternalAnalysis(null);
        return;
      }

      setInternalAnalysis(json.analysis as InternalDuplicateAnalysis);
      setInternalSignature(currentSignature);
      setInternalScopeAtScan(internalScope);
    } catch (error: any) {
      setInternalError(error?.message || "Falha ao revisar duplicacao interna.");
      setInternalAnalysis(null);
    } finally {
      setInternalLoading(false);
    }
  };

  const copyInternalText = async (value: string, successMessage: string) => {
    if (!value) return;
    setInternalCopyStatus(null);
    try {
      await navigator.clipboard.writeText(value);
      setInternalCopyStatus(successMessage);
    } catch {
      setInternalCopyStatus("Nao foi possivel copiar automaticamente.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="admin-subpane p-3 text-[11px] text-(--muted)">
        <div className="font-semibold uppercase text-(--text)">Revisão manual</div>
        <p className="mt-1">
          As verificacoes abaixo não rodam no autosave. Rode apenas quando quiser conferir o texto antes de publicar.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Web / SERP"
          value={externalAnalysis ? `${externalAnalysis.uniquenessScore}%` : "Pendente"}
          tone={externalAnalysis ? scoreTone(externalAnalysis.uniquenessScore) : "text-(--muted-2)"}
          helper="Plagio externo"
        />
        <StatCard
          label="Interno"
          value={internalAnalysis ? `${internalAnalysis.uniquenessScore}%` : "Pendente"}
          tone={internalAnalysis ? scoreTone(internalAnalysis.uniquenessScore) : "text-(--muted-2)"}
          helper={internalScope === "site" ? "Site inteiro" : "Silo atual"}
        />
        <StatCard
          label="Schema"
          value={`${schemaReview.score}%`}
          tone={scoreTone(schemaReview.score)}
          helper={schemaReview.ready ? "Pronto" : "Ajustar"}
        />
      </div>

      <section className="admin-subpane space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase text-(--muted)">Plagio Externo</div>
            <div className="text-[10px] text-(--muted)">Usa busca web/SERP para estimar unicidade.</div>
          </div>
          {externalAnalysis ? (
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${badgeTone(externalAnalysis.riskLevel)}`}>
              {externalAnalysis.riskLevel}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={runExternalScan}
          disabled={externalLoading}
          className="admin-button-primary flex w-full disabled:opacity-50"
        >
          <Search size={14} />
          {externalLoading ? "Escaneando web..." : "Escanear web"}
        </button>

        {externalStale ? (
          <div className="rounded-xl border border-[rgba(138,105,64,0.18)] bg-(--admin-warning-soft) p-2 text-[10px] text-(--admin-warning)">
            O texto mudou desde o ultimo scan externo. Revise novamente antes de publicar.
          </div>
        ) : null}

        {externalError ? (
          <div className="rounded-xl border border-[rgba(143,91,73,0.16)] bg-(--admin-danger-soft) p-2 text-[11px] text-(--admin-danger)">{externalError}</div>
        ) : null}

        {!externalAnalysis && !externalError ? (
          <ResultPlaceholder text="Rode o scan manual para gerar uma pontuacao estimada de unicidade externa." />
        ) : null}

        {externalAnalysis ? (
          <div className="space-y-3 rounded-2xl border border-(--border) bg-(--surface) p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase text-(--muted)">Pontuacao estimada</div>
                <div className={`text-xl font-bold ${scoreTone(externalAnalysis.uniquenessScore)}`}>
                  {externalAnalysis.uniquenessScore}%
                </div>
              </div>
              <div className="text-right text-[10px] text-(--muted)">
                <div>Trechos: {externalAnalysis.checkedChunks}</div>
                <div>Suspeitos: {externalAnalysis.suspectChunks}</div>
                <div>Alto risco: {externalAnalysis.highRiskChunks}</div>
              </div>
            </div>

            <p className="text-[11px] text-(--muted)">{externalAnalysis.summary}</p>

            {externalAnalysis.matches.length > 0 ? (
              <div className="space-y-2">
                {externalAnalysis.matches.slice(0, 3).map((match, index) => (
                  <div key={`${match.sourceUrl}-${index}`} className="rounded-2xl border border-(--border) bg-(--surface-muted) p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${badgeTone(match.riskLevel)}`}>
                        {(match.similarityScore * 100).toFixed(0)}%
                      </span>
                      <span className="truncate text-[10px] text-(--muted)">{match.sourceDomain}</span>
                    </div>
                    <a
                      href={match.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 truncate text-[11px] font-medium text-(--brand-hot) hover:underline"
                      title={match.sourceTitle}
                    >
                      {match.sourceTitle}
                      <ExternalLink size={10} />
                    </a>
                    <div className="mt-1 text-[10px] text-(--muted)">
                      Trecho consultado: <span className="text-(--text)">{match.queryExcerpt}</span>
                    </div>
                    {match.sourceSnippet ? (
                      <p className="mt-1 line-clamp-2 text-[10px] text-(--text)">{match.sourceSnippet}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-[rgba(41,94,82,0.18)] bg-(--admin-positive-soft) p-2 text-[11px] text-(--admin-positive)">
                <ShieldCheck size={12} />
                Nenhum indicio forte encontrado nos trechos externos avaliados.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="admin-subpane space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase text-(--muted)">Duplicacao Interna</div>
            <div className="text-[10px] text-(--muted)">Serve para detectar canibalizacao e repeticao de texto.</div>
          </div>
          {internalAnalysis ? (
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${badgeTone(internalAnalysis.riskLevel)}`}>
              {internalAnalysis.riskLevel}
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          {(["silo", "site"] as InternalScanScope[]).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => setInternalScope(scope)}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${
                internalScope === scope
                  ? "border-[rgba(64,209,219,0.62)] bg-(--surface) text-(--brand-accent)"
                  : "border-(--border) bg-(--surface-muted) text-(--text)"
              }`}
            >
              {scope === "silo" ? "Silo atual" : "Site inteiro"}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={runInternalScan}
            disabled={internalLoading}
            className="admin-button-primary flex w-full disabled:opacity-50"
          >
            <Search size={14} />
            {internalLoading ? "Escaneando duplicacao..." : "Escanear duplicacao interna"}
          </button>
          <button
            type="button"
            onClick={() => copyInternalText(internalGptBriefText, "Resumo para GPT copiado.")}
            disabled={!internalAnalysis || internalLoading}
            className="admin-button-soft flex disabled:opacity-50"
          >
            <Clipboard size={14} />
            Copiar para GPT
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => copyInternalText(internalExecutiveReportText, "Resumo executivo copiado.")}
            disabled={!internalAnalysis || internalLoading}
            className="admin-button-soft flex disabled:opacity-50"
          >
            <Clipboard size={14} />
            Resumo executivo
          </button>
          <button
            type="button"
            onClick={() => copyInternalText(internalReportText, "Relatorio completo copiado.")}
            disabled={!internalAnalysis || internalLoading}
            className="admin-button-soft flex disabled:opacity-50"
          >
            <Clipboard size={14} />
            Relatorio completo
          </button>
        </div>

        {internalCopyStatus ? (
          <div className="rounded-xl border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted)">
            {internalCopyStatus}
          </div>
        ) : null}

        {internalStale ? (
          <div className="rounded-xl border border-[rgba(138,105,64,0.18)] bg-(--admin-warning-soft) p-2 text-[10px] text-(--admin-warning)">
            O texto mudou desde a ultima revisão interna. Atualize o scan antes de publicar.
          </div>
        ) : null}

        {internalError ? (
          <div className="rounded-xl border border-[rgba(143,91,73,0.16)] bg-(--admin-danger-soft) p-2 text-[11px] text-(--admin-danger)">{internalError}</div>
        ) : null}

        {!internalAnalysis && !internalError ? (
          <ResultPlaceholder text="Rode o scan interno para comparar com o silo atual ou com o site inteiro." />
        ) : null}

        {internalAnalysis ? (
          <div className="space-y-3 rounded-2xl border border-(--border) bg-(--surface) p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase text-(--muted)">Pontuacao interna</div>
                <div className={`text-xl font-bold ${scoreTone(internalAnalysis.uniquenessScore)}`}>
                  {internalAnalysis.uniquenessScore}%
                </div>
              </div>
              <div className="text-right text-[10px] text-(--muted)">
                <div>Comparados: {internalAnalysis.comparedPosts}</div>
                <div>Trechos: {internalAnalysis.checkedChunks}</div>
                <div>Suspeitos: {internalAnalysis.suspectChunks}</div>
              </div>
            </div>

            <div className={`rounded-xl border p-2 text-[11px] ${executiveTone(internalAnalysis.executiveSummary?.status)}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold uppercase">{internalAnalysis.executiveSummary?.label ?? internalAnalysis.riskLevel}</span>
                <span>{internalAnalysis.highRiskChunks} alto risco</span>
              </div>
              <div className="mt-1 text-(--text)">
                {internalAnalysis.executiveSummary?.mainIssue ?? internalAnalysis.summary}
              </div>
              <div className="mt-1 text-[10px] text-(--muted)">
                {internalAnalysis.executiveSummary?.nextAction ?? "Revise os matches prioritarios antes de publicar."}
              </div>
            </div>

            {internalAnalysis.priorityActions?.length ? (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase text-(--muted)">Acoes prioritarias</div>
                {internalAnalysis.priorityActions.slice(0, 3).map((action) => (
                  <div key={action.id} className="rounded-xl border border-(--border) bg-(--surface-muted) p-2 text-[10px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded px-1.5 py-0.5 font-semibold uppercase ${matchSeverityTone(action.severity)}`}>
                        {action.label}
                      </span>
                      <span className="text-(--muted)">{(action.similarityScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 font-semibold text-(--text)">{action.comparedTitle}</div>
                    <div className="mt-1 text-(--muted)">{action.reason}</div>
                    {action.differentiationInstruction ? (
                      <div className="mt-2 rounded-lg border border-(--border) bg-(--surface) p-2 text-(--muted)">
                        {action.differentiationInstruction}
                      </div>
                    ) : null}
                    {action.sourceGuidance ? (
                      <div className="mt-1 line-clamp-1 text-[9px] text-(--muted-2)">Base: {action.sourceGuidance}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {internalActionableMatches.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase text-(--muted)">Trechos que precisam de decisao</div>
                {internalActionableMatches.map((match, index) => (
                  <div key={`${match.sourcePostId}-${index}`} className="rounded-2xl border border-(--border) bg-(--surface-muted) p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${matchSeverityTone(match.editorialSeverity)}`}>
                        {match.matchLabel ?? `${(match.similarityScore * 100).toFixed(0)}%`}
                      </span>
                      <span className="text-[10px] text-(--muted)">
                        {(match.similarityScore * 100).toFixed(0)}% | {match.actionLabel ?? "Revisar"}
                      </span>
                    </div>
                    <a
                      href={`/admin/editor/${match.sourcePostId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 truncate text-[11px] font-medium text-(--brand-hot) hover:underline"
                      title={match.sourceTitle}
                    >
                      {match.sourceTitle}
                      <ExternalLink size={10} />
                    </a>
                    <div className="mt-1 text-[10px] text-(--muted)">/{match.sourceSlug}</div>
                    {match.actionReason ? (
                      <div className="mt-2 rounded-lg border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
                        {match.actionReason}
                      </div>
                    ) : null}
                    {match.differentiationInstruction ? (
                      <div className="mt-2 rounded-lg border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
                        {match.differentiationInstruction}
                      </div>
                    ) : null}
                    {match.sourceGuidance ? (
                      <div className="mt-1 line-clamp-1 text-[9px] text-(--muted-2)">Base: {match.sourceGuidance}</div>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-[10px] text-(--text)">
                      Atual: {match.chunkText}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[10px] text-(--muted)">
                      Similar: {match.sourceExcerpt}
                    </p>
                    
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-2">
                      <span className="text-[9px] text-zinc-500">Inteligência Guardião SEO</span>
                      <button
                        type="button"
                        onClick={() => handleSuggestDuplicationRephrase(match, index)}
                        disabled={loadingMatchIndex !== null}
                        className="admin-button-soft text-(--admin-positive) border-[color:var(--admin-positive)]/20 hover:bg-(--admin-positive)/10 min-h-[28px] rounded-lg px-2.5 py-1 text-[10px] flex items-center gap-1.5 font-bold transition-all shadow-sm cursor-pointer"
                        title="Sugerir reescritas inteligentes e alternativas anti-plágio para este trecho"
                      >
                        {loadingMatchIndex === index ? (
                          <Loader2 size={11} className="animate-spin text-(--admin-positive)" />
                        ) : (
                          <Sparkles size={11} />
                        )}
                        {loadingMatchIndex === index ? "Processando..." : "Sugerir Alternativas"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-[rgba(41,94,82,0.18)] bg-(--admin-positive-soft) p-2 text-[11px] text-(--admin-positive)">
                <ShieldCheck size={12} />
                Nenhum trecho prioritario para reescrita. Baixo risco fica fora do fluxo principal.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="admin-subpane space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-(--muted)">
            <FileCheck2 size={14} />
            Schema
          </div>
          <span className={`text-[11px] font-bold ${scoreTone(schemaReview.score)}`}>{schemaReview.score}/100</span>
        </div>

        <div className="rounded-2xl border border-(--border) bg-(--surface) p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold text-(--text)">Tipo configurado</div>
              <div className="text-[10px] uppercase text-(--muted)">{schemaReview.schemaType}</div>
            </div>
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${
                schemaReview.ready
                  ? "border-[rgba(41,94,82,0.18)] bg-(--admin-positive-soft) text-(--admin-positive)"
                  : "border-[rgba(143,91,73,0.16)] bg-(--admin-danger-soft) text-(--admin-danger)"
              }`}
            >
              {schemaReview.ready ? "ok" : "ajustar"}
            </span>
          </div>

          {schemaReview.blockers.length > 0 ? (
            <div className="mt-3 space-y-1">
              {schemaReview.blockers.map((item) => (
                <div key={item} className="flex items-start gap-2 text-[10px] text-(--admin-danger)">
                  <ShieldAlert size={11} className="mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}

          {schemaReview.warnings.length > 0 ? (
            <div className="mt-3 space-y-1">
              {schemaReview.warnings.map((item) => (
                <div key={item} className="flex items-start gap-2 text-[10px] text-(--admin-warning)">
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}

          {schemaReview.notes.length > 0 ? (
            <div className="mt-3 space-y-1">
              {schemaReview.notes.map((item) => (
                <div key={item} className="text-[10px] text-(--muted)">
                  {item}
                </div>
              ))}
            </div>
          ) : null}

          {schemaReview.blockers.length === 0 && schemaReview.warnings.length === 0 ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[rgba(41,94,82,0.18)] bg-(--admin-positive-soft) p-2 text-[11px] text-(--admin-positive)">
              <ShieldCheck size={12} />
              Schema pronto para publicação.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
