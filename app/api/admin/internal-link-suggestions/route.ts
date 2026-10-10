import { buildPostCanonicalPath } from "@/lib/seo/canonical";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildGeminiGenerateContentUrl, getGeminiApiKey } from "@/lib/ai/gemini";
import { getAdminDatabase } from "@/lib/database";
import { checkRateLimit } from "@/lib/seo/rateLimit";
import { buildSemanticFoundationDiagnostics } from "@/lib/seo/semanticFoundation";
import { buildExpectedLinkAudit, findEditorialArticlePlan } from "@/lib/editorial/content-plan";
import { buildInternalLinksSupportContext } from "@/lib/editorial/drive-support";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  postId: z.string().uuid().optional(),
  siloId: z.string().uuid().optional(),
  title: z.string().max(220).optional(),
  keyword: z.string().max(180).optional(),
  text: z.string().min(80).max(120_000),
  existingLinks: z
    .array(
      z.object({
        href: z.string().max(800).optional(),
        text: z.string().max(300).optional(),
        anchorText: z.string().max(300).optional(),
        targetSlug: z.string().max(220).optional(),
        dataPostId: z.string().uuid().nullable().optional(),
        type: z.string().optional(),
      })
    )
    .max(400)
    .optional(),
  maxSuggestions: z.number().int().min(3).max(24).optional(),
});

const RATE_LIMIT = {
  limit: 25,
  windowMs: 10 * 60 * 1000,
};

type Candidate = {
  candidateId: string;
  anchorMode: "strict" | "relaxed";
  postId: string;
  title: string;
  slug: string;
  url: string;
  targetKeyword: string;
  anchorText: string;
  anchorBucket: "START" | "MID" | "END";
  anchorDiscriminativeScore: number;
  role: "PILLAR" | "SUPPORT" | "AUX" | null;
  position: number | null;
  supportIndex: number | null;
  semanticScore: number;
  hierarchyScore: number;
  keywordScore: number;
  finalScore: number;
  expectedByPlan: boolean;
  alreadyLinked: boolean;
};

type HierarchyEntry = {
  role: "PILLAR" | "SUPPORT" | "AUX" | null;
  position: number | null;
  supportIndex: number | null;
};

type SemanticProfile = {
  terms: Set<string>;
  keyTerms: Set<string>;
  lsiTerms: Set<string>;
  weightedTerms: Map<string, number>;
};

const ANCHOR_STOP_WORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "para",
  "por",
  "com",
  "sem",
  "no",
  "na",
  "nos",
  "nas",
  "em",
  "que",
  "como",
  "mais",
  "menos",
  "muito",
  "muita",
]);

const GENERIC_ANCHORS = [
  "clique aqui",
  "saiba mais",
  "leia mais",
  "veja mais",
  "aqui",
  "neste artigo",
  "neste post",
];

const WEAK_ANCHOR_PREFIXES = [
  "total",
  "descubra",
  "conheca",
  "veja",
  "saiba",
  "confira",
  "melhores",
  "melhor",
];

const COMMERCIAL_TERMS = [
  "amazon",
  "ver preco",
  "preco",
  "oferta",
  "comprar",
  "promo",
  "cta",
  "frete",
  "parcel",
  "produto",
  "vendedor",
  "patrocinado",
  "sponsored",
  "tag=",
];

const UNIT_REGEX = /\b\d+(?:[.,]\d+)?\s?(?:w|v|volts?|amp|a|ma|wh|ml|l|cm|mm|kg|g)\b/i;
const MIN_SUGGESTION_SCORE = 6;
const MIN_SUGGESTION_SEMANTIC = 1;

function getMissingColumnFromError(error: any): string | null {
  if (!error) return null;
  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  const patterns = [
    /column\s+(?:["]?[a-zA-Z0-9_]+["]?\.)*["]?([a-zA-Z0-9_]+)["]?\s+does not exist/i,
    /Could not find the '([a-zA-Z0-9_]+)' column/i,
    /missing column:\s*["']?([a-zA-Z0-9_]+)["']?/i,
  ];
  for (const regex of patterns) {
    const match = regex.exec(message);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getClientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `internal-link-ai:${ip}`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

const NLP_STOP_WORDS = new Set([
  ...Array.from(ANCHOR_STOP_WORDS.values()),
  "isso",
  "essa",
  "esse",
  "essas",
  "esses",
  "tambem",
  "ainda",
  "sobre",
  "entre",
  "durante",
  "quando",
  "onde",
  "porque",
  "sendo",
  "fazer",
  "feito",
  "pode",
  "podem",
  "deve",
  "devem",
  "ter",
  "tendo",
  "usar",
  "usando",
  "muito",
  "muita",
  "muitos",
  "muitas",
]);

function stemPtToken(token: string) {
  let value = token;
  const suffixRules = [
    "izacao",
    "izacoes",
    "izador",
    "izadores",
    "amento",
    "amentos",
    "imento",
    "imentos",
    "mente",
    "idade",
    "idades",
    "cao",
    "coes",
    "s",
  ];

  for (const suffix of suffixRules) {
    if (value.length > suffix.length + 2 && value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
      break;
    }
  }

  if (value.endsWith("oes") && value.length > 5) {
    value = `${value.slice(0, -3)}ao`;
  }
  if (value.endsWith("ais") && value.length > 5) {
    value = `${value.slice(0, -3)}al`;
  }
  if (value.endsWith("eis") && value.length > 5) {
    value = `${value.slice(0, -3)}el`;
  }

  return value.trim();
}

function tokenizeSemantic(value: string) {
  return tokenize(value)
    .map(stemPtToken)
    .filter((token) => token.length > 2 && !NLP_STOP_WORDS.has(token));
}

function tokenizeAnchorSemantic(value: string) {
  return tokenizeAnchor(value)
    .map(stemPtToken)
    .filter((token) => token.length > 2 && !NLP_STOP_WORDS.has(token));
}

function buildDocumentFrequencyMap(documents: string[][]) {
  const map = new Map<string, number>();
  documents.forEach((tokens) => {
    const unique = new Set(tokens);
    unique.forEach((token) => {
      map.set(token, (map.get(token) ?? 0) + 1);
    });
  });
  return map;
}

function parseEntities(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item ?? "").trim())
          .filter(Boolean);
      }
    } catch {
      // keep fallback split below
    }

    return text
      .split(/[|,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    const maybe = (value as any).entities ?? (value as any).terms;
    if (Array.isArray(maybe)) {
      return maybe
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
    }
  }

  return [];
}

function buildFrequencyMap(tokens: string[]) {
  const map = new Map<string, number>();
  tokens.forEach((token) => {
    map.set(token, (map.get(token) ?? 0) + 1);
  });
  return map;
}

function buildWeightedMap(tfMap: Map<string, number>, documentFrequency: Map<string, number>, totalDocs: number) {
  const weighted = new Map<string, number>();
  tfMap.forEach((tf, token) => {
    const df = documentFrequency.get(token) ?? 0;
    const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
    weighted.set(token, tf * idf);
  });
  return weighted;
}

