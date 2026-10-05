import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetPostById } from "@/lib/db";
import { searchCSE } from "@/lib/googleCSE/search";
import { mapSerpProviderError } from "@/lib/serp/errors";
import { SerpProviderError } from "@/lib/serp/provider";
import { inspectExternalUniqueness, extractPlainTextForAnalysis } from "@/lib/seo/plagiarism";
import { checkRateLimit } from "@/lib/seo/rateLimit";

const PayloadSchema = z
  .object({
    text: z.string().min(40).max(120_000).optional(),
    title: z.string().max(220).optional(),
    keyword: z.string().max(180).optional(),
    postId: z.string().uuid().optional(),
    postIds: z.array(z.string().uuid()).min(1).max(12).optional(),
    maxQueries: z.number().int().min(2).max(12).optional(),
    num: z.number().int().min(1).max(10).optional(),
    hl: z.string().min(2).max(10).optional(),
    gl: z.string().min(2).max(5).optional(),
  })
  .refine((value) => Boolean(value.text || value.postId || value.postIds?.length), {
    message: "Informe text, postId ou postIds.",
  });

const RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
};

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `plagiarism:${ip}`;
}

async function analyzeText(args: {
  text: string;
  maxQueries?: number;
  num?: number;
  hl?: string;
  gl?: string;
}) {
  const maxQueries = args.maxQueries ?? 6;
  const num = args.num ?? 5;
  const hl = args.hl?.trim() || "pt-BR";
  const gl = args.gl?.trim().toUpperCase() || "BR";

  return inspectExternalUniqueness({
    text: args.text,
    maxQueries,
    search: async (query) => {
      const response = await searchCSE(query, { num, hl, gl, useCache: true });
      return { items: response.items };
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const body = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse({
      text: typeof body?.text === "string" ? body.text : undefined,
      title: typeof body?.title === "string" ? body.title : undefined,
      keyword: typeof body?.keyword === "string" ? body.keyword : undefined,
      postId: typeof body?.postId === "string" ? body.postId : undefined,
      postIds: Array.isArray(body?.postIds) ? body.postIds : undefined,
      maxQueries: typeof body?.maxQueries === "number" ? body.maxQueries : body?.maxQueries ? Number(body.maxQueries) : undefined,
      num: typeof body?.num === "number" ? body.num : body?.num ? Number(body.num) : undefined,
      hl: typeof body?.hl === "string" ? body.hl : undefined,
      gl: typeof body?.gl === "string" ? body.gl : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request", message: "Payload invalido." }, { status: 400 });
    }

    const rate = checkRateLimit(getClientKey(request), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Limite de inspecoes atingido. Aguarde alguns minutos.",
          retryAt: rate.resetAt,
        },
        { status: 429 }
      );
    }

    const payload = parsed.data;
    const options = {
      maxQueries: payload.maxQueries,
      num: payload.num,
      hl: payload.hl,
      gl: payload.gl,
    };

    if (payload.text) {
      const analysis = await analyzeText({ text: payload.text, ...options });
      return NextResponse.json({ ok: true, analysis }, { headers: { "x-rate-limit-remaining": String(rate.remaining) } });
    }

    if (payload.postId) {
      const post = await adminGetPostById(payload.postId);
      if (!post) {
        return NextResponse.json({ error: "not_found", message: "Post nao encontrado." }, { status: 404 });
      }
      const text = extractPlainTextForAnalysis(post.content_html, post.content_json);
      const analysis = await analyzeText({ text, ...options });
      return NextResponse.json(
        {
          ok: true,
          post: { id: post.id, title: post.title, slug: post.slug },
          analysis,
        },
        { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
      );
    }

    const postIds = payload.postIds ?? [];
    const items: Array<{
      postId: string;
      title: string;
      slug: string;
      analysis: Awaited<ReturnType<typeof analyzeText>> | null;
      error: string | null;
    }> = [];

    for (const postId of postIds) {
      const post = await adminGetPostById(postId);
      if (!post) {
        items.push({
          postId,
          title: "",
          slug: "",
          analysis: null,
          error: "Post nao encontrado.",
        });
        continue;
      }

      try {
        const text = extractPlainTextForAnalysis(post.content_html, post.content_json);
        const analysis = await analyzeText({ text, ...options });
        items.push({
          postId: post.id,
          title: post.title,
          slug: post.slug,
          analysis,
          error: null,
        });
      } catch (error: any) {
        const mappedError =
          error instanceof SerpProviderError
            ? mapSerpProviderError(error).message
            : error?.message || "Falha na analise.";
        items.push({
          postId: post.id,
          title: post.title,
          slug: post.slug,
          analysis: null,
          error: mappedError,
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        items,
      },
      { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
    );
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized", message: "Nao autorizado." }, { status: 401 });
    }
    if (error?.message === "missing_credentials") {
      return NextResponse.json(
        {
          error: "missing_credentials",
          message: "Configure SERPER_API_KEY, SERPAPI_KEY ou GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX.",
        },
        { status: 400 }
      );
    }
    if (error instanceof SerpProviderError) {
      const mapped = mapSerpProviderError(error);
      return NextResponse.json(
        { error: mapped.error, message: mapped.message, details: error.code },
        { status: mapped.status }
      );
    }

    return NextResponse.json({ error: "internal_error", message: "Erro interno." }, { status: 500 });
  }
}
