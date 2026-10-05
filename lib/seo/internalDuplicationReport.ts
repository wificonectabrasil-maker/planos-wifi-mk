export type DuplicationRiskLevel = "low" | "medium" | "high";
export type DuplicationEditorialSeverity = "ok" | "monitor" | "rewrite_before_publish";
export type DuplicationMatchType =
  | "copy_overlap"
  | "shared_template"
  | "keyword_overlap"
  | "intent_conflict"
  | "acceptable_silo_overlap";

export type InternalDuplicationExecutiveSummaryReport = {
  status: "ok" | "publish_now" | "monitor" | "rewrite_before_publish";
  label: string;
  mainIssue: string;
  nextAction: string;
  topProblems: string[];
};

export type InternalDuplicationPriorityActionReport = {
  id: string;
  label: string;
  severity: DuplicationEditorialSeverity;
  matchType: DuplicationMatchType;
  reason: string;
  currentExcerpt: string;
  comparedTitle: string;
  comparedSlug: string;
  similarityScore: number;
  sourceGuidance?: string;
  differentiationInstruction?: string;
};

export type InternalDuplicationReportMatch = {
  sourceTitle: string;
  sourceSlug: string;
  sourceHierarchy?: string | null;
  chunkText: string;
  sourceExcerpt: string;
  similarityScore: number;
  overlapTokens: number;
  riskLevel: DuplicationRiskLevel;
  matchType?: DuplicationMatchType;
  matchLabel?: string;
  editorialSeverity?: DuplicationEditorialSeverity;
  actionLabel?: string;
  actionReason?: string;
  sourceGuidance?: string;
  acceptableOverlapReason?: string;
  differentiationInstruction?: string;
  alternatives?: string[];
};

export type InternalDuplicationReportArticle = {
  title: string;
  slug: string;
  hierarchy?: string | null;
  uniquenessScore: number;
  riskLevel: DuplicationRiskLevel;
  summary: string;
  comparedPosts: number;
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  matches: InternalDuplicationReportMatch[];
  executiveSummary?: InternalDuplicationExecutiveSummaryReport;
  priorityActions?: InternalDuplicationPriorityActionReport[];
  gptBrief?: string;
  supportSources?: Array<{ title: string; guidance: string; url?: string; localPath?: string }>;
  supportContext?: string;
  stale?: boolean;
};

type BuildEditorReportArgs = {
  generatedAt?: Date;
  scopeLabel: string;
  article: InternalDuplicationReportArticle;
};

type BuildSiloReportArgs = {
  generatedAt?: Date;
  siloName: string;
  siloSlug: string;
  articles: InternalDuplicationReportArticle[];
};

function pct(score: number) {
  return `${Math.round(score * 100)}%`;
}

function riskLabel(level: DuplicationRiskLevel) {
  if (level === "high") return "alto";
  if (level === "medium") return "medio";
  return "baixo";
}

