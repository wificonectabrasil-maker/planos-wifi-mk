import { extractPlainTextForAnalysis } from "@/lib/seo/plagiarism";
import {
  buildSemanticFoundationDiagnostics,
  normalizePtBr,
  tokenizePtBr,
} from "@/lib/seo/semanticFoundation";
import { buildDuplicationSupportContext } from "@/lib/editorial/drive-support";

export type DuplicateRiskLevel = "low" | "medium" | "high";
export type DuplicateMatchType =
  | "copy_overlap"
  | "shared_template"
  | "keyword_overlap"
  | "intent_conflict"
  | "acceptable_silo_overlap";
export type EditorialSeverity = "ok" | "monitor" | "rewrite_before_publish";
export type DuplicationRecommendedAction =
  | "rewrite"
  | "differentiate_angle"
  | "move_section"
  | "link"
  | "ignore";
export type DuplicationExecutiveStatus = "ok" | "publish_now" | "monitor" | "rewrite_before_publish";

export type InternalDuplicateMatch = {
  chunkText: string;
  similarityScore: number;
  overlapTokens: number;
  riskLevel: DuplicateRiskLevel;
  matchType: DuplicateMatchType;
  matchLabel: string;
  editorialSeverity: EditorialSeverity;
  recommendedAction: DuplicationRecommendedAction;
  actionLabel: string;
  actionReason: string;
  sourcePostId: string;
  sourceTitle: string;
  sourceSlug: string;
  sourceExcerpt: string;
  sourceGuidance?: string;
  acceptableOverlapReason?: string;
  differentiationInstruction?: string;
  alternatives: string[];
};

export type InternalDuplicationPriorityAction = {
  id: string;
  label: string;
  severity: EditorialSeverity;
  recommendedAction: DuplicationRecommendedAction;
  matchType: DuplicateMatchType;
  reason: string;
  currentExcerpt: string;
  comparedTitle: string;
  comparedSlug: string;
  similarityScore: number;
  sourceGuidance?: string;
  differentiationInstruction?: string;
};

export type InternalDuplicationArticlePair = {
  pairKey: string;
  sourcePostId: string;
  sourceTitle: string;
  sourceSlug: string;
  matchCount: number;
  highRiskCount: number;
  maxScore: number;
  matchType: DuplicateMatchType;
  matchLabel: string;
  editorialSeverity: EditorialSeverity;
  recommendedAction: DuplicationRecommendedAction;
  actionLabel: string;
  reason: string;
  topMatch: InternalDuplicateMatch;
};

export type InternalDuplicationExecutiveSummary = {
  status: DuplicationExecutiveStatus;
  label: string;
  mainIssue: string;
  nextAction: string;
  topProblems: string[];
};

export type InternalDuplicateAnalysis = {
  uniquenessScore: number;
  riskLevel: DuplicateRiskLevel;
  totalWords: number;
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  comparedPosts: number;
  summary: string;
  executiveSummary: InternalDuplicationExecutiveSummary;
  priorityActions: InternalDuplicationPriorityAction[];
  articlePairs: InternalDuplicationArticlePair[];
  gptBrief: string;
  supportSources: Array<{ title: string; guidance: string; url?: string; localPath?: string }>;
  supportContext: string;
  semanticDiagnostics?: ReturnType<typeof buildSemanticFoundationDiagnostics>;
  matches: InternalDuplicateMatch[];
};

type DuplicationSupportContext = ReturnType<typeof buildDuplicationSupportContext>;

type CandidateInput = {
  id: string;
  title: string;
  slug: string;
  targetKeyword?: string | null;
  focusKeyword?: string | null;
  contentHtml?: string | null;
  contentJson?: any;
  text?: string | null;
};

type TextWindow = {
  text: string;
  tokens: string[];
};

type CandidateWindows = {
  postId: string;
  postTitle: string;
  postSlug: string;
  targetKeyword?: string | null;
  focusKeyword?: string | null;
  windows: TextWindow[];
};

type ComparisonScope = "silo" | "site";

