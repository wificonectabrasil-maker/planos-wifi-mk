import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminDatabase } from "@/lib/database";
import { checkRateLimit } from "@/lib/seo/rateLimit";
import { inspectInternalDuplication } from "@/lib/seo/internalDuplication";
import { extractPlainTextForAnalysis } from "@/lib/seo/plagiarism";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  siloId: z.string().uuid(),
  maxMatches: z.number().int().min(3).max(20).optional(),
});

const RATE_LIMIT = {
  limit: 12,
  windowMs: 10 * 60 * 1000,
};

type LoadedPost = {
  id: string;
  title: string;
  slug: string;
  targetKeyword: string | null;
  focusKeyword: string | null;
  contentHtml: string | null;
  contentJson: any;
  role: "PILLAR" | "SUPPORT" | "AUX" | null;
  position: number | null;
};

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `internal-duplication-silo:${ip}`;
}

function hierarchyLabel(post: Pick<LoadedPost, "role" | "position">) {
  const role = post.role === "PILLAR" ? "Pilar" : post.role === "AUX" ? "Auxiliar" : "Suporte";
  const position = typeof post.position === "number" && Number.isFinite(post.position) ? ` #${post.position}` : "";
  return `${role}${position}`;
}

function sortByHierarchy(a: LoadedPost, b: LoadedPost) {
  const roleRank = (post: LoadedPost) => {
    if (post.role === "PILLAR") return 0;
    if (post.role === "SUPPORT") return 1;
    if (post.role === "AUX") return 2;
    return 3;
  };
  const roleDiff = roleRank(a) - roleRank(b);
  if (roleDiff !== 0) return roleDiff;
  const aPosition = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
  const bPosition = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
  if (aPosition !== bPosition) return aPosition - bPosition;
  return a.title.localeCompare(b.title);
}

function pickPostText(post: LoadedPost) {
  return extractPlainTextForAnalysis(post.contentHtml ?? null, post.contentJson) || "";
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const body = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse({
      siloId: typeof body?.siloId === "string" ? body.siloId : "",
      maxMatches:
        typeof body?.maxMatches === "number"
          ? body.maxMatches
          : body?.maxMatches
            ? Number(body.maxMatches)
            : undefined,
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

    const database = getAdminDatabase();
    const { siloId, maxMatches = 8 } = parsed.data;

    const { data: silo, error: siloError } = await database
      .from("silos")
      .select("id, name, slug")
      .eq("id", siloId)
      .maybeSingle();

    if (siloError || !silo) {
      return NextResponse.json({ error: "silo_not_found", message: "Silo nao encontrado." }, { status: 404 });
    }

    const { data: postsData, error: postsError } = await database
      .from("posts")
      .select("id, title, slug, target_keyword, focus_keyword, content_html, content_json")
      .eq("silo_id", siloId);

    if (postsError) {
      return NextResponse.json(
        { error: "posts_error", message: "Falha ao carregar posts do silo." },
        { status: 500 }
      );
    }

    const postIds = (postsData ?? []).map((post: any) => String(post.id));
    const { data: hierarchyData } =
      postIds.length > 0
        ? await database
            .from("silo_posts")
            .select("post_id, role, position")
            .eq("silo_id", siloId)
            .in("post_id", postIds)
        : { data: [] as any[] };

    const hierarchyByPost = new Map(
      (hierarchyData ?? []).map((item: any) => [
        String(item.post_id),
        {
          role: item.role === "PILLAR" || item.role === "SUPPORT" || item.role === "AUX" ? item.role : null,
          position:
            typeof item.position === "number" && Number.isFinite(item.position)
              ? item.position
              : item.position
                ? Number(item.position)
                : null,
        },
      ])
    );

    const posts: LoadedPost[] = (postsData ?? [])
      .map((post: any) => {
        const hierarchy = hierarchyByPost.get(String(post.id));
        return {
          id: String(post.id),
          title: String(post.title ?? "Sem titulo"),
          slug: String(post.slug ?? ""),
          targetKeyword: post.target_keyword ?? null,
          focusKeyword: post.focus_keyword ?? null,
          contentHtml: post.content_html ?? null,
          contentJson: post.content_json ?? null,
          role: hierarchy?.role ?? null,
          position: hierarchy?.position ?? null,
        } satisfies LoadedPost;
      })
      .sort(sortByHierarchy);

    const postMeta = new Map(
      posts.map((post) => [
        post.id,
        {
          title: post.title,
          slug: post.slug,
          hierarchy: hierarchyLabel(post),
          role: post.role,
          position: post.position,
        },
      ])
    );

    const articles = posts.map((post) => {
      const candidates = posts
        .filter((candidate) => candidate.id !== post.id)
        .map((candidate) => ({
          id: candidate.id,
          title: candidate.title,
          slug: candidate.slug,
          targetKeyword: candidate.targetKeyword,
          focusKeyword: candidate.focusKeyword,
          contentHtml: candidate.contentHtml,
          contentJson: candidate.contentJson,
        }));

      const analysis = inspectInternalDuplication({
        text: pickPostText(post),
        targetKeyword: post.targetKeyword || post.focusKeyword,
        maxMatches,
        scope: "silo",
        candidates,
      });
      const enrichSource = (sourcePostId: string) => {
        const source = postMeta.get(sourcePostId);
        return {
          sourceHierarchy: source?.hierarchy ?? null,
          sourceRole: source?.role ?? null,
          sourcePosition: source?.position ?? null,
        };
      };
      const matches = analysis.matches.map((match) => ({
        ...match,
        ...enrichSource(match.sourcePostId),
      }));

      return {
        postId: post.id,
        title: post.title,
        slug: post.slug,
        hierarchy: hierarchyLabel(post),
        role: post.role,
        position: post.position,
        analysis: {
          ...analysis,
          matches,
          articlePairs: analysis.articlePairs.map((pair) => ({
            ...pair,
            ...enrichSource(pair.sourcePostId),
            topMatch: {
              ...pair.topMatch,
              ...enrichSource(pair.topMatch.sourcePostId),
            },
          })),
        },
      };
    });

    return NextResponse.json(
      {
        ok: true,
        silo: {
          id: String(silo.id),
          name: String(silo.name ?? "Silo"),
          slug: String(silo.slug ?? ""),
        },
        articles,
        totals: {
          articles: articles.length,
          suspectChunks: articles.reduce((sum, item) => sum + item.analysis.suspectChunks, 0),
          highRiskChunks: articles.reduce((sum, item) => sum + item.analysis.highRiskChunks, 0),
          rewriteBeforePublish: articles.filter(
            (item) => item.analysis.executiveSummary.status === "rewrite_before_publish"
          ).length,
          monitor: articles.filter((item) => item.analysis.executiveSummary.status === "monitor").length,
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
