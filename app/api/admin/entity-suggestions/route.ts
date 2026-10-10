import { buildPostCanonicalPath } from "@/lib/seo/canonical";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildGeminiGenerateContentUrl, getGeminiApiKey } from "@/lib/ai/gemini";
import { adminSearchPostsByTitle } from "@/lib/db";
import { checkRateLimit } from "@/lib/seo/rateLimit";
import {
  buildSemanticFoundationDiagnostics,
  dedupeNormalizedTerms,
  extractFrequentTermsPtBr,
  normalizePtBr,
} from "@/lib/seo/semanticFoundation";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  title: z.string().max(220).optional(),
  keyword: z.string().max(180).optional(),
  postId: z.string().uuid().optional(),
  text: z.string().min(80).max(120_000),
  existingEntities: z.array(z.string()).max(80).optional(),
  supportingKeywords: z.array(z.string()).max(120).optional(),
  maxSuggestions: z.number().int().min(3).max(12).optional(),
});

const RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * 60 * 1000,
};

type MentionPost = {
  id: string;
  title: string;
  url: string;
};

type EntitySuggestion = {
  term: string;
  reason: string;
  confidence: number;
  suggestedLinkType: "about" | "mention";
  aboutUrl: string | null;
  mentionPost: MentionPost | null;
};

function getClientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `entity-suggestions:${ip}`;
}

function parseKeywordTerm(raw: string) {
  const parts = raw.split("|").map((part) => part.trim()).filter(Boolean);
  return parts[0] || "";
}

