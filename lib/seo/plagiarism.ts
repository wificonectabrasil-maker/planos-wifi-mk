import type { SerpItem } from "@/lib/google/types";

export type CopyRiskLevel = "low" | "medium" | "high";

export type ExternalCopyMatch = {
  query: string;
  queryExcerpt: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceDomain: string;
  sourceSnippet: string;
  similarityScore: number;
  overlapTokens: number;
  riskLevel: CopyRiskLevel;
};

export type ExternalCopyAnalysis = {
  uniquenessScore: number;
  riskLevel: CopyRiskLevel;
  totalWords: number;
  checkedChunks: number;
  suspectChunks: number;
  highRiskChunks: number;
  summary: string;
  matches: ExternalCopyMatch[];
};

type QueryCandidate = {
  query: string;
  excerpt: string;
};

const MIN_WORD_LEN = 3;
const MIN_SENTENCE_CHARS = 80;
const MAX_QUERY_CHARS = 118;
const MAX_CHUNK_WORDS = 16;
const MIN_CHUNK_WORDS = 8;

function stripHtml(html: string) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromJson(node: any): string {
  if (!node) return "";
  if (node.type === "text") {
    return typeof node.text === "string" ? node.text : "";
  }
  if (!Array.isArray(node.content)) return "";
  return node.content.map(extractTextFromJson).join(" ");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= MIN_WORD_LEN);
}

function uniqueNormalized(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((item) => {
    const key = normalizeText(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item.trim());
  });
  return out;
}

function splitSentences(text: string) {
  const base = text.replace(/\r/g, " ").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (!base) return [];
  return uniqueNormalized(
    base
      .split(/[.!?]+(?:\s+|$)/g)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= MIN_SENTENCE_CHARS)
  );
}

function buildExcerpt(sentence: string) {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length < MIN_CHUNK_WORDS) return "";

  const selected: string[] = [];
  for (const word of words) {
    const next = selected.length ? `${selected.join(" ")} ${word}` : word;
    if (next.length > MAX_QUERY_CHARS - 4) break;
    selected.push(word);
    if (selected.length >= MAX_CHUNK_WORDS) break;
  }

  if (selected.length < MIN_CHUNK_WORDS) return "";
  return selected.join(" ");
}

function buildQueryCandidates(text: string, maxQueries: number): QueryCandidate[] {
  const candidates: QueryCandidate[] = [];
  const seen = new Set<string>();

  const pushCandidate = (raw: string) => {
    const excerpt = buildExcerpt(raw);
    if (!excerpt) return;
    const key = normalizeText(excerpt);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const query = `"${excerpt}"`;
    candidates.push({ query, excerpt });
  };

  const sentences = splitSentences(text);
  sentences.forEach(pushCandidate);

  if (candidates.length < maxQueries) {
    const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    for (let index = 0; index < words.length && candidates.length < maxQueries; index += 20) {
      const chunk = words.slice(index, index + 22).join(" ");
      pushCandidate(chunk);
    }
  }

  return candidates.slice(0, maxQueries);
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
  const setB = new Set(tokensB);
  if (!tokensA.length) return { ratio: 0, overlap: 0 };

  let overlap = 0;
  const uniqueA = Array.from(new Set(tokensA));
  uniqueA.forEach((token) => {
    if (setB.has(token)) overlap += 1;
  });

  return { ratio: overlap / uniqueA.length, overlap };
}

function classifyRisk(score: number): CopyRiskLevel {
  if (score >= 0.68) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0] || url;
  }
}

function scoreResult(excerpt: string, item: SerpItem) {
  const sourceText = `${item.title || ""} ${item.snippet || ""}`;
  const excerptTokens = tokenize(excerpt);
  const sourceTokens = tokenize(sourceText);
  const j = jaccard(excerptTokens, sourceTokens);
  const coverage = overlapCoverage(excerptTokens, sourceTokens);

  let score = j * 0.55 + coverage.ratio * 0.45;
  const excerptNorm = normalizeText(excerpt);
  const sourceNorm = normalizeText(sourceText);
  const phraseProbe = excerptNorm.split(" ").slice(0, 6).join(" ");
  if (phraseProbe.length > 18 && sourceNorm.includes(phraseProbe)) {
    score = Math.min(1, score + 0.12);
  }

  return {
    score: Number(score.toFixed(3)),
    overlapTokens: coverage.overlap,
  };
}