const MIN_TOTAL_WORDS = 80;
const MIN_WORD_LEN = 3;
const MIN_CHUNK_WORDS = 8;
const SOURCE_MIN_WORDS = 50;
const CURRENT_CHUNK_WORDS = 18;
const CURRENT_CHUNK_STEP = 11;
const SOURCE_CHUNK_WORDS = 22;
const SOURCE_CHUNK_STEP = 12;
const MAX_CURRENT_WINDOWS = 140;
const MAX_SOURCE_WINDOWS_PER_POST = 180;

function normalizeText(value: string) {
  return normalizePtBr(value);
}

function tokenize(value: string) {
  return tokenizePtBr(value, {
    minLen: MIN_WORD_LEN,
    removeStopWords: true,
    stem: true,
  });
}

function jaccard(tokensA: string[], tokensB: string[]) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });

  const union = setA.size + setB.size - intersection;
  if (!union) return 0;
  return intersection / union;
}

function overlapCoverage(tokensA: string[], tokensB: string[]) {
  const base = Array.from(new Set(tokensA));
  if (!base.length) return { overlap: 0, ratio: 0 };
  const setB = new Set(tokensB);
  let overlap = 0;
  base.forEach((token) => {
    if (setB.has(token)) overlap += 1;
  });
  return { overlap, ratio: overlap / base.length };
}

function classifyMatchRisk(score: number): DuplicateRiskLevel {
  if (score >= 0.72) return "high";
  if (score >= 0.58) return "medium";
  return "low";
}

