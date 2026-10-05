import type { Post } from "@/lib/types";
import type { SerpItem } from "@/lib/google/types";
import { getEditorialArticlePlan } from "@/lib/editorial/content-plan";

export type CannibalizationPair = {
  postAId: string;
  postBId: string;
  similarityScore: number;
  serpOverlapScore?: number | null;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
  uniqueIntentA?: string | null;
  uniqueIntentB?: string | null;
};

export type SerpResultsByPost = Record<string, { items: SerpItem[]; totalResults?: number } | undefined>;

type PostInput = Pick<Post, "id" | "title" | "slug" | "content_html" | "content_json" | "target_keyword"> & {
  focus_keyword?: string | null;
};

const DEFAULT_SNIPPET_WORDS = 600;
const DEFAULT_INTENT_WORDS = 220;

function stripHtml(html: string) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromJson(node: any): string {
  if (!node) return "";
  if (node.type === "text") return typeof node.text === "string" ? node.text : "";
  if (!Array.isArray(node.content)) return "";
  return node.content.map(extractTextFromJson).join(" ");
}

function extractHeadingsFromJson(node: any, acc: string[] = []) {
  if (!node) return acc;
  if (node.type === "heading") {
    const text = extractTextFromJson(node);
    if (text) acc.push(text);
  }
  if (Array.isArray(node.content)) {
    node.content.forEach((child: any) => extractHeadingsFromJson(child, acc));
  }
  return acc;
}

function extractHeadingsFromHtml(html: string) {
  const headings: string[] = [];
  const regex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(html))) {
    const text = stripHtml(match[1] ?? "");
    if (text.trim()) headings.push(text.trim());
  }
  return headings;
}

function extractPlainText(content: string | any) {
  if (!content) return "";
  if (typeof content === "string") return stripHtml(content);
  return extractTextFromJson(content);
}

function buildFingerprint(post: PostInput) {
  const title = post.title ?? "";
  const headings = typeof post.content_html === "string" ? extractHeadingsFromHtml(post.content_html) : extractHeadingsFromJson(post.content_json);
  const rawText = extractPlainText(post.content_html || post.content_json || "");
  const words = normalizeText(rawText).split(" ").filter(Boolean);
  const snippet = words.slice(0, DEFAULT_SNIPPET_WORDS).join(" ");
  return normalizeText([title, headings.join(" "), snippet].join(" "));
}

function tokenizeFingerprint(fingerprint: string) {
  if (!fingerprint) return [];
  return fingerprint.split(" ").filter((token) => token.length > 2);
}

function sliceWords(text: string, limit: number) {
  return normalizeText(text)
    .split(" ")
    .filter(Boolean)
    .slice(0, limit)
    .join(" ");
}

function extractPostSignals(post: PostInput) {
  const title = normalizeText(post.title ?? "");
  const keyword = normalizeText(getPostQuery(post));
  const headings =
    typeof post.content_html === "string"
      ? extractHeadingsFromHtml(post.content_html)
      : extractHeadingsFromJson(post.content_json);
  const headingsText = normalizeText(headings.join(" "));
  const plainText = extractPlainText(post.content_html || post.content_json || "");
  const snippet = sliceWords(plainText, DEFAULT_INTENT_WORDS);
  const fingerprint = buildFingerprint(post);

  return {
    titleTokens: tokenizeFingerprint(title),
    keywordTokens: tokenizeFingerprint(keyword),
    headingsTokens: tokenizeFingerprint(headingsText),
    snippetTokens: tokenizeFingerprint(snippet),
    fingerprintTokens: tokenizeFingerprint(fingerprint),
  };
}

function computeIntentSimilarity(
  a: ReturnType<typeof extractPostSignals>,
  b: ReturnType<typeof extractPostSignals>
) {
  const titleScore = jaccard(a.titleTokens, b.titleTokens);
  const keywordScore = jaccard(a.keywordTokens, b.keywordTokens);
  const headingsScore = jaccard(a.headingsTokens, b.headingsTokens);
  const snippetScore = jaccard(a.snippetTokens, b.snippetTokens);
  const fingerprintScore = jaccard(a.fingerprintTokens, b.fingerprintTokens);

  let score =
    keywordScore * 0.34 +
    titleScore * 0.22 +
    headingsScore * 0.18 +
    snippetScore * 0.14 +
    fingerprintScore * 0.12;

  if (keywordScore >= 0.7) score += 0.12;
  if (titleScore >= 0.7) score += 0.08;
  if (headingsScore >= 0.5 && keywordScore >= 0.45) score += 0.06;

  return Math.min(1, score);
}

function jaccard(tokensA: string[], tokensB: string[]) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function getPostQuery(post: PostInput) {
  return (
    post.focus_keyword?.trim() ||
    post.target_keyword?.trim() ||
    post.title?.trim() ||
    ""
  );
}

export function deriveRiskLevel(similarityScore: number, serpOverlapScore?: number | null): "low" | "medium" | "high" {
  if (typeof serpOverlapScore === "number") {
    if ((similarityScore >= 0.58 && serpOverlapScore >= 0.35) || (similarityScore >= 0.72 && serpOverlapScore >= 0.2)) return "high";
    if (similarityScore >= 0.42 || serpOverlapScore >= 0.3) return "medium";
    return "low";
  }
  if (similarityScore >= 0.62) return "high";
  if (similarityScore >= 0.4) return "medium";
  return "low";
}