function formatDate(value: Date) {
  return value.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function articleHeading(article: InternalDuplicationReportArticle) {
  const hierarchy = article.hierarchy ? `${article.hierarchy} - ` : "";
  return `${hierarchy}${article.title} (/${article.slug})`;
}

function topActionableMatches(article: InternalDuplicationReportArticle, limit = 5) {
  const severityRank: Record<DuplicationEditorialSeverity, number> = {
    rewrite_before_publish: 0,
    monitor: 1,
    ok: 2,
  };

  return [...article.matches]
    .filter((match) => (match.editorialSeverity ?? (match.riskLevel === "low" ? "ok" : "monitor")) !== "ok")
    .sort((a, b) => {
      const aSeverity = a.editorialSeverity ?? (a.riskLevel === "high" ? "rewrite_before_publish" : "monitor");
      const bSeverity = b.editorialSeverity ?? (b.riskLevel === "high" ? "rewrite_before_publish" : "monitor");
      const severityDiff = severityRank[aSeverity] - severityRank[bSeverity];
      if (severityDiff !== 0) return severityDiff;
      return b.similarityScore - a.similarityScore;
    })
    .slice(0, limit);
}

function fallbackExecutiveSummary(article: InternalDuplicationReportArticle): InternalDuplicationExecutiveSummaryReport {
  if (article.highRiskChunks > 0) {
    return {
      status: "rewrite_before_publish",
      label: "Reescrever antes",
      mainIssue: `${article.highRiskChunks} trecho(s) de alto risco.`,
      nextAction: "Reescrever os trechos prioritarios antes de publicar.",
      topProblems: topActionableMatches(article, 3).map((match) => `${match.sourceTitle} (${pct(match.similarityScore)})`),
    };
  }

  if (article.suspectChunks > 0) {
    return {
      status: "monitor",
      label: "Monitorar",
      mainIssue: article.summary,
      nextAction: "Revisar somente os matches mais altos e ignorar sobreposicoes naturais do silo.",
      topProblems: topActionableMatches(article, 3).map((match) => `${match.sourceTitle} (${pct(match.similarityScore)})`),
    };
  }

  return {
    status: "ok",
    label: "OK",
    mainIssue: "Sem duplicacao interna relevante.",
    nextAction: "Nenhuma acao editorial urgente.",
    topProblems: [],
  };
}

function compactExcerpt(value: string, words = 28) {
  const parts = value.split(/\s+/).filter(Boolean);
  const suffix = parts.length > words ? "..." : "";
  return `${parts.slice(0, words).join(" ")}${suffix}`;
}

function appendArticleReport(lines: string[], article: InternalDuplicationReportArticle) {
  lines.push(`## ${articleHeading(article)}`);
  lines.push(`- Risco: ${riskLabel(article.riskLevel)}`);
  lines.push(`- Pontuacao interna: ${article.uniquenessScore}%`);
  lines.push(`- Comparados: ${article.comparedPosts}`);
  lines.push(`- Trechos analisados: ${article.checkedChunks}`);
  lines.push(`- Trechos suspeitos: ${article.suspectChunks}`);
  lines.push(`- Trechos de alto risco: ${article.highRiskChunks}`);
  if (article.stale) {
    lines.push("- Observacao: o texto mudou depois do ultimo scan; rode novamente antes de publicar.");
  }
  lines.push(`- Resumo: ${article.summary}`);
  lines.push("");

  if (!article.matches.length) {
    lines.push("Nenhum trecho similar relevante encontrado.");
    lines.push("");
    return;
  }

  article.matches.forEach((match, index) => {
    const sourceHierarchy = match.sourceHierarchy ? `${match.sourceHierarchy} - ` : "";
    lines.push(`### Match ${index + 1}: ${pct(match.similarityScore)} (${riskLabel(match.riskLevel)})`);
    lines.push(`- Artigo comparado: ${sourceHierarchy}${match.sourceTitle} (/${match.sourceSlug})`);
    lines.push(`- Tokens em comum: ${match.overlapTokens}`);
    if (match.matchLabel || match.actionLabel) {
      lines.push(`- Diagnostico: ${match.matchLabel ?? riskLabel(match.riskLevel)}`);
      lines.push(`- Acao recomendada: ${match.actionLabel ?? "Revisar"}${match.actionReason ? ` - ${match.actionReason}` : ""}`);
    }
    if (match.differentiationInstruction) {
      lines.push(`- Instrucao editorial: ${match.differentiationInstruction}`);
    }
    if (match.acceptableOverlapReason) {
      lines.push(`- Motivo para aceitar sobreposicao: ${match.acceptableOverlapReason}`);
    }
    if (match.sourceGuidance) {
      lines.push(`- Base aplicada: ${match.sourceGuidance}`);
    }
    lines.push(`- Trecho neste artigo: ${match.chunkText}`);
    lines.push(`- Trecho parecido: ${match.sourceExcerpt}`);
    if (match.alternatives?.length) {
      lines.push("- Sugestoes:");
      match.alternatives.slice(0, 2).forEach((item) => {
        lines.push(`  - ${item}`);
      });
    } else {
      lines.push("- Sugestao: diferenciar a intencao, reescrever o trecho, mover a secao ou criar link interno quando os artigos forem complementares.");
    }
    lines.push("");
  });
}

export function buildInternalDuplicationEditorReport({
  generatedAt = new Date(),
  scopeLabel,
  article,
}: BuildEditorReportArgs) {
  const lines = [
    "# Relatorio de duplicacao interna",
    "",
    `Gerado em: ${formatDate(generatedAt)}`,
    `Escopo: ${scopeLabel}`,
    "",
  ];

  appendArticleReport(lines, article);
  return lines.join("\n").trim();
}

function appendExecutiveArticle(lines: string[], article: InternalDuplicationReportArticle) {
  const executive = article.executiveSummary ?? fallbackExecutiveSummary(article);
  lines.push(`## ${articleHeading(article)}`);
  lines.push(`- Status: ${executive.label}`);
  lines.push(`- Pontuacao interna: ${article.uniquenessScore}%`);
  lines.push(`- Problema principal: ${executive.mainIssue}`);
  lines.push(`- Proxima acao: ${executive.nextAction}`);

  const priorityActions = article.priorityActions?.length
    ? article.priorityActions.slice(0, 3)
    : topActionableMatches(article, 3).map((match, index) => ({
        id: `${article.slug}-${index}`,
        label: match.actionLabel ?? "Revisar",
        severity: match.editorialSeverity ?? (match.riskLevel === "high" ? "rewrite_before_publish" : "monitor"),
        matchType: match.matchType ?? "acceptable_silo_overlap",
        reason: match.actionReason ?? "Diferenciar narrativa e exemplo.",
        currentExcerpt: match.chunkText,
        comparedTitle: match.sourceTitle,
        comparedSlug: match.sourceSlug,
        similarityScore: match.similarityScore,
        sourceGuidance: match.sourceGuidance,
        differentiationInstruction: match.differentiationInstruction,
      }));

  if (priorityActions.length) {
    lines.push("- Acoes prioritarias:");
    priorityActions.forEach((action, index) => {
      lines.push(`  ${index + 1}. ${action.label}: ${action.comparedTitle} (${pct(action.similarityScore)}) - ${action.reason}`);
      if (action.differentiationInstruction) {
        lines.push(`     Instrucao: ${action.differentiationInstruction}`);
      }
    });
  } else {
    lines.push("- Acoes prioritarias: nenhuma.");
  }
  lines.push("");
}

export function buildInternalDuplicationExecutiveReport(args: BuildEditorReportArgs | BuildSiloReportArgs) {
  const generatedAt = args.generatedAt ?? new Date();
  const lines = ["# Resumo executivo de duplicacao interna", "", `Gerado em: ${formatDate(generatedAt)}`];

  if ("article" in args) {
    lines.push(`Escopo: ${args.scopeLabel}`, "");
    appendExecutiveArticle(lines, args.article);
    return lines.join("\n").trim();
  }

  const articles = [...args.articles].sort((a, b) => {
    const aSummary = a.executiveSummary ?? fallbackExecutiveSummary(a);
    const bSummary = b.executiveSummary ?? fallbackExecutiveSummary(b);
    const rank = { rewrite_before_publish: 0, monitor: 1, publish_now: 2, ok: 3 };
    const diff = rank[aSummary.status] - rank[bSummary.status];
    if (diff !== 0) return diff;
    return a.uniquenessScore - b.uniquenessScore;
  });
  const rewrite = articles.filter((article) => (article.executiveSummary ?? fallbackExecutiveSummary(article)).status === "rewrite_before_publish").length;
  const monitor = articles.filter((article) => (article.executiveSummary ?? fallbackExecutiveSummary(article)).status === "monitor").length;

  lines.push(`Silo: ${args.siloName} (/${args.siloSlug})`);
  lines.push(`Artigos analisados: ${articles.length}`);
  lines.push(`Prioridade: ${rewrite} reescrever antes, ${monitor} monitorar.`);
  lines.push("");

  articles.slice(0, 5).forEach((article) => appendExecutiveArticle(lines, article));
  return lines.join("\n").trim();
}

export function buildInternalDuplicationGptBrief(args: BuildEditorReportArgs | BuildSiloReportArgs) {
  if ("article" in args) {
    if (args.article.gptBrief) return args.article.gptBrief;
    const executive = args.article.executiveSummary ?? fallbackExecutiveSummary(args.article);
    const matches = topActionableMatches(args.article, 5);
    const lines = [
      "# Brief compacto para GPT - duplicacao interna",
      "",
      `Artigo: ${args.article.title} (/${args.article.slug})`,
      `Status: ${executive.label}`,
      `Problema principal: ${executive.mainIssue}`,
      `Proxima acao: ${executive.nextAction}`,
      "",
      "Instrucoes:",
      "- Reescreva somente os trechos abaixo.",
      "- Preserve a intencao unica do artigo.",
      "- Diferencie exemplos, metaforas, ordem dos passos e promessa editorial.",
      "- Preserve contexto local necessario; nao apague Google Business Profile, NAP, reputacao ou localidade quando forem relevantes.",
      "- Se o trecho pertencer melhor ao artigo comparado, sugira mover/resumir e criar link interno em vez de desenvolver tudo aqui.",
      "- Se for apoio sem concorrencia, mantenha contexto curto e linke para aprofundamento.",
      "",
    ];
    if (args.article.supportSources?.length) {
      lines.push("Base curada aplicada:");
      args.article.supportSources.slice(0, 4).forEach((source) => {
        lines.push(`- ${source.title}: ${source.guidance}`);
      });
      lines.push("");
    }

    matches.forEach((match, index) => {
      lines.push(`${index + 1}. ${match.matchLabel ?? riskLabel(match.riskLevel)} - ${match.actionLabel ?? "Revisar"}`);
      lines.push(`Comparado com: ${match.sourceTitle} (/${match.sourceSlug})`);
      lines.push(`Atual: ${compactExcerpt(match.chunkText)}`);
      lines.push(`Parecido: ${compactExcerpt(match.sourceExcerpt)}`);
      if (match.actionReason) lines.push(`Acao: ${match.actionReason}`);
      if (match.differentiationInstruction) lines.push(`Instrucao: ${match.differentiationInstruction}`);
    });

    return lines.join("\n").trim().slice(0, 3400);
  }

  const articles = [...args.articles]
    .filter((article) => (article.priorityActions?.length ?? topActionableMatches(article, 1).length) > 0)
    .sort((a, b) => a.uniquenessScore - b.uniquenessScore)
    .slice(0, 5);

  const lines = [
    "# Brief compacto para GPT - canibalizacao do silo",
    "",
    `Silo: ${args.siloName} (/${args.siloSlug})`,
    "Objetivo: reescrever apenas os conflitos prioritarios, preservando a hierarquia pilar/suporte e os links internos.",
    "Regras: preservar contexto local necessario, mover/linkar quando o bloco pertencer melhor a outro artigo e diferenciar intencao antes de reescrever em volume.",
    "",
  ];

  articles.forEach((article, index) => {
    const executive = article.executiveSummary ?? fallbackExecutiveSummary(article);
    lines.push(`${index + 1}. ${articleHeading(article)}`);
    lines.push(`Status: ${executive.label}`);
    lines.push(`Acao: ${executive.nextAction}`);
    topActionableMatches(article, 1).forEach((match) => {
      lines.push(`Comparado com: ${match.sourceTitle} (/${match.sourceSlug})`);
      lines.push(`Atual: ${compactExcerpt(match.chunkText, 22)}`);
      lines.push(`Parecido: ${compactExcerpt(match.sourceExcerpt, 22)}`);
      if (match.differentiationInstruction) lines.push(`Instrucao: ${match.differentiationInstruction}`);
    });
    lines.push("");
  });

  return lines.join("\n").trim().slice(0, 4200);
}

export function buildInternalDuplicationSiloReport({
  generatedAt = new Date(),
  siloName,
  siloSlug,
  articles,
}: BuildSiloReportArgs) {
  const high = articles.filter((article) => article.riskLevel === "high").length;
  const medium = articles.filter((article) => article.riskLevel === "medium").length;
  const low = articles.filter((article) => article.riskLevel === "low").length;
  const suspects = articles.reduce((sum, article) => sum + article.suspectChunks, 0);

  const lines = [
    "# Relatorio de canibalizacao interna do silo",
    "",
    `Gerado em: ${formatDate(generatedAt)}`,
    `Silo: ${siloName} (/${siloSlug})`,
    `Artigos analisados: ${articles.length}`,
    `Riscos: ${high} alto(s), ${medium} medio(s), ${low} baixo(s)`,
    `Trechos suspeitos no silo: ${suspects}`,
    "",
  ];

  if (!articles.length) {
    lines.push("Nenhum artigo analisado.");
    return lines.join("\n").trim();
  }

  articles.forEach((article) => appendArticleReport(lines, article));
  return lines.join("\n").trim();
}
