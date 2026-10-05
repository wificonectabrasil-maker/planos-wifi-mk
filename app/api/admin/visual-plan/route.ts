import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  EDITORIAL_SEO_POLICY,
  findEditorialArticlePlan,
} from "@/lib/editorial/content-plan";
import { buildBrandVisualEditorialAgentResult } from "@/lib/visual-editorial/agent";

export const runtime = "nodejs";

const PayloadSchema = z.object({
  slug: z.string().max(220).optional(),
  title: z.string().max(260).optional(),
  keyword: z.string().max(220).optional(),
  text: z.string().max(120_000).optional(),
  html: z.string().max(180_000).optional(),
  heroImageUrl: z.string().max(1000).optional(),
  heroImageAlt: z.string().max(500).optional(),
  ogImageUrl: z.string().max(1000).optional(),
  outline: z
    .array(
      z.object({
        text: z.string().max(260).optional(),
        level: z.number().int().min(1).max(6).optional(),
      })
    )
    .max(120)
    .optional(),
  images: z
    .array(
      z.object({
        url: z.string().max(1000).optional(),
        alt: z.string().max(500).optional(),
        kind: z.string().max(60).optional(),
      })
    )
    .max(120)
    .optional(),
  links: z
    .array(
      z.object({
        href: z.string().max(1000).optional(),
        text: z.string().max(500).optional(),
        anchorText: z.string().max(500).optional(),
        dataPostId: z.string().max(120).optional().nullable(),
        targetSlug: z.string().max(220).optional().nullable(),
        type: z.string().max(60).optional().nullable(),
      })
    )
    .max(300)
    .optional(),
});

export async function POST(req: Request) {
  await requireAdminSession();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const payload = parsed.data;
  const articlePlan = findEditorialArticlePlan({
    slug: payload.slug,
    keyword: payload.keyword,
    title: payload.title,
  });

  const visualAgent = buildBrandVisualEditorialAgentResult({
    articlePlan,
    title: payload.title ?? "",
    keyword: payload.keyword ?? "",
    text: payload.text ?? "",
    html: payload.html ?? "",
    outline: payload.outline ?? [],
    images: payload.images ?? [],
    links: payload.links ?? [],
    heroImageUrl: payload.heroImageUrl ?? "",
    heroImageAlt: payload.heroImageAlt ?? "",
    ogImageUrl: payload.ogImageUrl ?? "",
  });

  return NextResponse.json({
    ok: true,
    source: "local_visual_editorial_agent",
    agent: visualAgent.agent,
    articlePlan: articlePlan
      ? {
          siloName: articlePlan.siloName,
          siloSlug: articlePlan.siloSlug,
          role: articlePlan.role,
          slug: articlePlan.slug,
          primaryKeyword: articlePlan.primaryKeyword,
          uniqueIntent: articlePlan.uniqueIntent,
          expectedLinks: articlePlan.expectedLinks,
        }
      : null,
    stylePolicy: EDITORIAL_SEO_POLICY.visualStyle,
    visualAvoid: EDITORIAL_SEO_POLICY.visualAvoid,
    palette: EDITORIAL_SEO_POLICY.visualPalette,
    profile: visualAgent.profile,
    workflow: visualAgent.workflow,
    suggestions: visualAgent.suggestions,
    diagnostics: visualAgent.diagnostics,
    alerts: visualAgent.alerts,
  });
}