export function buildRecommendation(
  similarityScore: number,
  serpOverlapScore?: number | null,
  riskLevel?: "low" | "medium" | "high",
  planContext?: { uniqueIntentA?: string | null; uniqueIntentB?: string | null }
) {
  const risk = riskLevel ?? deriveRiskLevel(similarityScore, serpOverlapScore);
  const planNote =
    planContext?.uniqueIntentA || planContext?.uniqueIntentB
      ? ` Plano KGR: A deve defender "${planContext.uniqueIntentA ?? "intencao propria"}"; B deve defender "${planContext.uniqueIntentB ?? "intencao propria"}".`
      : "";
  if (risk === "high") {
    return `Separar intencoes: ajuste H2/H3 para subtemas exclusivos, revise o foco da keyword e considere diferenciar formato, mover trecho, linkar com ancora natural ou canonicalizar se houver duplicacao real.${planNote}`;
  }
  if (risk === "medium") {
    return `Refinar angulo e headings para reduzir sobreposicao. Use exemplos, FAQ ou comparativos distintos e conecte os artigos com link interno quando um complementar o outro.${planNote}`;
  }
  return `Sem canibalizacao forte detectada. Mantenha monitoramento conforme novos posts entrarem no silo.${planNote}`;
}

export function buildInternalSimilarity(posts: PostInput[]): CannibalizationPair[] {
  const signalsByPost = new Map<string, ReturnType<typeof extractPostSignals>>();
  posts.forEach((post) => {
    signalsByPost.set(post.id, extractPostSignals(post));
  });

  const pairs: CannibalizationPair[] = [];
  for (let i = 0; i < posts.length; i += 1) {
    for (let j = i + 1; j < posts.length; j += 1) {
      const a = posts[i];
      const b = posts[j];
      const score = computeIntentSimilarity(signalsByPost.get(a.id)!, signalsByPost.get(b.id)!);
      const risk = deriveRiskLevel(score, null);
      const planA = getEditorialArticlePlan(a.slug);
      const planB = getEditorialArticlePlan(b.slug);
      pairs.push({
        postAId: a.id,
        postBId: b.id,
        similarityScore: Number(score.toFixed(3)),
        serpOverlapScore: null,
        riskLevel: risk,
        recommendation: buildRecommendation(score, null, risk, {
          uniqueIntentA: planA?.uniqueIntent ?? null,
          uniqueIntentB: planB?.uniqueIntent ?? null,
        }),
        uniqueIntentA: planA?.uniqueIntent ?? null,
        uniqueIntentB: planB?.uniqueIntent ?? null,
      });
    }
  }

  return pairs.sort((x, y) => y.similarityScore - x.similarityScore);
}

function normalizeSerpUrl(link: string) {
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./i, "");
    const path = url.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return link.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function extractDomain(item: SerpItem) {
  if (item.displayLink) return item.displayLink.replace(/^www\./i, "");
  try {
    return new URL(item.link).hostname.replace(/^www\./i, "");
  } catch {
    return item.link.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

export function computeSerpOverlapScore(itemsA: SerpItem[] = [], itemsB: SerpItem[] = []) {
  const urlSetA = new Set(itemsA.map((item) => normalizeSerpUrl(item.link)));
  const urlSetB = new Set(itemsB.map((item) => normalizeSerpUrl(item.link)));
  const domainSetA = new Set(itemsA.map(extractDomain));
  const domainSetB = new Set(itemsB.map(extractDomain));

  const urlIntersection = Array.from(urlSetA).filter((url) => urlSetB.has(url)).length;
  const domainIntersection = Array.from(domainSetA).filter((domain) => domainSetB.has(domain)).length;

  const urlDenom = Math.max(1, Math.min(urlSetA.size, urlSetB.size));
  const domainDenom = Math.max(1, Math.min(domainSetA.size, domainSetB.size));

  const urlOverlap = urlIntersection / urlDenom;
  const domainOverlap = domainIntersection / domainDenom;
  const score = urlOverlap * 0.6 + domainOverlap * 0.4;

  return {
    urlOverlap: Number(urlOverlap.toFixed(3)),
    domainOverlap: Number(domainOverlap.toFixed(3)),
    score: Number(score.toFixed(3)),
  };
}

export function applySerpOverlapToPairs(pairs: CannibalizationPair[], serpResults: SerpResultsByPost): CannibalizationPair[] {
  return pairs.map((pair) => {
    const a = serpResults[pair.postAId];
    const b = serpResults[pair.postBId];
    const serpScore = a && b ? computeSerpOverlapScore(a.items, b.items).score : null;
    const risk = deriveRiskLevel(pair.similarityScore, serpScore);
    return {
      ...pair,
      serpOverlapScore: serpScore,
      riskLevel: risk,
      recommendation: buildRecommendation(pair.similarityScore, serpScore, risk, {
        uniqueIntentA: pair.uniqueIntentA,
        uniqueIntentB: pair.uniqueIntentB,
      }),
    };
  });
}