function topTermsByWeight(weightedMap: Map<string, number>, limit: number) {
  return Array.from(weightedMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function overlapRatio(base: Set<string>, probe: Set<string>) {
  if (!base.size || !probe.size) return 0;
  let hit = 0;
  base.forEach((token) => {
    if (probe.has(token)) hit += 1;
  });
  return hit / base.size;
}

function cosineSimilarityFromMaps(a: Map<string, number>, b: Map<string, number>) {
  if (!a.size || !b.size) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  a.forEach((valueA, token) => {
    normA += valueA * valueA;
    const valueB = b.get(token) ?? 0;
    dot += valueA * valueB;
  });
  b.forEach((valueB) => {
    normB += valueB * valueB;
  });

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildSemanticProfile(args: {
  title: string;
  keyword: string;
  entities?: string[];
  content: string;
  documentFrequency: Map<string, number>;
  totalDocs: number;
}) {
  const entitiesText = Array.isArray(args.entities) ? args.entities.filter(Boolean).join(" ") : "";
  const coreText = `${args.title} ${args.keyword} ${entitiesText}`.trim();
  const corpusText = `${coreText} ${args.content}`.trim();

  const terms = tokenizeSemantic(corpusText);
  const tfMap = buildFrequencyMap(terms);
  const weightedTerms = buildWeightedMap(tfMap, args.documentFrequency, args.totalDocs);
  const keyTerms = new Set(tokenizeSemantic(coreText));
  const topLsi = topTermsByWeight(weightedTerms, 24).filter((token) => !keyTerms.has(token)).slice(0, 12);

  return {
    terms: new Set(terms),
    keyTerms,
    lsiTerms: new Set(topLsi),
    weightedTerms,
  } satisfies SemanticProfile;
}

function semanticNlpScore(articleProfile: SemanticProfile, targetProfile: SemanticProfile) {
  const cosine = cosineSimilarityFromMaps(articleProfile.weightedTerms, targetProfile.weightedTerms);
  const keyCoverage = overlapRatio(targetProfile.keyTerms, articleProfile.terms);
  const lsiCoverage = overlapRatio(targetProfile.lsiTerms, articleProfile.terms);

  const score = clamp(cosine * 100 * 0.5 + keyCoverage * 100 * 0.35 + lsiCoverage * 100 * 0.15, 0, 100);
  return Number(score.toFixed(1));
}

function stripHtml(value: string) {
  return value
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPath(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url, "http://internal.local");
    return parsed.pathname.replace(/\/+$/, "");
  } catch {
    return url.split(/[?#]/)[0].replace(/\/+$/, "");
  }
}

function isGenericAnchorText(value: string) {
  const text = normalize(value);
  if (!text) return true;
  return GENERIC_ANCHORS.some((item) => text === item || text.includes(item));
}

function startsWithWeakAnchorPrefix(value: string) {
  const normalized = normalize(value);
  if (!normalized) return true;
  return WEAK_ANCHOR_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix} `));
}

function tokenizeAnchor(value: string) {
  return tokenize(value).filter((token) => !ANCHOR_STOP_WORDS.has(token));
}

function endsWithWeakConnector(value: string) {
  const words = value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean);
  if (!words.length) return true;
  const last = words[words.length - 1];
  return ANCHOR_STOP_WORDS.has(last);
}

function startsWithWeakConnector(value: string) {
  const words = value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean);
  if (!words.length) return true;
  const first = words[0];
  return ANCHOR_STOP_WORDS.has(first);
}

function hasStrongToken(tokens: string[]) {
  return tokens.some((token) => token.length >= 6);
}

function weightedTokenScore(tokens: string[], target: Set<string>) {
  let score = 0;
  const unique = Array.from(new Set(tokens));
  unique.forEach((token) => {
    if (!target.has(token)) return;
    score += token.length >= 7 ? 1.6 : token.length >= 5 ? 1.3 : 1.0;
  });
  return score;
}

function bucketFromIndex(index: number, totalLength: number): "START" | "MID" | "END" {
  if (totalLength <= 1) return "MID";
  const ratio = index / totalLength;
  if (ratio < 0.33) return "START";
  if (ratio < 0.66) return "MID";
  return "END";
}

function isCommercialSentence(value: string) {
  const text = normalize(value);
  if (!text) return false;
  if (COMMERCIAL_TERMS.some((term) => text.includes(term))) return true;
  if (UNIT_REGEX.test(value)) return true;
  const commaCount = (value.match(/,/g) || []).length;
  const numberCount = (value.match(/\d+/g) || []).length;
  if (commaCount >= 2 && numberCount >= 1) return true;
  return false;
}

function countOccurrences(haystack: string, needle: string) {
  if (!haystack || !needle) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const next = haystack.indexOf(needle, index);
    if (next < 0) break;
    count += 1;
    index = next + needle.length;
  }
  return count;
}

function splitSentencesWithOffset(text: string) {
  const out: Array<{ text: string; start: number }> = [];
  const regex = /[^.!?\n]+[.!?\n]*/g;
  for (const match of text.matchAll(regex)) {
    const sentence = String(match[0] ?? "").replace(/\s+/g, " ").trim();
    if (!sentence) continue;
    out.push({ text: sentence, start: match.index ?? 0 });
  }
  if (!out.length && text.trim()) {
    out.push({ text: text.replace(/\s+/g, " ").trim(), start: 0 });
  }
  return out;
}

type TargetSignature = {
  postId: string;
  tokens: Set<string>;
  semanticTokens: Set<string>;
};

type NaturalAnchorOption = {
  text: string;
  bucket: "START" | "MID" | "END";
  score: number;
  discriminative: number;
};

function extractNaturalAnchorsForTarget(args: {
  articleText: string;
  articleNormalized: string;
  targetPostId: string;
  targetKeyword: string;
  targetTitle: string;
  semanticTokens?: Set<string>;
  signatures: TargetSignature[];
  limit?: number;
}) {
  const articleText = args.articleText.replace(/\s+/g, " ").trim();
  if (!articleText) return [];

  const targetTokens = new Set(tokenizeAnchor(`${args.targetKeyword} ${args.targetTitle}`));
  const targetSemanticTokens = new Set([
    ...tokenizeAnchorSemantic(`${args.targetKeyword} ${args.targetTitle}`),
    ...Array.from(args.semanticTokens ?? []),
  ]);
  if (!targetTokens.size && !targetSemanticTokens.size) return [];

  const normalizedTitle = normalize(args.targetTitle);
  const normalizedKeyword = normalize(args.targetKeyword);
  const totalLength = articleText.length;
  const sentences = splitSentencesWithOffset(articleText);
  const signatures = args.signatures ?? [];
  const limit = clamp(args.limit ?? 4, 1, 8);

  const optionsByKey = new Map<string, NaturalAnchorOption>();

  for (const sentence of sentences) {
    if (isCommercialSentence(sentence.text)) continue;
    const words = sentence.text.split(" ").filter(Boolean);
    if (words.length < 2) continue;

    for (let start = 0; start < words.length; start += 1) {
      for (let size = 2; size <= 6; size += 1) {
        const slice = words.slice(start, start + size);
        if (slice.length < 2) continue;

        const raw = slice
          .join(" ")
          .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!raw) continue;
        if (raw.length > 72) continue;

        const rawWords = raw.split(" ").filter(Boolean);
        if (rawWords.length < 2 || rawWords.length > 7) continue;
        if (/[,:;()]/.test(raw)) continue;
        if (startsWithWeakAnchorPrefix(raw)) continue;
        if (isGenericAnchorText(raw)) continue;
        if (COMMERCIAL_TERMS.some((term) => normalize(raw).includes(term))) continue;
        if (UNIT_REGEX.test(raw)) continue;
        if (startsWithWeakConnector(raw) || endsWithWeakConnector(raw)) continue;

        const phraseTokens = tokenizeAnchor(raw);
        const phraseSemanticTokens = tokenizeAnchorSemantic(raw);
        if (phraseTokens.length < 2 || !phraseSemanticTokens.length) continue;
        if (!hasStrongToken(phraseTokens) && !hasStrongToken(phraseSemanticTokens)) continue;

        const uniquePhraseTokens = Array.from(new Set(phraseTokens));
        const uniquePhraseSemanticTokens = Array.from(new Set(phraseSemanticTokens));
        const overlap = uniquePhraseTokens.filter((token) => targetTokens.has(token)).length;
        const semanticOverlap = uniquePhraseSemanticTokens.filter((token) => targetSemanticTokens.has(token)).length;
        const hasStrongOverlap =
          uniquePhraseTokens.some((token) => targetTokens.has(token) && token.length >= 6) ||
          uniquePhraseSemanticTokens.some((token) => targetSemanticTokens.has(token) && token.length >= 6);
        if (overlap < 2 && !(overlap >= 1 && semanticOverlap >= 2 && hasStrongOverlap)) continue;

        const normalizedRaw = normalize(raw);
        if (!normalizedRaw) continue;
        if (normalizedTitle && normalizedRaw === normalizedTitle) continue;
        if (normalizedKeyword && normalizedRaw === normalizedKeyword && rawWords.length > 4) continue;
        if (countOccurrences(args.articleNormalized, normalizedRaw) > 2) continue;

        const targetWeightedScore = weightedTokenScore(uniquePhraseTokens, targetTokens);
        const targetSemanticWeightedScore = weightedTokenScore(uniquePhraseSemanticTokens, targetSemanticTokens);
        const combinedTargetWeight = Math.max(targetWeightedScore, targetSemanticWeightedScore * 0.9);
        if (combinedTargetWeight < 1.6) continue;

        let bestOtherOverlap = 0;
        let bestOtherSemanticOverlap = 0;
        let bestOtherWeightedScore = 0;
        signatures.forEach((signature) => {
          if (signature.postId === args.targetPostId) return;
          const overlapWithOther = uniquePhraseTokens.filter((token) => signature.tokens.has(token)).length;
          const semanticOverlapWithOther = uniquePhraseSemanticTokens.filter((token) =>
            signature.semanticTokens.has(token)
          ).length;
          if (overlapWithOther > bestOtherOverlap) bestOtherOverlap = overlapWithOther;
          if (semanticOverlapWithOther > bestOtherSemanticOverlap) bestOtherSemanticOverlap = semanticOverlapWithOther;
          const otherWeighted = Math.max(
            weightedTokenScore(uniquePhraseTokens, signature.tokens),
            weightedTokenScore(uniquePhraseSemanticTokens, signature.semanticTokens) * 0.9
          );
          if (otherWeighted > bestOtherWeightedScore) bestOtherWeightedScore = otherWeighted;
        });

        const dominantOverlap = overlap + semanticOverlap * 0.8;
        const dominantOtherOverlap = bestOtherOverlap + bestOtherSemanticOverlap * 0.8;
        if (dominantOtherOverlap > dominantOverlap) continue;
        if (bestOtherWeightedScore >= combinedTargetWeight) continue;
        const weightedMargin = combinedTargetWeight - bestOtherWeightedScore;
        const weightedRatio = bestOtherWeightedScore > 0 ? combinedTargetWeight / bestOtherWeightedScore : combinedTargetWeight;
        if (weightedMargin < 0.45) continue;
        if (bestOtherWeightedScore > 0 && weightedRatio < 1.1) continue;

        const discriminative = dominantOverlap - dominantOtherOverlap;
        if (discriminative < 0) continue;
        if (discriminative < 0.6 && weightedMargin < 1.0) continue;

        const density = (overlap + semanticOverlap) / Math.max(uniquePhraseTokens.length, 1);
        if (density < 0.42) continue;
        let score =
          overlap * 11 +
          semanticOverlap * 7 +
          density * 9 +
          Math.min(rawWords.length, 5) +
          discriminative * 9 +
          weightedMargin * 8;
        if (rawWords.length > 5) score -= 2;

        const bucket = bucketFromIndex(sentence.start, totalLength);
        const option: NaturalAnchorOption = {
          text: raw,
          bucket,
          score,
          discriminative: Number((discriminative + weightedMargin).toFixed(2)),
        };
        const key = normalize(raw);
        const existing = optionsByKey.get(key);
        if (!existing || option.score > existing.score) {
          optionsByKey.set(key, option);
        }
      }
    }
  }

  const ranked = Array.from(optionsByKey.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.discriminative - a.discriminative;
  });

  if (!ranked.length) return [];

  const selected: NaturalAnchorOption[] = [];
  const seen = new Set<string>();
  (["START", "MID", "END"] as const).forEach((bucket) => {
    const option = ranked.find((item) => item.bucket === bucket && !seen.has(normalize(item.text)));
    if (!option) return;
    selected.push(option);
    seen.add(normalize(option.text));
  });

  for (const option of ranked) {
    if (selected.length >= limit) break;
    const key = normalize(option.text);
    if (seen.has(key)) continue;
    selected.push(option);
    seen.add(key);
  }

  return selected.slice(0, limit);
}

function extractRelaxedAnchorsForTarget(args: {
  articleText: string;
  targetKeyword: string;
  targetTitle: string;
  semanticTokens?: Set<string>;
  limit?: number;
}) {
  const articleText = args.articleText.replace(/\s+/g, " ").trim();
  if (!articleText) return [];

  const targetTokens = new Set(tokenizeAnchor(`${args.targetKeyword} ${args.targetTitle}`));
  const targetSemanticTokens = new Set([
    ...tokenizeAnchorSemantic(`${args.targetKeyword} ${args.targetTitle}`),
    ...Array.from(args.semanticTokens ?? []),
  ]);
  if (!targetTokens.size && !targetSemanticTokens.size) return [];

  const totalLength = articleText.length;
  const sentences = splitSentencesWithOffset(articleText);
  const limit = clamp(args.limit ?? 4, 1, 8);
  const optionsByKey = new Map<string, NaturalAnchorOption>();

  for (const sentence of sentences) {
    if (isCommercialSentence(sentence.text)) continue;
    const words = sentence.text.split(" ").filter(Boolean);
    if (words.length < 2) continue;

    for (let start = 0; start < words.length; start += 1) {
      for (let size = 2; size <= 8; size += 1) {
        const slice = words.slice(start, start + size);
        if (slice.length < 2) continue;

        const raw = slice
          .join(" ")
          .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!raw) continue;
        if (raw.length > 90) continue;

        const rawWords = raw.split(" ").filter(Boolean);
        if (rawWords.length < 2 || rawWords.length > 9) continue;
        if (/[,:;()]/.test(raw)) continue;
        if (startsWithWeakAnchorPrefix(raw)) continue;
        if (isGenericAnchorText(raw)) continue;
        if (COMMERCIAL_TERMS.some((term) => normalize(raw).includes(term))) continue;
        if (UNIT_REGEX.test(raw)) continue;
        if (startsWithWeakConnector(raw) || endsWithWeakConnector(raw)) continue;

        const phraseTokens = tokenizeAnchor(raw);
        const phraseSemanticTokens = tokenizeAnchorSemantic(raw);
        if (!phraseTokens.length || !phraseSemanticTokens.length) continue;

        const uniquePhraseTokens = Array.from(new Set(phraseTokens));
        const uniquePhraseSemanticTokens = Array.from(new Set(phraseSemanticTokens));
        const overlap = uniquePhraseTokens.filter((token) => targetTokens.has(token)).length;
        const semanticOverlap = uniquePhraseSemanticTokens.filter((token) => targetSemanticTokens.has(token)).length;
        if (overlap < 1 && semanticOverlap < 2) continue;

        const weighted = weightedTokenScore(uniquePhraseTokens, targetTokens);
        const semanticWeighted = weightedTokenScore(uniquePhraseSemanticTokens, targetSemanticTokens);
        const combinedWeight = Math.max(weighted, semanticWeighted * 0.9);
        if (combinedWeight < 1.0 && overlap + semanticOverlap < 2) continue;

        const density = (overlap + semanticOverlap) / Math.max(uniquePhraseTokens.length, 1);
        if (density < 0.3) continue;
        const score =
          overlap * 9 +
          semanticOverlap * 6 +
          combinedWeight * 6 +
          density * 5 +
          (hasStrongToken(uniquePhraseTokens) || hasStrongToken(uniquePhraseSemanticTokens) ? 4 : 0);
        const bucket = bucketFromIndex(sentence.start, totalLength);
        const option: NaturalAnchorOption = {
          text: raw,
          bucket,
          score,
          discriminative: Number((Math.max(0.8, overlap + semanticOverlap * 0.7 + combinedWeight / 2)).toFixed(2)),
        };

        const key = normalize(raw);
        const existing = optionsByKey.get(key);
        if (!existing || option.score > existing.score) {
          optionsByKey.set(key, option);
        }
      }
    }
  }

  const ranked = Array.from(optionsByKey.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.discriminative - a.discriminative;
  });

  if (!ranked.length) return [];

  const selected: NaturalAnchorOption[] = [];
  const seen = new Set<string>();
  (["START", "MID", "END"] as const).forEach((bucket) => {
    const option = ranked.find((item) => item.bucket === bucket && !seen.has(normalize(item.text)));
    if (!option) return;
    selected.push(option);
    seen.add(normalize(option.text));
  });

  for (const option of ranked) {
    if (selected.length >= limit) break;
    const key = normalize(option.text);
    if (seen.has(key)) continue;
    selected.push(option);
    seen.add(key);
  }

  return selected.slice(0, limit);
}

function diversifyByBucket(candidates: Candidate[], limit: number) {
  const buckets: Array<"START" | "MID" | "END"> = ["START", "MID", "END"];
  const selected: Candidate[] = [];
  const seenCandidates = new Set<string>();
  const perPostCount = new Map<string, number>();

  const canAdd = (candidate: Candidate) => {
    if (seenCandidates.has(candidate.candidateId)) return false;
    const countForPost = perPostCount.get(candidate.postId) ?? 0;
    if (countForPost >= 4) return false;
    return true;
  };

  const add = (candidate: Candidate) => {
    selected.push(candidate);
    seenCandidates.add(candidate.candidateId);
    perPostCount.set(candidate.postId, (perPostCount.get(candidate.postId) ?? 0) + 1);
  };

  buckets.forEach((bucket) => {
    const candidate = candidates.find((item) => item.anchorBucket === bucket && canAdd(item));
    if (!candidate) return;
    add(candidate);
  });

  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (!canAdd(candidate)) continue;
    add(candidate);
  }

  return selected.slice(0, limit);
}

function diversifySuggestionRows<T extends { candidateId: string; postId: string; anchorBucket: "START" | "MID" | "END" }>(
  items: T[],
  limit: number
) {
  const buckets: Array<"START" | "MID" | "END"> = ["START", "MID", "END"];
  const selected: T[] = [];
  const seenCandidates = new Set<string>();
  const seenAnchors = new Set<string>();
  const perPostCount = new Map<string, number>();

  const canAdd = (row: T) => {
    if (seenCandidates.has(row.candidateId)) return false;
    const anchor = normalize((row as any).anchorText ?? "");
    if (anchor && seenAnchors.has(anchor)) return false;
    const countForPost = perPostCount.get(row.postId) ?? 0;
    if (countForPost >= 4) return false;
    return true;
  };

  const add = (row: T) => {
    selected.push(row);
    seenCandidates.add(row.candidateId);
    const anchor = normalize((row as any).anchorText ?? "");
    if (anchor) seenAnchors.add(anchor);
    perPostCount.set(row.postId, (perPostCount.get(row.postId) ?? 0) + 1);
  };

  buckets.forEach((bucket) => {
    const row = items.find((item) => item.anchorBucket === bucket && canAdd(item));
    if (!row) return;
    add(row);
  });

  for (const row of items) {
    if (selected.length >= limit) break;
    if (!canAdd(row)) continue;
    add(row);
  }

  return selected.slice(0, limit);
}

function rankPosition(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function normalizeRole(value: unknown): HierarchyEntry["role"] {
  const raw = String(value ?? "").toUpperCase();
  if (raw === "PILLAR") return "PILLAR";
  if (raw === "SUPPORT") return "SUPPORT";
  if (raw === "AUX") return "AUX";
  return null;
}

function buildNormalizedHierarchy(posts: any[], hierarchyRows: any[]) {
  const hierarchyByPostId = new Map<string, { role: HierarchyEntry["role"]; position: number | null }>();
  (hierarchyRows ?? []).forEach((row: any) => {
    const postId = String(row?.post_id ?? "");
    if (!postId) return;
    hierarchyByPostId.set(postId, {
      role: normalizeRole(row?.role),
      position: typeof row?.position === "number" ? row.position : null,
    });
  });

  const sortByPositionThenTitle = (a: any, b: any) => {
    const aPos = rankPosition(hierarchyByPostId.get(String(a.id))?.position);
    const bPos = rankPosition(hierarchyByPostId.get(String(b.id))?.position);
    if (aPos !== bPos) return aPos - bPos;
    return String(a?.title ?? "").localeCompare(String(b?.title ?? ""), "pt-BR");
  };

  const explicitPillar = posts
    .filter((post: any) => hierarchyByPostId.get(String(post.id))?.role === "PILLAR")
    .sort(sortByPositionThenTitle)[0];
  const fallbackPillar = [...posts].sort(sortByPositionThenTitle)[0];
  const pillarId = String(explicitPillar?.id ?? fallbackPillar?.id ?? "");

  const normalizedMap = new Map<string, HierarchyEntry>();
  if (!pillarId) {
    return { map: normalizedMap, pillarId: null as string | null };
  }

  normalizedMap.set(pillarId, { role: "PILLAR", position: 1, supportIndex: null });

  const supportPosts = posts
    .filter((post: any) => String(post.id) !== pillarId && hierarchyByPostId.get(String(post.id))?.role !== "AUX")
    .sort(sortByPositionThenTitle);
  supportPosts.forEach((post: any, index: number) => {
    const supportIndex = index + 1;
    normalizedMap.set(String(post.id), {
      role: "SUPPORT",
      position: supportIndex,
      supportIndex,
    });
  });

  const auxPosts = posts
    .filter((post: any) => String(post.id) !== pillarId && hierarchyByPostId.get(String(post.id))?.role === "AUX")
    .sort(sortByPositionThenTitle);
  auxPosts.forEach((post: any, index: number) => {
    normalizedMap.set(String(post.id), {
      role: "AUX",
      position: index + 1,
      supportIndex: null,
    });
  });

  return { map: normalizedMap, pillarId };
}

function getAllowedTargets(args: {
  currentPostId: string;
  hierarchyMap: Map<string, HierarchyEntry>;
  pillarId: string | null;
}) {
  const { currentPostId, hierarchyMap, pillarId } = args;
  const current = hierarchyMap.get(currentPostId);
  if (!current) return null;

  const allowed = new Set<string>();
  if (current.role === "PILLAR") {
    hierarchyMap.forEach((entry, postId) => {
      if (postId === currentPostId) return;
      if (entry.role === "SUPPORT") allowed.add(postId);
    });
    return allowed;
  }

  if (current.role === "SUPPORT") {
    if (pillarId) allowed.add(pillarId);
    hierarchyMap.forEach((entry, postId) => {
      if (postId === currentPostId) return;
      if (entry.role !== "SUPPORT") return;
      if (typeof entry.supportIndex !== "number" || typeof current.supportIndex !== "number") return;
      const distance = Math.abs(entry.supportIndex - current.supportIndex);
      if (distance === 1) allowed.add(postId);
    });
    return allowed;
  }

  if (current.role === "AUX") {
    if (pillarId) allowed.add(pillarId);
    return allowed;
  }

  return null;
}

function strictHierarchyScore(current: HierarchyEntry | null, target: HierarchyEntry | null) {
  if (!current || !target) return 0;
  if (current.role === "PILLAR" && target.role === "SUPPORT") return 24;
  if (current.role === "SUPPORT" && target.role === "PILLAR") return 30;
  if (
    current.role === "SUPPORT" &&
    target.role === "SUPPORT" &&
    typeof current.supportIndex === "number" &&
    typeof target.supportIndex === "number"
  ) {
    const distance = Math.abs(current.supportIndex - target.supportIndex);
    if (distance === 1) return 18;
  }
  if (current.role === "AUX" && target.role === "PILLAR") return 20;
  return 0;
}

function roleLabel(role: HierarchyEntry["role"], position: number | null) {
  if (role === "PILLAR") return "Pilar";
  if (role === "SUPPORT") return typeof position === "number" ? `Suporte ${position}` : "Suporte";
  if (role === "AUX") return typeof position === "number" ? `Aux ${position}` : "Aux";
  return "Sem papel";
}

function hierarchyReason(current: HierarchyEntry | null, target: HierarchyEntry | null) {
  if (!current || !target) return "Regra de hierarquia aplicada.";
  const sourceLabel = roleLabel(current.role, current.position);
  const targetLabel = roleLabel(target.role, target.position);
  if (current.role === "PILLAR" && target.role === "SUPPORT") {
    return `Regra do silo: ${sourceLabel} pode distribuir links para ${targetLabel}.`;
  }
  if (current.role === "SUPPORT" && target.role === "PILLAR") {
    return `Regra do silo: ${sourceLabel} deve reforcar o ${targetLabel}.`;
  }
  if (
    current.role === "SUPPORT" &&
    target.role === "SUPPORT" &&
    typeof current.supportIndex === "number" &&
    typeof target.supportIndex === "number"
  ) {
    return `Regra do silo: ${sourceLabel} so pode linkar suportes vizinhos como ${targetLabel}.`;
  }
  if (current.role === "AUX" && target.role === "PILLAR") {
    return `Regra do silo: ${sourceLabel} so pode apontar para o ${targetLabel}.`;
  }
  return `Regra do silo: ${sourceLabel} -> ${targetLabel}.`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trimAnchor(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const words = cleaned.split(" ").filter(Boolean);
  return words.slice(0, 7).join(" ");
}

function bucketLabel(bucket: Candidate["anchorBucket"]) {
  if (bucket === "START") return "inicio";
  if (bucket === "MID") return "meio";
  return "final";
}

function fallbackReason(candidate: Candidate, current: HierarchyEntry | null) {
  const roleName =
    candidate.role === "PILLAR"
      ? "post pilar"
      : candidate.role === "SUPPORT"
        ? typeof candidate.position === "number"
          ? `suporte ${candidate.position}`
          : "post de suporte"
        : "post auxiliar";
  const semantic = candidate.semanticScore.toFixed(0);
  const rule = hierarchyReason(current, {
    role: candidate.role,
    position: candidate.position,
    supportIndex: candidate.supportIndex,
  });
  const natural = `Ancora natural no ${bucketLabel(candidate.anchorBucket)} do artigo.`;
  if (candidate.alreadyLinked) {
    return `Ja existe link para ${roleName}. ${rule} ${natural} Afinidade semantica (${semantic}%).`;
  }
  return `${rule} ${natural} Afinidade semantica (${semantic}%).`;
}

function buildLinkingPrinciple(candidate: Candidate, current: HierarchyEntry | null) {
  const targetLabel = candidate.role === "PILLAR" ? "pilar" : candidate.role === "SUPPORT" ? "suporte" : "post auxiliar";
  if (candidate.expectedByPlan) {
    return `Link esperado pelo KGR: usar a ancora como ponte natural para fortalecer o ${targetLabel} sem repetir keyword de forma mecanica.`;
  }
  return `${hierarchyReason(current, {
    role: candidate.role,
    position: candidate.position,
    supportIndex: candidate.supportIndex,
  })} A ancora deve conectar uma duvida do leitor ao proximo aprofundamento do silo.`;
}

function buildSemanticBridge(candidate: Candidate) {
  return `Ponte semantica no ${bucketLabel(candidate.anchorBucket)}: "${candidate.anchorText}" conecta o trecho atual a ${candidate.title} por problema, solucao, localidade, servico ou etapa de decisao.`;
}

function buildSourceGuidance(sources: Array<{ title: string }>) {
  return sources.slice(0, 3).map((source) => source.title).join(" | ");
}

function exactKeywordAnchorPenalty(anchor: string, targetKeyword: string) {
  const a = normalize(anchor);
  const k = normalize(targetKeyword);
  if (!a || !k) return 0;
  if (a === k) return 10;
  if (a.includes(k) && a.split(" ").length <= k.split(" ").length + 1) return 6;
  return 0;
}

async function suggestWithAI(args: {
  title: string;
  keyword: string;
  text: string;
  currentRole: Candidate["role"];
  currentPosition: number | null;
  currentSupportIndex: number | null;
  maxSuggestions: number;
  candidates: Candidate[];
  supportContext: ReturnType<typeof buildInternalLinksSupportContext>;
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `
Contexto curado:
${args.supportContext.promptContext}

Regras adicionais:
- Penalize ancora que apenas repete a keyword exata; prefira ponte semantica entre problema, solucao, localidade, servico ou etapa da jornada.
- Quando houver SEO local, preserve contexto local necessario sem prometer resultado garantido.
- Em cada sugestao JSON, inclua tambem: linking_principle, semantic_bridge e source_guidance.

Voce e o Assistente Guardião SEO da projeto, especialista em linkagem interna.
Sua missão é selecionar os melhores pontos de linkagem (Anchor Texts) para um artigo, priorizando:
1. Hierarquia do silo (Respeite estritamente: Pilar só aponta para Suporte; Suporte aponta para Pilar, Suportes adjacentes; Auxiliares apontam para o Pilar).
2. Coerência semântica e sinônimos (Procure por variações naturais da palavra-chave alvo).
3. Naturalidade humana do texto-âncora (Não soe forçado, não use jargão robótico).
4. Evitar excesso de links para o mesmo alvo.
5. Microadaptacao: quando a melhor oportunidade estiver quase natural, explique em suggested_anchor_modification uma pequena adaptacao de frase que preserva o sentido e cria uma ancora fluida.

Retorne SOMENTE um JSON valido com esta estrutura exata:
{
  "suggestions": [
    {
      "candidate_id": "id-estavel-do-candidato",
      "post_id": "uuid",
      "reason": "Explique o benefício semântico deste link neste ponto",
      "confidence": 0.0,
      "suggested_anchor_modification": "OPCIONAL: Se a âncora atual for genérica ou levemente forçada, sugira uma PEQUENA reescrita da frase para tornar o link mais natural e semanticamente rico."
    }
  ]
}

Regras:
- máximo de ${args.maxSuggestions} itens.
- priorize alvos com melhor score base, hierarquia correta e âncoras muito naturais/relevantes (anchor_text).
- tente cobrir o maior numero possivel de post_id permitidos antes de repetir o mesmo post.
- NÃO invente post_id ou candidate_id. Use apenas os fornecidos nos 'Candidates'.
- NÃO use termos comerciais/produto (preco, amazon, oferta, watts, voltagem, CTA, clique aqui, saiba mais).
- Prefira contexto editorial explicativo e orgânico.
- Se uma ancora exata parecer curta, generica ou incompleta, mantenha o candidate_id e use suggested_anchor_modification para orientar uma micro-reescrita da frase. Nao invente uma URL nova.
- Rejeite candidatos que so funcionariam com uma ancora artificial, mesmo que tenham score alto.
- Respeite rigorosamente a hierarquia do silo (Pilar/Suporte/Aux).
`;

  const payload = {
    article: {
      title: args.title,
      keyword: args.keyword,
      currentRole: args.currentRole,
      currentPosition: args.currentPosition,
      currentSupportIndex: args.currentSupportIndex,
      textExcerpt: args.text.slice(0, 9000),
    },
    candidates: args.candidates.map((candidate) => ({
      candidate_id: candidate.candidateId,
      post_id: candidate.postId,
      title: candidate.title,
      target_keyword: candidate.targetKeyword,
      anchor_mode: candidate.anchorMode,
      role: candidate.role,
      position: candidate.position,
      support_index: candidate.supportIndex,
      natural_anchor: candidate.anchorText,
      anchor_bucket: candidate.anchorBucket,
      hierarchy_reason: hierarchyReason(
        {
          role: args.currentRole,
          position: args.currentPosition,
          supportIndex: args.currentSupportIndex,
        },
        {
          role: candidate.role,
          position: candidate.position,
          supportIndex: candidate.supportIndex,
        }
      ),
      semantic_score: candidate.semanticScore,
      hierarchy_score: candidate.hierarchyScore,
      final_score: candidate.finalScore,
      already_linked: candidate.alreadyLinked,
    })),
    supportSources: args.supportContext.sources.map((source) => ({
      title: source.title,
      guidance: source.guidance,
    })),
  };

  const response = await fetch(
    buildGeminiGenerateContentUrl(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nDados:\n${JSON.stringify(payload)}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") return null;

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed?.suggestions) ? (parsed.suggestions as Array<Record<string, any>>) : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  await requireAdminSession();

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse({
    postId: typeof body?.postId === "string" ? body.postId : undefined,
    siloId: typeof body?.siloId === "string" ? body.siloId : undefined,
    title: typeof body?.title === "string" ? body.title : undefined,
    keyword: typeof body?.keyword === "string" ? body.keyword : undefined,
    text: typeof body?.text === "string" ? body.text : "",
    existingLinks: Array.isArray(body?.existingLinks) ? body.existingLinks : undefined,
    maxSuggestions: typeof body?.maxSuggestions === "number" ? body.maxSuggestions : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request", message: "Payload invalido." }, { status: 400 });
  }

  const rate = checkRateLimit(getClientKey(req), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Limite de sugestoes atingido. Aguarde alguns minutos.",
        retryAt: rate.resetAt,
      },
      { status: 429 }
    );
  }

  const payload = parsed.data;
  if (!payload.siloId) {
    return NextResponse.json({ ok: false, error: "missing_silo", message: "Este post precisa estar em um silo." }, { status: 400 });
  }

  const maxSuggestions = payload.maxSuggestions ?? 8;
  const articleTitle = payload.title?.trim() || "";
  const articleKeyword = payload.keyword?.trim() || "";
  const articleText = payload.text;
  const articleNormalized = normalize(articleText);

  const database = getAdminDatabase();
  const [
    { data: siloData, error: siloError },
    { data: hierarchyData, error: hierarchyError },
  ] = await Promise.all([
    database.from("silos").select("id,slug").eq("id", payload.siloId).maybeSingle(),
    database.from("silo_posts").select("post_id,role,position").eq("silo_id", payload.siloId),
  ]);

  const loadPosts = async (columns: string[]) => {
    return database
      .from("posts")
      .select(columns.join(","))
      .eq("silo_id", payload.siloId)
      .order("updated_at", { ascending: false });
  };

  const requiredPostColumns = ["id", "title", "slug", "target_keyword", "content_html"];
  const optionalPostColumns = new Set(["focus_keyword", "entities"]);
  let selectedPostColumns = [...requiredPostColumns, ...Array.from(optionalPostColumns)];
  let postsData: any[] | null = null;
  let postsError: any = null;
  while (true) {
    const { data, error } = await loadPosts(selectedPostColumns);
    if (!error) {
      postsData = data ?? [];
      postsError = null;
      break;
    }

    const missing = getMissingColumnFromError(error);
    if (!missing || !optionalPostColumns.has(missing) || !selectedPostColumns.includes(missing)) {
      postsError = error;
      break;
    }

    selectedPostColumns = selectedPostColumns.filter((column) => column !== missing);
  }

  const hasFocusKeywordColumn = selectedPostColumns.includes("focus_keyword");
  const hasEntitiesColumn = selectedPostColumns.includes("entities");
  postsData = (postsData ?? []).map((row: any) => ({
    ...row,
    focus_keyword: hasFocusKeywordColumn ? row.focus_keyword ?? null : null,
    entities: hasEntitiesColumn ? row.entities ?? null : null,
  }));

  if (siloError || !siloData) {
    return NextResponse.json({ ok: false, error: "silo_not_found", message: "Silo nao encontrado." }, { status: 404 });
  }
  if (postsError) {
    console.error("[INTERNAL-LINK-SUGGESTIONS] posts query error", {
      message: postsError?.message ?? null,
      code: postsError?.code ?? null,
      details: postsError?.details ?? null,
      hint: postsError?.hint ?? null,
    });
    return NextResponse.json({ ok: false, error: "posts_error", message: "Falha ao carregar posts do silo." }, { status: 500 });
  }
  if (hierarchyError) {
    return NextResponse.json({ ok: false, error: "hierarchy_error", message: "Falha ao carregar hierarquia." }, { status: 500 });
  }

  const normalizedHierarchy = buildNormalizedHierarchy(postsData ?? [], hierarchyData ?? []);
  const hierarchyMap = normalizedHierarchy.map;
  const currentHierarchy = payload.postId ? hierarchyMap.get(payload.postId) ?? null : null;
  const currentRole = currentHierarchy?.role ?? null;
  const currentPosition = currentHierarchy?.position ?? null;
  const currentSupportIndex = currentHierarchy?.supportIndex ?? null;
  const allowedTargets = payload.postId
    ? getAllowedTargets({
      currentPostId: payload.postId,
      hierarchyMap,
      pillarId: normalizedHierarchy.pillarId,
    })
    : null;

  if (payload.postId && !currentHierarchy) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_hierarchy",
        message: "Nao foi possivel identificar a hierarquia deste post no silo.",
      },
      { status: 400 }
    );
  }
  const linkedPostIds = new Set<string>();
  const linkedPaths = new Set<string>();
  (payload.existingLinks ?? []).forEach((link) => {
    if (link?.dataPostId) linkedPostIds.add(link.dataPostId);
    if (link?.href) linkedPaths.add(extractPath(link.href));
  });

  const currentPostRow = payload.postId
    ? (postsData ?? []).find((row: any) => String(row.id) === String(payload.postId))
    : null;
  const currentPlan = findEditorialArticlePlan({
    slug: String(currentPostRow?.slug ?? ""),
    keyword: articleKeyword || String(currentPostRow?.target_keyword ?? currentPostRow?.focus_keyword ?? ""),
    title: articleTitle || String(currentPostRow?.title ?? ""),
  });
  const planLinkAudit = buildExpectedLinkAudit(currentPlan, payload.existingLinks ?? []);
  const linksSupport = buildInternalLinksSupportContext({
    slug: String(currentPostRow?.slug ?? ""),
    title: articleTitle || String(currentPostRow?.title ?? ""),
    keyword: articleKeyword || String(currentPostRow?.target_keyword ?? currentPostRow?.focus_keyword ?? ""),
    text: articleText,
  });
  const expectedTargetSlugs = new Set(currentPlan?.expectedLinks.map((link) => link.targetSlug) ?? []);
  const articleEntities = parseEntities(currentPostRow?.entities);
  const articlePlainText = stripHtml(articleText).slice(0, 18000);
  const semanticDocuments = [
    ...(postsData ?? []).map((row: any) => {
      const title = String(row.title ?? "");
      const targetKeyword = String(row.target_keyword ?? row.focus_keyword ?? title).trim();
      const entities = parseEntities(row.entities).join(" ");
      const content = stripHtml(String(row.content_html ?? "")).slice(0, 18000);
      return tokenizeSemantic(`${title} ${targetKeyword} ${entities} ${content}`);
    }),
    tokenizeSemantic(`${articleTitle} ${articleKeyword} ${articleEntities.join(" ")} ${articlePlainText}`),
  ].filter((tokens) => tokens.length > 0);
  const documentFrequency = buildDocumentFrequencyMap(semanticDocuments);
  const totalSemanticDocs = Math.max(semanticDocuments.length, 1);
  const articleProfile = buildSemanticProfile({
    title: articleTitle || String(currentPostRow?.title ?? ""),
    keyword: articleKeyword || String(currentPostRow?.target_keyword ?? currentPostRow?.focus_keyword ?? ""),
    entities: articleEntities,
    content: articlePlainText,
    documentFrequency,
    totalDocs: totalSemanticDocs,
  });
  const relatedTermsForDiagnostics = (postsData ?? [])
    .filter((row: any) => String(row.id) !== String(payload.postId ?? ""))
    .filter((row: any) => {
      if (!allowedTargets) return true;
      return allowedTargets.has(String(row.id));
    })
    .map((row: any) => String(row.target_keyword ?? row.focus_keyword ?? row.title ?? "").trim())
    .filter(Boolean);
  const semanticDiagnostics = buildSemanticFoundationDiagnostics({
    text: articleText,
    keyword: articleKeyword || String(currentPostRow?.target_keyword ?? currentPostRow?.focus_keyword ?? ""),
    relatedTerms: relatedTermsForDiagnostics,
    entities: articleEntities,
  });

  const postSemanticProfiles = new Map<string, SemanticProfile>();
  (postsData ?? []).forEach((row: any) => {
    const postId = String(row.id ?? "");
    if (!postId) return;
    const title = String(row.title ?? "");
    const targetKeyword = String(row.target_keyword ?? row.focus_keyword ?? title).trim();
    const entities = parseEntities(row.entities);
    const content = stripHtml(String(row.content_html ?? "")).slice(0, 18000);
    const profile = buildSemanticProfile({
      title,
      keyword: targetKeyword,
      entities,
      content,
      documentFrequency,
      totalDocs: totalSemanticDocs,
    });
    postSemanticProfiles.set(postId, profile);
  });

  const targetSignatures: TargetSignature[] = (postsData ?? [])
    .filter((row: any) => String(row.id) !== String(payload.postId ?? ""))
    .map((row: any) => {
      const postId = String(row.id);
      const title = String(row.title ?? "");
      const targetKeyword = String(row.target_keyword ?? row.focus_keyword ?? title).trim();
      const profile = postSemanticProfiles.get(postId);
      return {
        postId,
        tokens: new Set(tokenizeAnchor(`${title} ${targetKeyword}`)),
        semanticTokens: new Set([
          ...tokenizeAnchorSemantic(`${title} ${targetKeyword}`),
          ...Array.from(profile?.keyTerms ?? []),
          ...Array.from(profile?.lsiTerms ?? []),
        ]),
      } satisfies TargetSignature;
    });

  const candidates: Candidate[] = (postsData ?? [])
    .filter((row: any) => String(row.id) !== String(payload.postId ?? ""))
    .filter((row: any) => {
      if (!allowedTargets) return true;
      return allowedTargets.has(String(row.id));
    })
    .flatMap((row: any) => {
      const postId = String(row.id);
      const title = String(row.title ?? "");
      const slug = String(row.slug ?? "");
      const targetKeyword = String(row.target_keyword ?? row.focus_keyword ?? title).trim();
      const url = buildPostCanonicalPath(siloData.slug, slug)!;
      const expectedByPlan = expectedTargetSlugs.has(slug);
      const roleInfo = hierarchyMap.get(postId);
      const role = roleInfo?.role ?? null;
      const position = roleInfo?.position ?? null;
      const supportIndex = roleInfo?.supportIndex ?? null;
      const alreadyLinked = linkedPostIds.has(postId) || linkedPaths.has(extractPath(url));
      const targetProfile =
        postSemanticProfiles.get(postId) ??
        buildSemanticProfile({
          title,
          keyword: targetKeyword,
          entities: parseEntities(row.entities),
          content: stripHtml(String(row.content_html ?? "")).slice(0, 18000),
          documentFrequency,
          totalDocs: totalSemanticDocs,
        });
      const targetSemanticTokens = new Set([
        ...tokenizeAnchorSemantic(`${title} ${targetKeyword}`),
        ...Array.from(targetProfile.keyTerms),
        ...Array.from(targetProfile.lsiTerms),
      ]);

      const strictAnchors = extractNaturalAnchorsForTarget({
        articleText,
        articleNormalized,
        targetPostId: postId,
        targetKeyword,
        targetTitle: title,
        semanticTokens: targetSemanticTokens,
        signatures: targetSignatures,
        limit: 8,
      });
      const relaxedAnchors =
        strictAnchors.length > 0
          ? []
          : extractRelaxedAnchorsForTarget({
              articleText,
              targetKeyword,
              targetTitle: title,
              semanticTokens: targetSemanticTokens,
              limit: 10,
            });
      const naturalAnchors = strictAnchors.length > 0 ? strictAnchors : relaxedAnchors;
      const anchorMode: Candidate["anchorMode"] = strictAnchors.length > 0 ? "strict" : "relaxed";
      if (!naturalAnchors.length) return [];

      const semanticScore = semanticNlpScore(articleProfile, targetProfile);
      const hierarchyScore = strictHierarchyScore(currentHierarchy, roleInfo ?? null);
      const keywordScore = clamp(
        (overlapRatio(targetProfile.keyTerms, articleProfile.keyTerms) * 0.6 +
          overlapRatio(targetProfile.keyTerms, articleProfile.terms) * 0.4) *
          100,
        0,
        100
      );
      const duplicatePenalty = alreadyLinked ? 30 : 0;
      const anchorsByKey = new Map<string, NaturalAnchorOption>();
      naturalAnchors.forEach((naturalAnchor) => {
        const trimmed = trimAnchor(naturalAnchor.text);
        const key = normalize(trimmed);
        if (!trimmed || !key) return;
        const existing = anchorsByKey.get(key);
        if (!existing || naturalAnchor.score > existing.score) {
          anchorsByKey.set(key, { ...naturalAnchor, text: trimmed });
        }
      });

      return Array.from(anchorsByKey.values()).map((naturalAnchor) => {
        const anchorKey = normalize(naturalAnchor.text)
          .replace(/\s+/g, "-")
          .slice(0, 72);
        const candidateId = `${postId}::${anchorMode}::${anchorKey}`;
        const naturalAnchorScore = clamp(naturalAnchor.score, 0, 40);
        const modePenalty = anchorMode === "relaxed" ? 4 : 0;
        const planBoost = expectedByPlan ? 12 : 0;
        const exactKeywordPenalty = exactKeywordAnchorPenalty(naturalAnchor.text, targetKeyword);
        const finalScore = clamp(
          semanticScore * 0.58 +
            hierarchyScore * 0.23 +
            keywordScore * 0.08 +
            naturalAnchorScore * 0.11 +
            planBoost -
            duplicatePenalty -
            modePenalty -
            exactKeywordPenalty,
          0,
          100
        );

        return {
          candidateId,
          anchorMode,
          postId,
          title,
          slug,
          url,
          targetKeyword,
          anchorText: naturalAnchor.text,
          anchorBucket: naturalAnchor.bucket,
          anchorDiscriminativeScore: naturalAnchor.discriminative,
          role,
          position,
          supportIndex,
          semanticScore: Number(semanticScore.toFixed(1)),
          hierarchyScore: Number(hierarchyScore.toFixed(1)),
          keywordScore: Number(keywordScore.toFixed(1)),
          finalScore: Number(finalScore.toFixed(1)),
          expectedByPlan,
          alreadyLinked,
        } satisfies Candidate;
      });
    })
    .filter(
      (item): item is Candidate =>
        Boolean(
          item &&
          item.anchorText &&
          item.anchorDiscriminativeScore >= (item.anchorMode === "relaxed" ? 0.8 : 1.1) &&
          item.anchorText.split(" ").filter(Boolean).length >= 2
        )
    )
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return b.anchorDiscriminativeScore - a.anchorDiscriminativeScore;
    });

  const uniqueAnchorCandidates: Candidate[] = [];
  const seenAnchors = new Set<string>();
  candidates.forEach((candidate) => {
    const key = `${candidate.postId}::${normalize(candidate.anchorText)}`;
    if (!key || seenAnchors.has(key)) return;
    seenAnchors.add(key);
    uniqueAnchorCandidates.push(candidate);
  });

  if (!uniqueAnchorCandidates.length) {
    return NextResponse.json(
      {
        ok: true,
        source: "empty",
        message: "Nao encontrei ancoras naturais e especificas o suficiente para os alvos permitidos.",
        suggestions: [],
        diagnostics: {
          semantic: semanticDiagnostics.coverage,
          structure: semanticDiagnostics.structure,
          warnings: semanticDiagnostics.warnings,
        },
        planLinks: planLinkAudit,
        supportSources: linksSupport.sources,
        supportContext: linksSupport.supportContext,
      },
      { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
    );
  }

  const freshCandidates = uniqueAnchorCandidates.filter((candidate) => !candidate.alreadyLinked);
  const urlByPostId = new Map(
    (postsData ?? []).map((row: any) => {
      const postId = String(row.id ?? "");
      const slug = String(row.slug ?? "");
      const url = slug ? buildPostCanonicalPath(siloData.slug, slug)! : "";
      return [postId, url] as const;
    })
  );
  const requiredTargetIds = allowedTargets ? Array.from(allowedTargets) : [];
  const uncoveredRequiredTargetIds = requiredTargetIds.filter((postId) => {
    if (linkedPostIds.has(postId)) return false;
    const url = urlByPostId.get(postId) ?? "";
    if (url && linkedPaths.has(extractPath(url))) return false;
    return true;
  });
  const coveredCandidatesByTarget = new Set(freshCandidates.map((candidate) => candidate.postId));
  const requiredTargetsWithCandidates = uncoveredRequiredTargetIds.filter((postId) => coveredCandidatesByTarget.has(postId));
  const effectiveCandidates = freshCandidates.length > 0 ? freshCandidates : [];

  if (!effectiveCandidates.length) {
    return NextResponse.json(
      {
        ok: true,
        source: "empty",
        message:
          uncoveredRequiredTargetIds.length > 0
            ? "Nao encontrei novas ancoras naturais para os suportes ainda sem link."
            : "Todos os alvos permitidos para este post ja estao linkados.",
        suggestions: [],
        diagnostics: {
          semantic: semanticDiagnostics.coverage,
          structure: semanticDiagnostics.structure,
          warnings: semanticDiagnostics.warnings,
        },
        totals: {
          candidates: uniqueAnchorCandidates.length,
          linkedAlready: uniqueAnchorCandidates.filter((item) => item.alreadyLinked).length,
          targetsWithCandidates: requiredTargetsWithCandidates.length,
          coveredTargets: 0,
          missingTargets: uncoveredRequiredTargetIds.length,
        },
        hierarchy: {
          strict: true,
          currentRole,
          currentPosition,
          allowedTargets: allowedTargets ? allowedTargets.size : null,
          effectiveMaxSuggestions: 0,
          missingTargetPostIds: uncoveredRequiredTargetIds,
          buckets: { start: 0, mid: 0, end: 0 },
        },
        planLinks: planLinkAudit,
        supportSources: linksSupport.sources,
        supportContext: linksSupport.supportContext,
      },
      { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
    );
  }

  const effectiveMaxSuggestions = clamp(Math.max(maxSuggestions, requiredTargetsWithCandidates.length), 3, 24);

  const shortlist = diversifyByBucket(effectiveCandidates, 72);
  const shortlistByCandidateId = new Map(shortlist.map((candidate) => [candidate.candidateId, candidate]));
  const shortlistByPostId = shortlist.reduce<Map<string, Candidate[]>>((acc, candidate) => {
    const list = acc.get(candidate.postId) ?? [];
    list.push(candidate);
    acc.set(candidate.postId, list);
    return acc;
  }, new Map<string, Candidate[]>());

  const ai = await suggestWithAI({
    title: articleTitle,
    keyword: articleKeyword,
    text: articleText,
    currentRole,
    currentPosition,
    currentSupportIndex,
    maxSuggestions: effectiveMaxSuggestions,
    candidates: shortlist,
    supportContext: linksSupport,
  });

  const selectedCandidateIds = new Set<string>();
  const usedAnchors = new Set<string>();
  const coveredTargets = new Set<string>();
  const suggestions: Array<{
    candidateId: string;
    postId: string;
    title: string;
    url: string;
    slug: string;
    role: Candidate["role"];
    position: number | null;
    anchorBucket: Candidate["anchorBucket"];
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
    expectedByPlan: boolean;
    alreadyLinked: boolean;
  }> = [];

  const tryAddSuggestion = (
    candidate: Candidate,
    source: "ai" | "heuristic",
    score: number,
    reason: string,
    options?: {
      relaxedGate?: boolean;
      suggestedAnchorModification?: string;
      linkingPrinciple?: string;
      semanticBridge?: string;
      sourceGuidance?: string;
    }
  ) => {
    if (selectedCandidateIds.has(candidate.candidateId)) return false;
    if (candidate.alreadyLinked) return false;
    const relaxedGate = options?.relaxedGate === true;
    const minSemantic = relaxedGate ? 0 : candidate.anchorMode === "relaxed" ? 0 : MIN_SUGGESTION_SEMANTIC;
    const minScore = relaxedGate ? 2 : candidate.anchorMode === "relaxed" ? 4 : MIN_SUGGESTION_SCORE;
    if (candidate.semanticScore < minSemantic) return false;
    if (candidate.finalScore < minScore && score < minScore) return false;
    const anchorKey = normalize(candidate.anchorText);
    const isCoverageMissing = !coveredTargets.has(candidate.postId);
    if (anchorKey && usedAnchors.has(anchorKey) && !isCoverageMissing) return false;

    selectedCandidateIds.add(candidate.candidateId);
    if (anchorKey) usedAnchors.add(anchorKey);
    coveredTargets.add(candidate.postId);
    suggestions.push({
      candidateId: candidate.candidateId,
      postId: candidate.postId,
      title: candidate.title,
      url: candidate.url,
      slug: candidate.slug,
      role: candidate.role,
      position: candidate.position,
      anchorBucket: candidate.anchorBucket,
      score: Number(score.toFixed(1)),
      semanticScore: candidate.semanticScore,
      hierarchyScore: candidate.hierarchyScore,
      anchorText: candidate.anchorText,
      reason: candidate.expectedByPlan && !reason.toLowerCase().includes("kgr")
        ? `Esperado pelo plano KGR. ${reason}`
        : reason,
      suggestedAnchorModification:
        typeof options?.suggestedAnchorModification === "string" && options.suggestedAnchorModification.trim()
          ? options.suggestedAnchorModification.trim().slice(0, 360)
          : undefined,
      linkingPrinciple: (options?.linkingPrinciple || buildLinkingPrinciple(candidate, currentHierarchy)).slice(0, 360),
      semanticBridge: (options?.semanticBridge || buildSemanticBridge(candidate)).slice(0, 360),
      sourceGuidance: (options?.sourceGuidance || buildSourceGuidance(linksSupport.sources)).slice(0, 360),
      supportSources: linksSupport.sources.slice(0, 4).map((source) => source.title),
      source,
      expectedByPlan: candidate.expectedByPlan,
      alreadyLinked: candidate.alreadyLinked,
    });
    return true;
  };

  if (Array.isArray(ai) && ai.length > 0) {
    for (const item of ai) {
      const candidateId = String(item?.candidate_id ?? "").trim();
      const postId = String(item?.post_id ?? "");
      const aiAnchorText = String(item?.anchor_text ?? "").trim();

      let candidate: Candidate | undefined;
      if (candidateId) {
        candidate = shortlistByCandidateId.get(candidateId);
      }
      if (!candidate && postId && aiAnchorText) {
        const normalizedAnchor = normalize(aiAnchorText);
        candidate = shortlist.find(
          (entry) => entry.postId === postId && normalize(entry.anchorText) === normalizedAnchor
        );
      }
      if (!candidate && postId) {
        candidate = shortlist.find((entry) => entry.postId === postId && !selectedCandidateIds.has(entry.candidateId));
      }
      if (!candidate) continue;

      const confidenceRaw = Number(item?.confidence);
      const confidence = Number.isFinite(confidenceRaw) ? clamp(confidenceRaw, 0, 1) : 0.65;
      const blendedScore = Number(clamp(candidate.finalScore * 0.72 + confidence * 28, 0, 100).toFixed(1));
      const reason = String(item?.reason ?? "").trim() || fallbackReason(candidate, currentHierarchy);
      const suggestedAnchorModification = String(item?.suggested_anchor_modification ?? "").trim();
      const linkingPrinciple = String(item?.linking_principle ?? "").trim();
      const semanticBridge = String(item?.semantic_bridge ?? "").trim();
      const sourceGuidance = String(item?.source_guidance ?? "").trim();

      tryAddSuggestion(candidate, "ai", blendedScore, reason, {
        suggestedAnchorModification,
        linkingPrinciple,
        semanticBridge,
        sourceGuidance,
      });
      if (suggestions.length >= effectiveMaxSuggestions) break;
    }
  }

  if (suggestions.length < effectiveMaxSuggestions && requiredTargetsWithCandidates.length > 0) {
    for (const targetId of requiredTargetsWithCandidates) {
      if (coveredTargets.has(targetId)) continue;
      const pool = shortlistByPostId.get(targetId) ?? [];
      const preferred =
        pool.find((candidate) => !selectedCandidateIds.has(candidate.candidateId) && !usedAnchors.has(normalize(candidate.anchorText))) ??
        pool.find((candidate) => !selectedCandidateIds.has(candidate.candidateId));
      if (!preferred) continue;

      tryAddSuggestion(preferred, "heuristic", preferred.finalScore, fallbackReason(preferred, currentHierarchy));
      if (suggestions.length >= effectiveMaxSuggestions) break;
    }
  }

  if (suggestions.length < effectiveMaxSuggestions) {
    for (const candidate of shortlist) {
      tryAddSuggestion(candidate, "heuristic", candidate.finalScore, fallbackReason(candidate, currentHierarchy));
      if (suggestions.length >= effectiveMaxSuggestions) break;
    }
  }

  const lowVolumeTarget = Math.min(8, effectiveMaxSuggestions);
  if (suggestions.length < lowVolumeTarget) {
    for (const candidate of shortlist) {
      tryAddSuggestion(
        candidate,
        "heuristic",
        candidate.finalScore,
        fallbackReason(candidate, currentHierarchy),
        { relaxedGate: true }
      );
      if (suggestions.length >= lowVolumeTarget) break;
    }
  }

  const finalSuggestions = diversifySuggestionRows(suggestions, effectiveMaxSuggestions);
  const coveredRequiredTargets = finalSuggestions.reduce((acc, suggestion) => {
    if (uncoveredRequiredTargetIds.includes(suggestion.postId)) acc.add(suggestion.postId);
    return acc;
  }, new Set<string>());
  const missingRequiredTargets = uncoveredRequiredTargetIds.filter((postId) => !coveredRequiredTargets.has(postId));

  return NextResponse.json(
    {
      ok: true,
      source: finalSuggestions.some((item) => item.source === "ai") ? "ai+heuristic" : "heuristic",
      message:
        finalSuggestions.length === 0
          ? "Nenhuma sugestao nova passou no filtro minimo de relevancia. Revise o texto para citar mais termos dos suportes ainda sem link."
          : undefined,
      suggestions: finalSuggestions,
      diagnostics: {
        semantic: semanticDiagnostics.coverage,
        structure: semanticDiagnostics.structure,
        warnings: semanticDiagnostics.warnings,
      },
      totals: {
        candidates: uniqueAnchorCandidates.length,
        strictCandidates: uniqueAnchorCandidates.filter((item) => item.anchorMode === "strict").length,
        relaxedCandidates: uniqueAnchorCandidates.filter((item) => item.anchorMode === "relaxed").length,
        linkedAlready: uniqueAnchorCandidates.filter((item) => item.alreadyLinked).length,
        targetsWithCandidates: requiredTargetsWithCandidates.length,
        coveredTargets: coveredRequiredTargets.size,
        missingTargets: missingRequiredTargets.length,
      },
      hierarchy: {
        strict: true,
        currentRole,
        currentPosition,
        allowedTargets: allowedTargets ? allowedTargets.size : null,
        effectiveMaxSuggestions,
        missingTargetPostIds: missingRequiredTargets,
        buckets: {
          start: finalSuggestions.filter((item) => item.anchorBucket === "START").length,
          mid: finalSuggestions.filter((item) => item.anchorBucket === "MID").length,
          end: finalSuggestions.filter((item) => item.anchorBucket === "END").length,
        },
      },
      planLinks: planLinkAudit,
      supportSources: linksSupport.sources,
      supportContext: linksSupport.supportContext,
    },
    { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
  );
}