function buildSummary(checkedChunks: number, suspectChunks: number, highRiskChunks: number, uniquenessScore: number) {
  if (!checkedChunks) {
    return "Sem texto suficiente para inspecao externa.";
  }
  if (!suspectChunks) {
    return "Nao encontramos sinais fortes de copia nos trechos avaliados.";
  }
  if (highRiskChunks > 0) {
    return `${highRiskChunks} trecho(s) com risco alto de copia detectado(s). Revise antes de publicar.`;
  }
  if (uniquenessScore < 70) {
    return "Foram detectadas sobreposicoes relevantes. Reescreva trechos para elevar unicidade.";
  }
  return "Existem sobreposicoes moderadas. Ajuste linguagem e exemplos para diferenciar.";
}

function clampScore(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function extractPlainTextForAnalysis(contentHtml?: string | null, contentJson?: any) {
  const htmlText = typeof contentHtml === "string" ? stripHtml(contentHtml) : "";
  if (htmlText) return htmlText;
  return extractTextFromJson(contentJson);
}

export async function inspectExternalUniqueness(args: {
  text: string;
  maxQueries?: number;
  search: (query: string) => Promise<{ items: SerpItem[] }>;
}): Promise<ExternalCopyAnalysis> {
  const text = args.text?.trim() || "";
  const totalWords = tokenize(text).length;
  if (!text || totalWords < 80) {
    return {
      uniquenessScore: 100,
      riskLevel: "low",
      totalWords,
      checkedChunks: 0,
      suspectChunks: 0,
      highRiskChunks: 0,
      summary: "Sem texto suficiente para inspecao externa.",
      matches: [],
    };
  }

  const maxQueries = clampScore(Math.round(args.maxQueries ?? 6), 2, 12);
  const candidates = buildQueryCandidates(text, maxQueries);
  if (!candidates.length) {
    return {
      uniquenessScore: 100,
      riskLevel: "low",
      totalWords,
      checkedChunks: 0,
      suspectChunks: 0,
      highRiskChunks: 0,
      summary: "Sem texto suficiente para inspecao externa.",
      matches: [],
    };
  }

  const matches: ExternalCopyMatch[] = [];
  for (const candidate of candidates) {
    const serp = await args.search(candidate.query);
    const items = Array.isArray(serp?.items) ? serp.items : [];
    if (!items.length) continue;

    let bestScore = -1;
    let bestMatch: ExternalCopyMatch | null = null;
    for (const item of items) {
      const { score, overlapTokens } = scoreResult(candidate.excerpt, item);
      const riskLevel = classifyRisk(score);
      const current: ExternalCopyMatch = {
        query: candidate.query,
        queryExcerpt: candidate.excerpt,
        sourceTitle: item.title || "Sem titulo",
        sourceUrl: item.link,
        sourceDomain: extractDomain(item.link),
        sourceSnippet: item.snippet || "",
        similarityScore: score,
        overlapTokens,
        riskLevel,
      };
      if (current.similarityScore > bestScore) {
        bestScore = current.similarityScore;
        bestMatch = current;
      }
    }

    if (bestMatch && bestMatch.similarityScore >= 0.5) {
      matches.push(bestMatch);
    }
  }

  const checkedChunks = candidates.length;
  const suspectChunks = matches.length;
  const highRiskChunks = matches.filter((match) => match.riskLevel === "high").length;
  const suspectRatio = checkedChunks ? suspectChunks / checkedChunks : 0;
  const highRatio = checkedChunks ? highRiskChunks / checkedChunks : 0;
  const avgSuspectScore =
    suspectChunks > 0 ? matches.reduce((acc, item) => acc + item.similarityScore, 0) / suspectChunks : 0;

  const penalty = suspectRatio * 70 + highRatio * 20 + avgSuspectScore * 10;
  const uniquenessScore = Math.round(clampScore(100 - penalty, 0, 100));
  const riskLevel: CopyRiskLevel = uniquenessScore <= 45 ? "high" : uniquenessScore <= 70 ? "medium" : "low";

  return {
    uniquenessScore,
    riskLevel,
    totalWords,
    checkedChunks,
    suspectChunks,
    highRiskChunks,
    summary: buildSummary(checkedChunks, suspectChunks, highRiskChunks, uniquenessScore),
    matches: matches.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 12),
  };
}
