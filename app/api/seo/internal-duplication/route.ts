import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminDatabase } from "@/lib/database";
import { checkRateLimit } from "@/lib/seo/rateLimit";
import { inspectInternalDuplication } from "@/lib/seo/internalDuplication";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  postId: z.string().uuid().optional(),
  siloId: z.string().uuid().optional(),
  text: z.string().min(80).max(120_000),
  targetKeyword: z.string().max(180).optional(),
  maxMatches: z.number().int().min(3).max(20).optional(),
  scope: z.enum(["silo", "site"]).optional(),
});

const RATE_LIMIT = {
  limit: 30,
  windowMs: 10 * 60 * 1000,
};

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `internal-duplication:${ip}`;
}

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

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const body = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse({
      postId: typeof body?.postId === "string" ? body.postId : undefined,
      siloId: typeof body?.siloId === "string" ? body.siloId : undefined,
      text: typeof body?.text === "string" ? body.text : "",
      targetKeyword: typeof body?.targetKeyword === "string" ? body.targetKeyword : undefined,
      maxMatches:
        typeof body?.maxMatches === "number"
          ? body.maxMatches
          : body?.maxMatches
            ? Number(body.maxMatches)
            : undefined,
      scope: body?.scope === "site" ? "site" : body?.scope === "silo" ? "silo" : undefined,
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
    const scope = payload.scope ?? "silo";
    const database = getAdminDatabase();

    if (scope === "silo" && !payload.siloId) {
      return NextResponse.json({ error: "invalid_request", message: "Informe um silo para comparar no escopo atual." }, { status: 400 });
    }

    if (scope === "silo" && payload.siloId) {
      const { data: siloData, error: siloError } = await database
        .from("silos")
        .select("id, slug")
        .eq("id", payload.siloId)
        .maybeSingle();

      if (siloError || !siloData) {
        return NextResponse.json({ error: "silo_not_found", message: "Silo nao encontrado." }, { status: 404 });
      }
    }

    const columns = [
      "id",
      "title",
      "slug",
      "target_keyword",
      "focus_keyword",
      "content_html",
      "content_json",
    ];

    let selectColumns = [...columns];
    let postsData: any[] = [];
    let postsError: any = null;

    for (let attempt = 0; attempt < columns.length; attempt += 1) {
      let query = database.from("posts").select(selectColumns.join(","));
      if (scope === "silo" && payload.siloId) {
        query = query.eq("silo_id", payload.siloId);
      }
      if (payload.postId) query = query.neq("id", payload.postId);

      const { data, error } = await query;
      if (!error) {
        postsData = data ?? [];
        postsError = null;
        break;
      }

      const missing = getMissingColumnFromError(error);
      if (!missing || !selectColumns.includes(missing)) {
        postsError = error;
        break;
      }
      selectColumns = selectColumns.filter((col) => col !== missing);
      postsError = error;
    }

    if (postsError && postsData.length === 0) {
      return NextResponse.json(
        { error: "posts_error", message: "Falha ao carregar posts internos do silo." },
        { status: 500 }
      );
    }

    const analysis = inspectInternalDuplication({
      text: payload.text,
      targetKeyword: payload.targetKeyword,
      maxMatches: payload.maxMatches,
      scope,
      candidates: postsData.map((post) => ({
        id: String(post.id),
        title: String(post.title ?? "Sem titulo"),
        slug: String(post.slug ?? ""),
        targetKeyword: post.target_keyword ?? null,
        focusKeyword: post.focus_keyword ?? null,
        contentHtml: post.content_html ?? null,
        contentJson: post.content_json ?? null,
      })),
    });

    return NextResponse.json(
      {
        ok: true,
        scope,
        analysis,
        totals: {
          comparedPosts: analysis.comparedPosts,
        },
      },
      { headers: { "x-rate-limit-remaining": String(rate.remaining) } }
    );
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized", message: "Nao autorizado." }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error", message: "Erro interno." }, { status: 500 });
  }
}