function buildWikipediaUrl(termOrTitle: string) {
  const slug = termOrTitle.trim().replace(/\s+/g, "_");
  return `https://pt.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
}

async function findMentionPost(term: string, currentPostId?: string) {
  try {
    const rows = await adminSearchPostsByTitle(term, 5);
    const candidate = rows.find((row) => row.id !== currentPostId) ?? rows[0];
    if (!candidate) return null;
    return {
      id: candidate.id,
      title: candidate.title,
      url: buildPostCanonicalPath(candidate.silo_slug, candidate.slug)!,
    } satisfies MentionPost;
  } catch {
    return null;
  }
}

const AI_PROMPT = `
Voce e especialista em SEO semantico (LSI + PNL/NLP) para portugues do Brasil.
Recebera dados de um artigo e precisa sugerir entidades para reforco semantico com links.

Regras:
- Retorne no maximo 8 sugestoes objetivas.
- Evite termos genericos e vagos.
- Priorize entidades nomeadas e termos satelite relevantes (tecnicas, materiais, conceitos, marcas, normas, etc).
- Priorize primeiro os termos de suporte ainda nao cobertos no texto.
- Sugira variacoes naturais de linguagem (sem repetir a mesma forma).
- Nao usar termos comerciais genricos sem contexto.
- Para cada item informe:
  - term: entidade sugerida
  - reason: justificativa curta (1 frase)
  - confidence: numero de 0 a 1
  - suggested_link_type: "about" ou "mention"
  - wikipedia_title: titulo de pagina da Wikipedia em portugues (quando fizer sentido)
  - mention_query: termo para buscar post interno relacionado

Resposta obrigatoria em JSON valido:
{
  "suggestions": [
    {
      "term": "...",
      "reason": "...",
      "confidence": 0.0,
      "suggested_link_type": "about",
      "wikipedia_title": "...",
      "mention_query": "..."
    }
  ]
}
`;

async function suggestWithAI(input: {
  title: string;
  keyword: string;
  text: string;
  existingEntities: string[];
  supportingKeywords: string[];
  semanticDiagnostics: ReturnType<typeof buildSemanticFoundationDiagnostics>;
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const payload = {
    title: input.title,
    keyword: input.keyword,
    existingEntities: input.existingEntities.slice(0, 25),
    supportingKeywords: input.supportingKeywords.slice(0, 40),
    text: input.text.slice(0, 14000),
    semanticDiagnostics: input.semanticDiagnostics,
  };

  const response = await fetch(
    buildGeminiGenerateContentUrl(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${AI_PROMPT}\n\nDados:\n${JSON.stringify(payload)}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      }),
    }
  );

  if (!response.ok) return null;

  const json = await response.json().catch(() => null);
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") return null;

  try {
    const parsed = JSON.parse(text);
    const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
    return suggestions as Array<Record<string, any>>;
  } catch {
    return null;
  }
}

function buildFallbackSuggestions(args: {
  existingEntities: string[];
  supportingKeywords: string[];
  text: string;
  maxSuggestions: number;
  semanticDiagnostics: ReturnType<typeof buildSemanticFoundationDiagnostics>;
}) {
  const supportTerms = args.supportingKeywords.map(parseKeywordTerm).filter(Boolean);
  const frequentTerms = extractFrequentTermsPtBr(args.text, { limit: args.maxSuggestions + 4 });
  const uncoveredSupportTerms = args.semanticDiagnostics.coverage.missingRelatedTerms.filter((term) =>
    supportTerms.some((support) => normalizePtBr(support) === normalizePtBr(term))
  );
  const merged = dedupeNormalizedTerms([
    ...uncoveredSupportTerms,
    ...supportTerms,
    ...args.existingEntities,
    ...frequentTerms,
  ]).slice(0, args.maxSuggestions);

  return merged.map((term, index) => ({
    term,
    reason:
      uncoveredSupportTerms.some((candidate) => normalizePtBr(candidate) === normalizePtBr(term))
        ? "Termo de suporte ainda pouco coberto no texto (LSI)."
        : "Termo recorrente no texto e relevante para reforco semantico.",
    confidence: Number((0.72 - index * 0.04).toFixed(2)),
    suggested_link_type: index % 3 === 0 ? "mention" : "about",
    wikipedia_title: term,
    mention_query: term,
  }));
}

function sanitizeTerm(value: any) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  if (cleaned.length < 3 || cleaned.length > 90) return "";
  return cleaned;
}

function sanitizeConfidence(value: any) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.65;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return Number(num.toFixed(2));
}

function sanitizeLinkType(value: any): "about" | "mention" {
  const next = String(value || "").toLowerCase();
  if (next === "mention") return "mention";
  return "about";
}

export async function POST(req: Request) {
  await requireAdminSession();

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse({
    title: typeof body?.title === "string" ? body.title : undefined,
    keyword: typeof body?.keyword === "string" ? body.keyword : undefined,
    postId: typeof body?.postId === "string" ? body.postId : undefined,
    text: typeof body?.text === "string" ? body.text : "",
    existingEntities: Array.isArray(body?.existingEntities) ? body.existingEntities : undefined,
    supportingKeywords: Array.isArray(body?.supportingKeywords) ? body.supportingKeywords : undefined,
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
  const title = payload.title?.trim() || "";
  const keyword = payload.keyword?.trim() || "";
  const text = payload.text;
  const existingEntities = dedupeNormalizedTerms(payload.existingEntities ?? []);
  const supportingKeywords = dedupeNormalizedTerms((payload.supportingKeywords ?? []).map((item) => parseKeywordTerm(item)));
  const maxSuggestions = payload.maxSuggestions ?? 8;
  const semanticDiagnostics = buildSemanticFoundationDiagnostics({
    text,
    keyword,
    relatedTerms: supportingKeywords,
    entities: existingEntities,
  });

  const aiResult = await suggestWithAI({
      title,
      keyword,
      text,
      existingEntities,
      supportingKeywords,
      semanticDiagnostics,
    });

  const usedAi = Array.isArray(aiResult) && aiResult.length > 0;
  const aiRaw =
    aiResult ??
    buildFallbackSuggestions({
      existingEntities,
      supportingKeywords,
      text,
      maxSuggestions,
      semanticDiagnostics,
    });

  const normalizedRaw = Array.isArray(aiRaw) ? aiRaw : [];
  const dedupe = new Set<string>();
  const normalized = normalizedRaw
    .map((item) => {
      const term = sanitizeTerm(item?.term);
      if (!term) return null;
      const key = normalizePtBr(term);
      if (!key || dedupe.has(key)) return null;
      dedupe.add(key);

      return {
        term,
        reason: String(item?.reason || "Entidade relevante para reforco semantico do topico.").trim(),
        confidence: sanitizeConfidence(item?.confidence),
        suggestedLinkType: sanitizeLinkType(item?.suggested_link_type),
        wikipediaTitle: sanitizeTerm(item?.wikipedia_title) || term,
        mentionQuery: sanitizeTerm(item?.mention_query) || term,
      };
    })
    .filter(Boolean)
    .slice(0, maxSuggestions) as Array<{
    term: string;
    reason: string;
    confidence: number;
    suggestedLinkType: "about" | "mention";
    wikipediaTitle: string;
    mentionQuery: string;
  }>;

  const suggestions: EntitySuggestion[] = await Promise.all(
    normalized.map(async (item) => {
      const mentionPost = await findMentionPost(item.mentionQuery, payload.postId);
      return {
        term: item.term,
        reason: item.reason || "Entidade relevante para o tema.",
        confidence: item.confidence,
        suggestedLinkType: item.suggestedLinkType,
        aboutUrl: buildWikipediaUrl(item.wikipediaTitle),
        mentionPost,
      };
    })
  );

  return NextResponse.json(
    {
      ok: true,
      source: usedAi ? "ai" : "fallback",
      suggestions,
      diagnostics: {
        semantic: semanticDiagnostics.coverage,
        structure: semanticDiagnostics.structure,
        warnings: semanticDiagnostics.warnings,
      },
    },
    { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
  );
}
