import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/database";
import { authenticateWpRequest } from "@/lib/wp/auth";
import { getOrCreateWpIdByUuid } from "@/lib/wp/id-map";
import { slugify } from "@/lib/wp/slugify";
import { wpError } from "@/lib/wp/response";
import { importContentorHtml } from "@/lib/editor/contentorImport";
import { extractContentorCtas, extractContentorMeta } from "@/lib/editor/contentorMeta";

export const runtime = "nodejs";

function readText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const raw = (value as any).raw;
  if (typeof raw === "string") return raw.trim();
  const rendered = (value as any).rendered;
  if (typeof rendered === "string") return rendered.trim();
  return "";
}

function readHtml(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const raw = (value as any).raw;
  if (typeof raw === "string") return raw;
  const rendered = (value as any).rendered;
  if (typeof rendered === "string") return rendered;
  return "";
}

function buildSlug(payload: any, title: string) {
  const raw =
    typeof payload?.slug_suggested === "string"
      ? payload.slug_suggested
      : typeof payload?.slugSuggested === "string"
        ? payload.slugSuggested
        : typeof payload?.slug === "string"
          ? payload.slug
          : "";
  const base = slugify(raw || title || "") || `post-${Date.now()}`;
  return base;
}

function resolveTargetKeyword(payload: any, title: string, slug: string) {
  const candidates = [
    readText(payload?.target_keyword),
    readText(payload?.focus_keyword),
    readText(payload?.keyword),
    title,
    slug,
  ].filter(Boolean);
  return candidates[0] || slug || title || "post";
}

async function insertPostWithUniqueSlug(payload: Record<string, any>, baseSlug: string) {
  const database = getAdminDatabase();
  let slug = baseSlug;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await database
      .from("posts")
      .insert({ ...payload, slug })
      .select("id, title, slug, content_html, updated_at")
      .maybeSingle();

    if (!error) return data as any;

    if (error?.code === "UNIQUE_VIOLATION") {
      slug = `${baseSlug}-${attempt + 2}`;
      continue;
    }

    throw error;
  }

  throw new Error("Slug collision");
}

function wpPostResponse(args: { id: number; slug: string; title: string; content: string; date: string; status: string; excerpt?: string }) {
  return {
    id: args.id,
    date: args.date,
    status: args.status,
    slug: args.slug,
    title: { rendered: args.title },
    content: { rendered: args.content },
    excerpt: { rendered: args.excerpt ?? "" },
  };
}

export async function GET(req: Request) {
  const auth = await authenticateWpRequest(req);
  if (!auth.ok) {
    return wpError(auth.status, auth.message, auth.code);
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim();

  if (!search) {
    return NextResponse.json([]);
  }

  const database = getAdminDatabase();
  const { data, error } = await database
    .from("posts")
    .select("id, title, slug, content_html, status, updated_at, excerpt")
    .search(["title", "slug"], search)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return wpError(500, error.message || "Failed to fetch posts", "rest_post_query_failed");
  }

  const rows = Array.isArray(data) ? data : [];
  const mapped = await Promise.all(
    rows.map(async (row: any) => {
      const id = await getOrCreateWpIdByUuid("post", row.id);
      return wpPostResponse({
        id,
        date: row.updated_at ?? new Date().toISOString(),
        status: row.status ?? "draft",
        slug: row.slug ?? "",
        title: row.title ?? "",
        content: row.content_html ?? "",
        excerpt: row.excerpt ?? "",
      });
    })
  );

  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const auth = await authenticateWpRequest(req);
  if (!auth.ok) {
    return wpError(auth.status, auth.message, auth.code);
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return wpError(400, "Invalid JSON", "rest_invalid_json");
  }

  const title = readText(payload?.title) || "Sem titulo";
  const content = readHtml(payload?.content);
  const excerpt = readText(payload?.excerpt);
  const metaDescription = readText(payload?.meta_description) || "";
  const now = new Date().toISOString();

  const metaFromPayload = extractContentorMeta(payload);
  const ctasFromPayload = extractContentorCtas(payload);
  const importResult = importContentorHtml(content, { ctas: ctasFromPayload });
  const finalTitle = importResult.title || title;
  const baseSlug = buildSlug(
    {
      ...payload,
      slug_suggested: metaFromPayload.slugSuggested ?? payload?.slug_suggested ?? payload?.slugSuggested,
    },
    finalTitle
  );
  let targetKeyword = resolveTargetKeyword(payload, finalTitle, baseSlug);
  if (metaFromPayload.focusKeyword) targetKeyword = metaFromPayload.focusKeyword;
  const normalizedHtml = importResult.html || content;
  const resolvedMetaTitle = metaFromPayload.seoTitle || finalTitle;
  const resolvedMetaDescription = metaFromPayload.metaDescription || metaDescription;
  if (importResult.warnings.length) {
    console.warn("[contentor] Import warnings", importResult.warnings);
  }
  if (process.env.DEBUG_CONTENTOR_IMPORT === "1") {
    console.info("[contentor] Meta payload", {
      seoTitle: metaFromPayload.seoTitle ? metaFromPayload.seoTitle.length : 0,
      metaDescription: metaFromPayload.metaDescription ? metaFromPayload.metaDescription.length : 0,
      slugSuggested: metaFromPayload.slugSuggested,
      focusKeyword: metaFromPayload.focusKeyword,
    });
    console.info("[contentor] CTA stats", importResult.stats);
    if (metaFromPayload.metaDescription && resolvedMetaDescription !== metaFromPayload.metaDescription) {
      console.info("[contentor] meta_description ignorada (valor atual prevaleceu)");
    }
    if (metaFromPayload.seoTitle && resolvedMetaTitle !== metaFromPayload.seoTitle) {
      console.info("[contentor] seo_title ignorado (valor atual prevaleceu)");
    }
  }

  if (!importResult.doc.meta || typeof importResult.doc.meta !== "object") {
    importResult.doc.meta = {};
  }
  (importResult.doc.meta as any).contentor = metaFromPayload;

  const insertPayload = {
    silo_id: null,
    title: finalTitle,
    seo_title: resolvedMetaTitle,
    slug: baseSlug,
    target_keyword: targetKeyword,
    content_html: normalizedHtml,
    content_json: importResult.doc,
    meta_title: resolvedMetaTitle,
    meta_description: resolvedMetaDescription || null,
    excerpt: excerpt || null,
    status: "draft",
    published: false,
    published_at: null,
    imported_source: "contentor",
    imported_at: now,
    raw_payload: payload,
    updated_at: now,
  };

  let inserted: any;
  try {
    inserted = await insertPostWithUniqueSlug(insertPayload, baseSlug);
  } catch (error: any) {
    return wpError(500, error?.message ?? "Failed to create post", "rest_post_create_failed");
  }

  const wpId = await getOrCreateWpIdByUuid("post", inserted.id);

  return NextResponse.json(
    wpPostResponse({
      id: wpId,
      date: inserted.updated_at ?? now,
      status: "draft",
      slug: inserted.slug,
      title: inserted.title,
      content: inserted.content_html ?? "",
      excerpt: excerpt,
    })
  );
}
