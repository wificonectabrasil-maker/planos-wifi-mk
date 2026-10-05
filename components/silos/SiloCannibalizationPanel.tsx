"use client";

import { useMemo, useState } from "react";
import { Clipboard, ExternalLink, Search } from "lucide-react";
import {
  buildInternalDuplicationGptBrief,
  buildInternalDuplicationSiloReport,
  buildInternalDuplicationExecutiveReport,
  type InternalDuplicationReportArticle,
} from "@/lib/seo/internalDuplicationReport";

type RiskFilter = "all" | "high" | "medium" | "low";
type RiskLevel = "low" | "medium" | "high";

type SiloCannibalizationPanelProps = {
  silo: {
    id: string;
    name: string;
    slug: string;
  };
};

type SiloInternalMatch = {
  chunkText: string;
  similarityScore: number;
  overlapTokens: number;
  riskLevel: RiskLevel;
  sourcePostId: string;
  sourceTitle: string;
  sourceSlug: string;
  sourceExcerpt: string;
  sourceHierarchy?: string | null;
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

type SiloPriorityAction = {
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

type SiloExecutiveSummary = {
  status: "ok" | "publish_now" | "monitor" | "rewrite_before_publish";
  label: string;
  mainIssue: string;
  nextAction: string;
  topProblems: string[];
};

type SiloArticlePair = {
  pairKey: string;
  sourcePostId: string;
  sourceTitle: string;
  sourceSlug: string;
  matchCount: number;
  highRiskCount: number;
  maxScore: number;
  matchType: "copy_overlap" | "shared_template" | "keyword_overlap" | "intent_conflict" | "acceptable_silo_overlap";
  matchLabel: string;
  editorialSeverity: "ok" | "monitor" | "rewrite_before_publish";
  recommendedAction: "rewrite" | "differentiate_angle" | "move_section" | "link" | "ignore";
  actionLabel: string;
  reason: string;
  topMatch: SiloInternalMatch;
};

type SiloInternalArticle = {
  postId: string;
  title: string;
  slug: string;
  hierarchy: string;
  role: "PILLAR" | "SUPPORT" | "AUX" | null;
  position: number | null;
  analysis: {
    uniquenessScore: number;
    riskLevel: RiskLevel;
    totalWords: number;
    checkedChunks: number;
    suspectChunks: number;
    highRiskChunks: number;
    comparedPosts: number;
    summary: string;
    executiveSummary?: SiloExecutiveSummary;
    priorityActions?: SiloPriorityAction[];
    articlePairs?: SiloArticlePair[];
    gptBrief?: string;
    supportSources?: Array<{ title: string; guidance: string; url?: string; localPath?: string }>;
    supportContext?: string;
    matches: SiloInternalMatch[];
  };
};

type SiloInternalScan = {
  silo: {
    id: string;
    name: string;
    slug: string;
  };
  articles: SiloInternalArticle[];
  totals: {
    articles: number;
    suspectChunks: number;
    highRiskChunks: number;
  };
};

function scoreTone(score: number) {
  if (score >= 80) return "text-(--admin-positive)";
  if (score >= 60) return "text-(--admin-warning)";
  return "text-(--admin-danger)";
}

function riskBadge(level: RiskLevel) {
  if (level === "high") return "bg-(--admin-danger-soft) text-(--admin-danger)";
  if (level === "medium") return "bg-(--admin-warning-soft) text-(--admin-warning)";
  return "bg-(--admin-positive-soft) text-(--admin-positive)";
}

function riskLabel(level: RiskLevel) {
  if (level === "high") return "alto";
  if (level === "medium") return "medio";
  return "baixo";
}

function executiveTone(status?: SiloExecutiveSummary["status"]) {
  if (status === "rewrite_before_publish") return "border-(--admin-danger) text-(--admin-danger)";
  if (status === "monitor") return "border-(--admin-warning) text-(--admin-warning)";
  return "border-(--admin-positive) text-(--admin-positive)";
}

function matchSeverityTone(level?: SiloInternalMatch["editorialSeverity"]) {
  if (level === "rewrite_before_publish") return "bg-(--admin-danger-soft) text-(--admin-danger)";
  if (level === "monitor") return "bg-(--admin-warning-soft) text-(--admin-warning)";
  return "bg-(--admin-positive-soft) text-(--admin-positive)";
}

function actionableMatches(article: SiloInternalArticle) {
  return article.analysis.matches
    .filter((match) => (match.editorialSeverity ?? (match.riskLevel === "low" ? "ok" : "monitor")) !== "ok")
    .slice(0, 3);
}

function mapReportArticle(article: SiloInternalArticle): InternalDuplicationReportArticle {
  return {
    title: article.title,
    slug: article.slug,
    hierarchy: article.hierarchy,
    uniquenessScore: article.analysis.uniquenessScore,
    riskLevel: article.analysis.riskLevel,
    summary: article.analysis.summary,
    comparedPosts: article.analysis.comparedPosts,
    checkedChunks: article.analysis.checkedChunks,
    suspectChunks: article.analysis.suspectChunks,
    highRiskChunks: article.analysis.highRiskChunks,
    executiveSummary: article.analysis.executiveSummary,
    priorityActions: article.analysis.priorityActions,
    gptBrief: article.analysis.gptBrief,
    supportSources: article.analysis.supportSources,
    supportContext: article.analysis.supportContext,
    matches: article.analysis.matches.map((match) => ({
      sourceTitle: match.sourceTitle,
      sourceSlug: match.sourceSlug,
      sourceHierarchy: match.sourceHierarchy ?? null,
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

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function SiloCannibalizationPanel({ silo }: SiloCannibalizationPanelProps) {
  const [filter, setFilter] = useState<RiskFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<SiloInternalScan | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const articles = useMemo(() => {
    const list = scan?.articles ?? [];
    const filtered = filter === "all" ? list : list.filter((article) => article.analysis.riskLevel === filter);
    return [...filtered].sort((a, b) => {
      const riskRank = { high: 0, medium: 1, low: 2 };
      const riskDiff = riskRank[a.analysis.riskLevel] - riskRank[b.analysis.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      const scoreDiff = a.analysis.uniquenessScore - b.analysis.uniquenessScore;
      if (scoreDiff !== 0) return scoreDiff;
      const aPosition = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
      const bPosition = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
      if (aPosition !== bPosition) return aPosition - bPosition;
      return a.title.localeCompare(b.title);
    });
  }, [filter, scan]);

  const reportText = useMemo(() => {
    if (!scan) return "";
    return buildInternalDuplicationSiloReport({
      siloName: scan.silo.name,
      siloSlug: scan.silo.slug,
      articles: scan.articles.map(mapReportArticle),
    });
  }, [scan]);

  const executiveReportText = useMemo(() => {
    if (!scan) return "";
    return buildInternalDuplicationExecutiveReport({
      siloName: scan.silo.name,
      siloSlug: scan.silo.slug,
      articles: scan.articles.map(mapReportArticle),
    });
  }, [scan]);

  const gptBriefText = useMemo(() => {
    if (!scan) return "";
    return buildInternalDuplicationGptBrief({
      siloName: scan.silo.name,
      siloSlug: scan.silo.slug,
      articles: scan.articles.map(mapReportArticle),
    });
  }, [scan]);

  const priorityPairs = useMemo(() => {
    if (!scan) return [];
    const map = new Map<
      string,
      {
        article: SiloInternalArticle;
        pair: SiloArticlePair;
      }
    >();

    scan.articles.forEach((article) => {
      (article.analysis.articlePairs ?? []).forEach((pair) => {
        if (pair.editorialSeverity === "ok") return;
        const key = [article.slug, pair.sourceSlug].sort().join("::");
        const current = map.get(key);
        if (
          !current ||
          pair.editorialSeverity === "rewrite_before_publish" ||
          pair.highRiskCount > current.pair.highRiskCount ||
          pair.maxScore > current.pair.maxScore
        ) {
          map.set(key, { article, pair });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => {
        const rank = { rewrite_before_publish: 0, monitor: 1, ok: 2 };
        const severityDiff = rank[a.pair.editorialSeverity] - rank[b.pair.editorialSeverity];
        if (severityDiff !== 0) return severityDiff;
        if (b.pair.highRiskCount !== a.pair.highRiskCount) return b.pair.highRiskCount - a.pair.highRiskCount;
        return b.pair.maxScore - a.pair.maxScore;
      })
      .slice(0, 5);
  }, [scan]);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    setCopyStatus(null);

    try {
      const response = await fetch("/api/seo/internal-duplication/silo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siloId: silo.id, maxMatches: 10 }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.message || json?.error || "Falha ao escanear duplicacao interna do silo.");
        setScan(null);
        return;
      }

      setScan({
        silo: json.silo,
        articles: Array.isArray(json.articles) ? json.articles : [],
        totals: json.totals ?? { articles: 0, suspectChunks: 0, highRiskChunks: 0 },
      });
    } catch (scanError: any) {
      setError(scanError?.message || "Falha ao escanear duplicacao interna do silo.");
      setScan(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = async (value: string, message: string) => {
    if (!value) return;
    setCopyStatus(null);
    try {
      await copyText(value);
      setCopyStatus(message);
    } catch {
      setCopyStatus("Nao foi possivel copiar automaticamente.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runScan}
          disabled={loading}
          className="admin-button-primary text-[11px] disabled:opacity-50"
        >
          <Search size={14} />
          {loading ? "Escaneando silo..." : "Escanear duplicacao interna do silo"}
        </button>

        <button
          type="button"
          onClick={() => handleCopyText(gptBriefText, "Resumo para GPT copiado.")}
          disabled={!scan || loading}
          className="admin-button-soft text-[11px] disabled:opacity-50"
        >
          <Clipboard size={14} />
          Copiar para GPT
        </button>

        <button
          type="button"
          onClick={() => handleCopyText(executiveReportText, "Resumo executivo copiado.")}
          disabled={!scan || loading}
          className="admin-button-soft text-[11px] disabled:opacity-50"
        >
          <Clipboard size={14} />
          Resumo executivo
        </button>

        <button
          type="button"
          onClick={() => handleCopyText(reportText, "Relatorio completo copiado.")}
          disabled={!scan || loading}
          className="admin-button-soft text-[11px] disabled:opacity-50"
        >
          <Clipboard size={14} />
          Relatorio completo
        </button>

        {(["all", "high", "medium", "low"] as RiskFilter[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setFilter(level)}
            className={`rounded-md border px-3 py-1 text-[10px] uppercase ${
              filter === level
                ? "border-(--brand-hot) bg-(--surface) text-(--brand-hot)"
                : "border-(--border) text-(--muted)"
            }`}
          >
            {level === "all" ? "todos" : level}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-[color:var(--admin-danger)] bg-(--admin-danger-soft) p-2 text-[11px] text-(--admin-danger)">
          {error}
        </div>
      ) : null}

      {copyStatus ? (
        <div className="rounded-md border border-(--border) bg-(--surface-muted) p-2 text-[11px] text-(--muted)">
          {copyStatus}
        </div>
      ) : null}

      {!scan ? (
        <div className="rounded-md border border-dashed border-(--border) bg-(--surface) p-6 text-sm text-(--muted)">
          Rode o scan interno para comparar todos os artigos deste silo e gerar um relatorio copiavel.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="admin-kpi">
            <div className="admin-kpi-label">Artigos analisados</div>
            <div className="admin-kpi-value mt-2 text-xl">{scan.totals.articles}</div>
          </div>
          <div className="admin-kpi">
            <div className="admin-kpi-label">Trechos suspeitos</div>
            <div className="admin-kpi-value mt-2 text-xl">{scan.totals.suspectChunks}</div>
          </div>
          <div className="admin-kpi">
            <div className="admin-kpi-label">Alto risco</div>
            <div className="admin-kpi-value mt-2 text-xl">{scan.totals.highRiskChunks}</div>
          </div>
        </div>
      )}

      {scan && priorityPairs.length > 0 ? (
        <div className="admin-subpane space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase text-(--muted)">Pares prioritarios</div>
              <div className="text-[10px] text-(--muted)">Top 5 conflitos reais para revisar antes dos trechos tecnicos.</div>
            </div>
            <span className="rounded border border-(--border) px-2 py-1 text-[10px] text-(--muted)">
              {priorityPairs.length} par(es)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-left text-[11px]">
              <thead className="text-[10px] uppercase text-(--muted)">
                <tr>
                  <th className="px-2">Status</th>
                  <th className="px-2">Artigo atual</th>
                  <th className="px-2">Comparado com</th>
                  <th className="px-2">Diagnostico</th>
                  <th className="px-2">Acao</th>
                  <th className="px-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {priorityPairs.map(({ article, pair }) => (
                  <tr key={`${article.postId}-${pair.sourcePostId}`} className="bg-(--surface)">
                    <td className="rounded-l-md border-y border-l border-(--border) px-2 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${matchSeverityTone(pair.editorialSeverity)}`}>
                        {pair.editorialSeverity === "rewrite_before_publish" ? "reescrever" : "monitorar"}
                      </span>
                    </td>
                    <td className="border-y border-(--border) px-2 py-2">
                      <div className="font-semibold text-(--text)">{article.title}</div>
                      <div className="font-mono text-[10px] text-(--muted)">/{article.slug}</div>
                    </td>
                    <td className="border-y border-(--border) px-2 py-2">
                      <div className="font-semibold text-(--brand-hot)">{pair.sourceTitle}</div>
                      <div className="font-mono text-[10px] text-(--muted)">/{pair.sourceSlug}</div>
                    </td>
                    <td className="border-y border-(--border) px-2 py-2">
                      <div className="font-semibold text-(--text)">{pair.matchLabel}</div>
                      <div className="text-[10px] text-(--muted)">{pair.matchCount} match(es), {pair.highRiskCount} alto risco</div>
                    </td>
                    <td className="border-y border-(--border) px-2 py-2">
                      <div className="font-semibold text-(--text)">{pair.actionLabel}</div>
                      <div className="line-clamp-2 text-[10px] text-(--muted)">{pair.reason}</div>
                    </td>
                    <td className="rounded-r-md border-y border-r border-(--border) px-2 py-2 text-right font-semibold text-(--text)">
                      {(pair.maxScore * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {scan && articles.length === 0 ? (
        <div className="rounded-md border border-dashed border-(--border) p-6 text-sm text-(--muted)">
          Nenhum artigo neste filtro.
        </div>
      ) : null}

      {articles.length > 0 ? (
        <div className="space-y-3">
          {articles.map((article) => (
            <article key={article.postId} className="admin-subpane space-y-3 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-[rgba(64,209,219,0.28)] bg-[rgba(64,209,219,0.08)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-(--brand-hot)">
                      {article.hierarchy}
                    </span>
                    <span className={`rounded px-2 py-1 text-[9px] font-semibold uppercase ${riskBadge(article.analysis.riskLevel)}`}>
                      {riskLabel(article.analysis.riskLevel)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-(--text)">{article.title}</h3>
                  <div className="mt-1 break-all font-mono text-[11px] text-(--muted)">/{article.slug}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${scoreTone(article.analysis.uniquenessScore)}`}>
                    {article.analysis.uniquenessScore}%
                  </div>
                  <div className="text-[10px] uppercase text-(--muted)">pontuacao interna</div>
                </div>
              </div>

              <div className="grid gap-2 text-[10px] text-(--muted) sm:grid-cols-4">
                <span>Comparados: {article.analysis.comparedPosts}</span>
                <span>Trechos: {article.analysis.checkedChunks}</span>
                <span>Suspeitos: {article.analysis.suspectChunks}</span>
                <span>Alto risco: {article.analysis.highRiskChunks}</span>
              </div>

              <div className={`rounded-md border p-2 text-[11px] ${executiveTone(article.analysis.executiveSummary?.status)}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold uppercase">{article.analysis.executiveSummary?.label ?? riskLabel(article.analysis.riskLevel)}</span>
                  <span>{article.analysis.priorityActions?.length ?? 0} acao(oes)</span>
                </div>
                <div className="mt-1 text-(--text)">
                  {article.analysis.executiveSummary?.mainIssue ?? article.analysis.summary}
                </div>
                <div className="mt-1 text-[10px] text-(--muted)">
                  {article.analysis.executiveSummary?.nextAction ?? "Revise os trechos prioritarios."}
                </div>
              </div>

              {article.analysis.priorityActions?.length ? (
                <div className="grid gap-2 md:grid-cols-3">
                  {article.analysis.priorityActions.slice(0, 3).map((action) => (
                    <div key={action.id} className="rounded-md border border-(--border) bg-(--surface) p-2 text-[10px]">
                      <div className={`inline-flex rounded px-1.5 py-0.5 font-semibold uppercase ${matchSeverityTone(action.severity)}`}>
                        {action.label}
                      </div>
                      <div className="mt-1 font-semibold text-(--text)">{action.comparedTitle}</div>
                      <div className="mt-1 line-clamp-2 text-(--muted)">{action.reason}</div>
                      {action.differentiationInstruction ? (
                        <div className="mt-2 line-clamp-2 rounded border border-(--border) bg-(--surface-muted) p-2 text-(--muted)">
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

              {actionableMatches(article).length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase text-(--muted)">Trechos tecnicos prioritarios</div>
                  {actionableMatches(article).map((match, index) => (
                    <div key={`${match.sourcePostId}-${index}`} className="rounded-md border border-(--border) bg-(--surface) p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${matchSeverityTone(match.editorialSeverity)}`}>
                            {match.matchLabel ?? `${(match.similarityScore * 100).toFixed(0)}%`}
                          </span>
                          {match.sourceHierarchy ? (
                            <span className="rounded border border-(--border) px-1.5 py-0.5 text-[9px] uppercase text-(--muted)">
                              {match.sourceHierarchy}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-(--muted)">
                          {(match.similarityScore * 100).toFixed(0)}% | {match.actionLabel ?? "Revisar"}
                        </span>
                      </div>

                      <a
                        href={`/admin/editor/${match.sourcePostId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-(--brand-hot) hover:underline"
                        title={match.sourceTitle}
                      >
                        {match.sourceTitle}
                        <ExternalLink size={11} />
                      </a>
                      <div className="mt-1 break-all font-mono text-[10px] text-(--muted)">/{match.sourceSlug}</div>
                      {match.actionReason ? (
                        <div className="mt-2 rounded-md border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted)">
                          {match.actionReason}
                        </div>
                      ) : null}
                      {match.differentiationInstruction ? (
                        <div className="mt-2 rounded-md border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted)">
                          {match.differentiationInstruction}
                        </div>
                      ) : null}
                      {match.sourceGuidance ? (
                        <div className="mt-1 line-clamp-1 text-[9px] text-(--muted-2)">Base: {match.sourceGuidance}</div>
                      ) : null}

                      <div className="mt-3 grid gap-2 lg:grid-cols-2">
                        <div className="rounded-md border border-(--border) bg-(--surface-muted) p-2">
                          <div className="mb-1 text-[9px] font-semibold uppercase text-(--muted)">Trecho neste artigo</div>
                          <p className="text-[11px] leading-relaxed text-(--text)">{match.chunkText}</p>
                        </div>
                        <div className="rounded-md border border-(--border) bg-(--surface-muted) p-2">
                          <div className="mb-1 text-[9px] font-semibold uppercase text-(--muted)">Trecho parecido</div>
                          <p className="text-[11px] leading-relaxed text-(--text)">{match.sourceExcerpt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-[rgba(41,94,82,0.18)] bg-(--admin-positive-soft) p-2 text-[11px] text-(--admin-positive)">
                  Nenhum trecho prioritario para reescrita. Sobreposicoes baixas foram ocultadas do fluxo principal.
                </div>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