function classifyGlobalRisk(uniquenessScore: number): DuplicateRiskLevel {
  if (uniquenessScore <= 45) return "high";
  if (uniquenessScore <= 70) return "medium";
  return "low";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function containsAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function firstTokens(value: string, count: number) {
  return normalizeText(value).split(" ").filter(Boolean).slice(0, count).join(" ");
}

function keywordOverlapRatio(currentKeyword?: string | null, sourceKeyword?: string | null) {
  const current = new Set(tokenize(currentKeyword ?? ""));
  const source = new Set(tokenize(sourceKeyword ?? ""));
  if (!current.size || !source.size) return 0;
  let overlap = 0;
  current.forEach((token) => {
    if (source.has(token)) overlap += 1;
  });
  return overlap / Math.max(1, Math.min(current.size, source.size));
}

function matchTypeLabel(type: DuplicateMatchType) {
  if (type === "copy_overlap") return "Texto quase igual";
  if (type === "shared_template") return "Mesma estrutura";
  if (type === "keyword_overlap") return "Keyword parecida";
  if (type === "intent_conflict") return "Canibalizacao real";
  return "Sobreposicao aceitavel";
}

function actionLabel(action: DuplicationRecommendedAction) {
  if (action === "rewrite") return "Reescrever";
  if (action === "differentiate_angle") return "Diferenciar angulo";
  if (action === "move_section") return "Mover trecho";
  if (action === "link") return "Linkar";
  return "Ignorar";
}

function actionRank(action: DuplicationRecommendedAction) {
  if (action === "rewrite") return 0;
  if (action === "differentiate_angle") return 1;
  if (action === "move_section") return 2;
  if (action === "link") return 3;
  return 4;
}

function severityRank(severity: EditorialSeverity) {
  if (severity === "rewrite_before_publish") return 0;
  if (severity === "monitor") return 1;
  return 2;
}

function classifyMatchType(args: {
  score: number;
  chunkText: string;
  sourceExcerpt: string;
  targetKeyword?: string | null;
  sourceKeyword?: string | null;
}): DuplicateMatchType {
  const chunk = normalizeText(args.chunkText);
  const source = normalizeText(args.sourceExcerpt);
  const sharedOpening = firstTokens(args.chunkText, 6);
  const openingIsCopied = sharedOpening.length > 18 && source.includes(sharedOpening);
  const templateSignals = [
    /\bpasso\s+a\s+passo\b/,
    /\bideal\s+para\b/,
    /\bprincipais\s+estrategias\b/,
    /\botimize\b/,
    /\b1\s+otimize\b/,
    /\bvitrine\s+iluminada\b/,
    /\bjogando\s+dinheiro\s+fora\b/,
  ];
  const sharedTemplate = containsAny(chunk, templateSignals) && containsAny(source, templateSignals);
  const kwOverlap = keywordOverlapRatio(args.targetKeyword, args.sourceKeyword);

  if (args.score >= 0.72 || openingIsCopied) return "copy_overlap";
  if (kwOverlap >= 0.7 && args.score >= 0.58) return "intent_conflict";
  if (sharedTemplate && args.score >= 0.56) return "shared_template";
  if (kwOverlap >= 0.45 && args.score >= 0.52) return "keyword_overlap";
  return "acceptable_silo_overlap";
}

function buildEditorialDecision(args: {
  matchType: DuplicateMatchType;
  score: number;
  riskLevel: DuplicateRiskLevel;
  sourceTitle: string;
  sourceKeyword?: string | null;
}) {
  if (args.matchType === "copy_overlap") {
    return {
      editorialSeverity: "rewrite_before_publish" as const,
      recommendedAction: "rewrite" as const,
      actionReason: "Trecho ou metafora aparece quase igual em outro artigo. Reescreva antes de publicar para reduzir duplicacao interna.",
    };
  }
  if (args.matchType === "intent_conflict") {
    return {
      editorialSeverity: args.riskLevel === "high" ? ("rewrite_before_publish" as const) : ("monitor" as const),
      recommendedAction: "differentiate_angle" as const,
      actionReason: `O trecho aproxima a intencao deste artigo de "${args.sourceTitle}". Diferencie promessa, H2 ou exemplo.`,
    };
  }
  if (args.matchType === "shared_template") {
    return {
      editorialSeverity: args.score >= 0.68 ? ("rewrite_before_publish" as const) : ("monitor" as const),
      recommendedAction: "differentiate_angle" as const,
      actionReason: "A estrutura do argumento se repete. Troque abertura, ordem dos passos ou exemplo pratico.",
    };
  }
  if (args.matchType === "keyword_overlap") {
    return {
      editorialSeverity: "monitor" as const,
      recommendedAction: "link" as const,
      actionReason: "Ha sobreposicao de termos, mas pode funcionar como apoio se houver link interno, angulo claro e papel de silo bem separado.",
    };
  }
  return {
    editorialSeverity: "ok" as const,
    recommendedAction: "ignore" as const,
    actionReason: "Assunto comum do silo; nao exige acao se a intencao do artigo estiver clara e o trecho apenas contextualizar.",
  };
}

function summarizeSupportSources(support: DuplicationSupportContext) {
  return support.sources.map((source) => ({
    title: source.title,
    guidance: source.guidance,
    url: source.url,
    localPath: source.localPath,
  }));
}

function buildSourceGuidance(support: DuplicationSupportContext) {
  return support.sources
    .slice(0, 3)
    .map((source) => source.title)
    .join(" | ");
}

function buildAcceptableOverlapReason(matchType: DuplicateMatchType) {
  if (matchType !== "acceptable_silo_overlap") return undefined;
  return "Sobreposicao aceitavel: o tema e comum ao silo e pode permanecer se nao disputar promessa, keyword principal ou resposta central do artigo comparado.";
}

function buildDifferentiationInstruction(args: {
  matchType: DuplicateMatchType;
  recommendedAction: DuplicationRecommendedAction;
  sourceTitle: string;
}) {
  if (args.recommendedAction === "rewrite") {
    return "Reescreva o trecho com nova abertura, exemplo proprio e ordem diferente, preservando a intencao unica do artigo atual.";
  }
  if (args.recommendedAction === "differentiate_angle") {
    return `Diferencie o angulo para nao competir com "${args.sourceTitle}": mude promessa editorial, caso de uso, localidade, servico ou etapa da jornada.`;
  }
  if (args.recommendedAction === "move_section") {
    return `Mover ou resumir o bloco se ele responder melhor ao artigo "${args.sourceTitle}", mantendo aqui apenas contexto e link interno.`;
  }
  if (args.recommendedAction === "link") {
    return `Use como apoio: mantenha contexto minimo e crie link para "${args.sourceTitle}" quando o aprofundamento pertencer ao artigo comparado.`;
  }
  if (args.matchType === "acceptable_silo_overlap") {
    return "Ignorar como sobreposicao aceitavel se o trecho for apenas contexto de silo; nao apagar SEO local necessario.";
  }
  return "Revisar somente se a intencao do artigo ficar ambigua.";
}

function buildWindows(input: string, windowWords: number, stepWords: number, maxWindows: number): TextWindow[] {
  const words = normalizeSpaces(input).split(" ").filter(Boolean);
  if (words.length < MIN_CHUNK_WORDS) return [];

  const out: TextWindow[] = [];
  for (let start = 0; start < words.length && out.length < maxWindows; start += stepWords) {
    const chunk = words.slice(start, start + windowWords);
    if (chunk.length < MIN_CHUNK_WORDS) continue;
    const text = chunk.join(" ");
    const tokens = tokenize(text);
    if (tokens.length < MIN_CHUNK_WORDS - 2) continue;
    out.push({ text, tokens });
  }

  return out;
}

function applySimpleSynonyms(value: string) {
  return value
    .replace(/\bmelhor\b/gi, "mais indicado")
    .replace(/\bimportante\b/gi, "essencial")
    .replace(/\bdeve\b/gi, "vale")
    .replace(/\bnecessario\b/gi, "fundamental")
    .replace(/\bajuda\b/gi, "contribui");
}

function shorten(value: string, words = 16) {
  return value.split(" ").filter(Boolean).slice(0, words).join(" ");
}

function buildAlternatives(chunkText: string, targetKeyword?: string | null) {
  const keyword = (targetKeyword || "").trim();
  const transformed = applySimpleSynonyms(chunkText);
  const short = shorten(transformed, 14);
  const focus = keyword || "tema central";

  return [
    `No contexto deste guia sobre ${focus}, priorize exemplo proprio: ${short}.`,
    `Troque a estrutura: comece pelo resultado pratico e depois explique o motivo com linguagem nova.`,
    `Mantenha a ideia, mas inclua um dado/teste proprio e evite repetir termos identicos do trecho original.`,
  ];
}

function buildSummary(args: {
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  uniquenessScore: number;
  comparedPosts: number;
  scope: ComparisonScope;
}) {
  const scopeLabel = args.scope === "site" ? "site" : "silo";
  const scopeLabelWithArticle = args.scope === "site" ? "do site" : "do silo";
  if (!args.comparedPosts) {
    return `Nao ha outros posts ${scopeLabelWithArticle} para comparar.`;
  }
  if (!args.checkedChunks) {
    return `Sem texto suficiente para comparar com os posts ${scopeLabelWithArticle}.`;
  }
  if (!args.suspectChunks) {
    return `Nao encontramos sobreposicao forte com outros posts ${scopeLabelWithArticle}.`;
  }
  if (args.highRiskChunks > 0) {
    return `${args.highRiskChunks} trecho(s) com risco alto de duplicacao interna no ${scopeLabel}. Reescreva antes de publicar.`;
  }
  if (args.uniquenessScore < 70) {
    return `Foram encontrados trechos muito parecidos com outros posts ${scopeLabelWithArticle}. Ajuste o angulo e exemplos.`;
  }
  return "Existe sobreposicao moderada. Diferencie narrativa e foco para reduzir canibalizacao.";
}

export function inspectInternalDuplication(args: {
  text: string;
  candidates: CandidateInput[];
  targetKeyword?: string | null;
  maxMatches?: number;
  scope?: ComparisonScope;
}): InternalDuplicateAnalysis {
  const text = normalizeSpaces(args.text || "");
  const scope = args.scope ?? "silo";
  const support = buildDuplicationSupportContext({
    title: args.targetKeyword ?? "artigo atual",
    keyword: args.targetKeyword ?? "",
    text,
  });
  const supportSources = summarizeSupportSources(support);
  const semanticDiagnostics = buildSemanticFoundationDiagnostics({
    text,
    keyword: args.targetKeyword ?? "",
    relatedTerms: [],
    entities: [],
  });
  const totalWords = text ? text.split(" ").filter(Boolean).length : 0;
  const maxMatches = clamp(Math.round(args.maxMatches ?? 10), 3, 20);

  const candidateWindows: CandidateWindows[] = (args.candidates || [])
    .map((candidate) => {
      const rawSourceText =
        candidate.text?.trim() ||
        extractPlainTextForAnalysis(candidate.contentHtml ?? null, candidate.contentJson) ||
        "";
      const sourceText = normalizeSpaces(rawSourceText);
      const sourceWords = sourceText ? sourceText.split(" ").filter(Boolean).length : 0;
      if (sourceWords < SOURCE_MIN_WORDS) return null;

      const windows = buildWindows(
        sourceText,
        SOURCE_CHUNK_WORDS,
        SOURCE_CHUNK_STEP,
        MAX_SOURCE_WINDOWS_PER_POST
      );
      if (!windows.length) return null;

      return {
        postId: candidate.id,
        postTitle: candidate.title,
        postSlug: candidate.slug,
        targetKeyword: candidate.targetKeyword ?? null,
        focusKeyword: candidate.focusKeyword ?? null,
        windows,
      } satisfies CandidateWindows;
    })
    .filter(Boolean) as CandidateWindows[];

  const comparedPosts = candidateWindows.length;
  if (!text || totalWords < MIN_TOTAL_WORDS) {
    const summary = buildSummary({
      checkedChunks: 0,
      suspectChunks: 0,
      highRiskChunks: 0,
      uniquenessScore: 100,
      comparedPosts,
      scope,
    });
    const executiveSummary = emptyExecutiveSummary(summary);
    return {
      uniquenessScore: 100,
      riskLevel: "low",
      totalWords,
      checkedChunks: 0,
      suspectChunks: 0,
      highRiskChunks: 0,
      comparedPosts,
      summary,
      executiveSummary,
      priorityActions: [],
      articlePairs: [],
      gptBrief: buildGptBrief({
        title: args.targetKeyword || "artigo atual",
        executiveSummary,
        priorityActions: [],
        matches: [],
        support,
      }),
      supportSources,
      supportContext: support.supportContext,
      semanticDiagnostics,
      matches: [],
    };
  }

  const currentChunks = buildWindows(text, CURRENT_CHUNK_WORDS, CURRENT_CHUNK_STEP, MAX_CURRENT_WINDOWS);
  if (!currentChunks.length || comparedPosts === 0) {
    const summary = buildSummary({
      checkedChunks: currentChunks.length,
      suspectChunks: 0,
      highRiskChunks: 0,
      uniquenessScore: 100,
      comparedPosts,
      scope,
    });
    const executiveSummary = emptyExecutiveSummary(summary);
    return {
      uniquenessScore: 100,
      riskLevel: "low",
      totalWords,
      checkedChunks: currentChunks.length,
      suspectChunks: 0,
      highRiskChunks: 0,
      comparedPosts,
      summary,
      executiveSummary,
      priorityActions: [],
      articlePairs: [],
      gptBrief: buildGptBrief({
        title: args.targetKeyword || "artigo atual",
        executiveSummary,
        priorityActions: [],
        matches: [],
        support,
      }),
      supportSources,
      supportContext: support.supportContext,
      semanticDiagnostics,
      matches: [],
    };
  }

  const rawMatches: InternalDuplicateMatch[] = [];
  for (const chunk of currentChunks) {
    let best: {
      score: number;
      overlapTokens: number;
      sourcePostId: string;
      sourceTitle: string;
      sourceSlug: string;
      sourceKeyword?: string | null;
      sourceExcerpt: string;
    } | null = null;

    for (const candidate of candidateWindows) {
      for (const sourceWindow of candidate.windows) {
        const j = jaccard(chunk.tokens, sourceWindow.tokens);
        if (j < 0.16) continue;

        const overlap = overlapCoverage(chunk.tokens, sourceWindow.tokens);
        let score = j * 0.62 + overlap.ratio * 0.38;

        const probe = normalizeText(chunk.text).split(" ").slice(0, 5).join(" ");
        if (probe.length > 15 && normalizeText(sourceWindow.text).includes(probe)) {
          score = Math.min(1, score + 0.08);
        }

        if (!best || score > best.score) {
          best = {
            score,
            overlapTokens: overlap.overlap,
            sourcePostId: candidate.postId,
            sourceTitle: candidate.postTitle,
            sourceSlug: candidate.postSlug,
            sourceKeyword: candidate.targetKeyword || candidate.focusKeyword || null,
            sourceExcerpt: sourceWindow.text,
          };
        }
      }
    }

    if (!best || best.score < 0.52) continue;

    const riskLevel = classifyMatchRisk(best.score);
    const matchType = classifyMatchType({
      score: best.score,
      chunkText: chunk.text,
      sourceExcerpt: best.sourceExcerpt,
      targetKeyword: args.targetKeyword,
      sourceKeyword: best.sourceKeyword,
    });
    const decision = buildEditorialDecision({
      matchType,
      score: best.score,
      riskLevel,
      sourceTitle: best.sourceTitle,
      sourceKeyword: best.sourceKeyword,
    });
    const sourceGuidance = buildSourceGuidance(support);
    const differentiationInstruction = buildDifferentiationInstruction({
      matchType,
      recommendedAction: decision.recommendedAction,
      sourceTitle: best.sourceTitle,
    });

    rawMatches.push({
      chunkText: chunk.text,
      similarityScore: Number(best.score.toFixed(3)),
      overlapTokens: best.overlapTokens,
      riskLevel,
      matchType,
      matchLabel: matchTypeLabel(matchType),
      editorialSeverity: decision.editorialSeverity,
      recommendedAction: decision.recommendedAction,
      actionLabel: actionLabel(decision.recommendedAction),
      actionReason: decision.actionReason,
      sourcePostId: best.sourcePostId,
      sourceTitle: best.sourceTitle,
      sourceSlug: best.sourceSlug,
      sourceExcerpt: best.sourceExcerpt,
      sourceGuidance,
      acceptableOverlapReason: buildAcceptableOverlapReason(matchType),
      differentiationInstruction,
      alternatives: buildAlternatives(chunk.text, args.targetKeyword),
    });
  }

  const dedupe = new Set<string>();
  const matches = rawMatches
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .filter((match) => {
      const key = `${normalizeText(match.chunkText).slice(0, 120)}::${match.sourcePostId}`;
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    })
    .slice(0, maxMatches);

  const checkedChunks = currentChunks.length;
  const suspectChunks = rawMatches.length;
  const highRiskChunks = rawMatches.filter((item) => item.riskLevel === "high").length;
  const suspectRatio = checkedChunks ? suspectChunks / checkedChunks : 0;
  const highRatio = checkedChunks ? highRiskChunks / checkedChunks : 0;
  const avgScore =
    suspectChunks > 0
      ? rawMatches.reduce((sum, item) => sum + item.similarityScore, 0) / suspectChunks
      : 0;

  const penalty = suspectRatio * 70 + highRatio * 20 + avgScore * 10;
  const uniquenessScore = Math.round(clamp(100 - penalty, 0, 100));
  const riskLevel = classifyGlobalRisk(uniquenessScore);
  const baseSummary = buildSummary({
    checkedChunks,
    suspectChunks,
    highRiskChunks,
    uniquenessScore,
    comparedPosts,
    scope,
  });
  const summary =
    semanticDiagnostics.structure.coverageScore < 45
      ? `${baseSummary} Estrutura PNL incompleta; inclua secoes de intencao e resposta direta.`
      : baseSummary;
  const articlePairs = buildArticlePairs(matches);
  const priorityActions = buildPriorityActions(matches);
  const executiveSummary = buildExecutiveSummary({
    summary,
    riskLevel,
    uniquenessScore,
    highRiskChunks,
    suspectChunks,
    priorityActions,
  });
  const gptBrief = buildGptBrief({
    title: args.targetKeyword || "artigo atual",
    executiveSummary,
    priorityActions,
    matches,
    support,
  });

  return {
    uniquenessScore,
    riskLevel,
    totalWords,
    checkedChunks,
    suspectChunks,
    highRiskChunks,
    comparedPosts,
    summary,
    executiveSummary,
    priorityActions,
    articlePairs,
    gptBrief,
    supportSources,
    supportContext: support.supportContext,
    semanticDiagnostics,
    matches,
  };
}

function emptyExecutiveSummary(summary: string): InternalDuplicationExecutiveSummary {
  return {
    status: "ok",
    label: "OK",
    mainIssue: summary,
    nextAction: "Nenhuma acao editorial urgente.",
    topProblems: [],
  };
}

function buildArticlePairs(matches: InternalDuplicateMatch[]): InternalDuplicationArticlePair[] {
  const grouped = new Map<string, InternalDuplicateMatch[]>();
  matches.forEach((match) => {
    const key = match.sourcePostId || match.sourceSlug || match.sourceTitle;
    grouped.set(key, [...(grouped.get(key) ?? []), match]);
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const sorted = [...items].sort((a, b) => {
        const severityDiff = severityRank(a.editorialSeverity) - severityRank(b.editorialSeverity);
        if (severityDiff !== 0) return severityDiff;
        return b.similarityScore - a.similarityScore;
      });
      const topMatch = sorted[0];
      return {
        pairKey: key,
        sourcePostId: topMatch.sourcePostId,
        sourceTitle: topMatch.sourceTitle,
        sourceSlug: topMatch.sourceSlug,
        matchCount: items.length,
        highRiskCount: items.filter((item) => item.riskLevel === "high").length,
        maxScore: Math.max(...items.map((item) => item.similarityScore)),
        matchType: topMatch.matchType,
        matchLabel: topMatch.matchLabel,
        editorialSeverity: topMatch.editorialSeverity,
        recommendedAction: topMatch.recommendedAction,
        actionLabel: topMatch.actionLabel,
        reason: topMatch.actionReason,
        topMatch,
      } satisfies InternalDuplicationArticlePair;
    })
    .sort((a, b) => {
      const severityDiff = severityRank(a.editorialSeverity) - severityRank(b.editorialSeverity);
      if (severityDiff !== 0) return severityDiff;
      if (b.highRiskCount !== a.highRiskCount) return b.highRiskCount - a.highRiskCount;
      return b.maxScore - a.maxScore;
    });
}

function buildPriorityActions(matches: InternalDuplicateMatch[]): InternalDuplicationPriorityAction[] {
  return matches
    .filter((match) => match.editorialSeverity !== "ok")
    .sort((a, b) => {
      const severityDiff = severityRank(a.editorialSeverity) - severityRank(b.editorialSeverity);
      if (severityDiff !== 0) return severityDiff;
      const actionDiff = actionRank(a.recommendedAction) - actionRank(b.recommendedAction);
      if (actionDiff !== 0) return actionDiff;
      return b.similarityScore - a.similarityScore;
    })
    .slice(0, 3)
    .map((match, index) => ({
      id: `${match.sourcePostId}-${index}`,
      label: match.actionLabel,
      severity: match.editorialSeverity,
      recommendedAction: match.recommendedAction,
      matchType: match.matchType,
      reason: match.actionReason,
      currentExcerpt: match.chunkText,
      comparedTitle: match.sourceTitle,
      comparedSlug: match.sourceSlug,
      similarityScore: match.similarityScore,
      sourceGuidance: match.sourceGuidance,
      differentiationInstruction: match.differentiationInstruction,
    }));
}

function buildExecutiveSummary(args: {
  summary: string;
  riskLevel: DuplicateRiskLevel;
  uniquenessScore: number;
  highRiskChunks: number;
  suspectChunks: number;
  priorityActions: InternalDuplicationPriorityAction[];
}): InternalDuplicationExecutiveSummary {
  if (!args.priorityActions.length) {
    const status = args.suspectChunks > 0 ? "publish_now" : "ok";
    return {
      status,
      label: status === "publish_now" ? "Publicar agora?" : "OK",
      mainIssue: args.summary,
      nextAction:
        status === "publish_now"
          ? "Pode publicar se a intencao unica e os links internos estiverem corretos."
          : "Nenhuma acao editorial urgente.",
      topProblems: [],
    };
  }

  const hasRewrite = args.priorityActions.some((action) => action.severity === "rewrite_before_publish");
  const status: DuplicationExecutiveStatus = hasRewrite ? "rewrite_before_publish" : "monitor";
  const topProblems = args.priorityActions.map(
    (action) => `${action.label}: ${action.comparedTitle} (${Math.round(action.similarityScore * 100)}%)`
  );

  return {
    status,
    label: hasRewrite ? "Reescrever antes" : "Monitorar",
    mainIssue: hasRewrite
      ? `${args.highRiskChunks || args.priorityActions.length} trecho(s) precisam de reescrita ou diferenciacao antes de publicar.`
      : "Ha sobreposicoes editoriais moderadas; revise angulo, exemplos e links.",
    nextAction: args.priorityActions[0]?.reason || args.summary,
    topProblems,
  };
}

function buildGptBrief(args: {
  title: string;
  executiveSummary: InternalDuplicationExecutiveSummary;
  priorityActions: InternalDuplicationPriorityAction[];
  matches: InternalDuplicateMatch[];
  support: DuplicationSupportContext;
}) {
  const selectedMatches = args.matches
    .filter((match) => match.editorialSeverity !== "ok")
    .slice(0, 5);

  const lines = [
    "# Brief compacto para GPT - duplicacao interna",
    "",
    `Artigo/keyword: ${args.title}`,
    `Status: ${args.executiveSummary.label}`,
    `Problema principal: ${args.executiveSummary.mainIssue}`,
    `Proxima acao: ${args.executiveSummary.nextAction}`,
    "",
    "Instrucoes para GPT:",
    "- Reescreva somente os trechos marcados, sem mudar a intencao do artigo.",
    "- Diferencie abertura, exemplo, metafora e ordem do argumento.",
    "- Preserve contexto local necessario; nao apague Google Business Profile, NAP, reputacao ou localidade quando forem relevantes.",
    "- Se o assunto pertencer melhor ao artigo comparado, sugira mover/resumir o bloco e criar link interno em vez de desenvolver tudo aqui.",
    "- Quando for apoio sem concorrencia, manter contexto curto e linkar; quando competir por intencao, diferenciar angulo.",
    "- Nao crie promessa medica, resultado garantido ou dado sem fonte.",
    "",
    "Base curada aplicada:",
    ...args.support.sources.slice(0, 4).map((source) => `- ${source.title}: ${source.guidance}`),
    "",
  ];

  if (args.priorityActions.length) {
    lines.push("Acoes prioritarias:");
    args.priorityActions.forEach((action, index) => {
      lines.push(
        `${index + 1}. ${action.label} contra "${action.comparedTitle}" - ${action.reason}`
      );
    });
    lines.push("");
  }

  if (selectedMatches.length) {
    lines.push("Trechos para revisar:");
    selectedMatches.forEach((match, index) => {
      lines.push(`${index + 1}. ${match.matchLabel} (${Math.round(match.similarityScore * 100)}%)`);
      lines.push(`Artigo comparado: ${match.sourceTitle} (/${match.sourceSlug})`);
      lines.push(`Trecho atual: ${match.chunkText}`);
      lines.push(`Trecho parecido: ${match.sourceExcerpt}`);
      lines.push(`Acao: ${match.actionLabel}. ${match.actionReason}`);
      if (match.differentiationInstruction) lines.push(`Instrucao: ${match.differentiationInstruction}`);
    });
  } else {
    lines.push("Nao ha trechos prioritarios para GPT.");
  }

  return lines.join("\n").trim().slice(0, 3400);
}
