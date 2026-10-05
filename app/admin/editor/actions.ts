"use server";

import { z } from "zod";
import * as cheerio from "cheerio";
import { revalidatePath } from "next/cache";
import {
  adminDeleteSiloPost,
  adminFindTargetKeywordConflict,
  adminGetPostById,
  adminGetPostLinks,
  adminGetSiloById,
  adminPublishPost,
  adminReplacePostLinks,
  adminUpdatePost,
  adminUpsertSiloPost,
} from "@/lib/db";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildPostCanonicalPath, buildSiloCanonicalPath, normalizeCanonicalPath } from "@/lib/seo/canonical";
import { normalizeSlugInput, SLUG_PATTERN } from "@/lib/slug";

const PostSlugSchema = z
  .string()
  .transform((value) => normalizeSlugInput(value))
  .pipe(
    z
      .string()
      .min(3)
      .max(180)
      .regex(SLUG_PATTERN, "Use apenas letras minusculas, numeros, hifen ou underline no slug.")
  );

const SaveSchema = z.object({
  id: z.string().uuid(),
  silo_id: z.string().uuid(),
  silo_role: z.enum(["PILLAR", "SUPPORT", "AUX"]).nullable().optional(),
  silo_position: z.number().int().min(1).max(100).nullable().optional(),
  title: z.string().min(3).max(180),
  seo_title: z.string().max(180).nullable().optional(),
  meta_title: z.string().max(180).nullable().optional(),
  slug: PostSlugSchema,
  target_keyword: z.string().min(2).max(180),
  supporting_keywords: z.array(z.string()).optional(),
  silo_group: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i)
    .nullable()
    .optional(),
  silo_order: z.number().int().min(0).max(999).nullable().optional(),
  silo_group_order: z.number().int().min(0).max(999).nullable().optional(),
  show_in_silo_menu: z.boolean().nullable().optional(),
  replace_existing_pillar: z.boolean().optional(),
  meta_description: z.string().max(800).nullable().optional(),
  canonical_path: z.string().max(220).nullable().optional(),
  entities: z.array(z.string()).optional(),
  schema_type: z.enum(["article", "review", "faq", "howto"]).optional(),
  faq_json: z.any().optional(),
  howto_json: z.any().optional(),
  hero_image_url: z.string().nullable().optional(),
  hero_image_alt: z.string().nullable().optional(),
  og_image_url: z.string().nullable().optional(),
  images: z.any().optional(),
  cover_image: z.string().nullable().optional(),
  author_name: z.string().max(120).nullable().optional(),
  expert_name: z.string().max(120).nullable().optional(),
  expert_role: z.string().max(120).nullable().optional(),
  expert_bio: z.string().max(500).nullable().optional(),
  expert_credentials: z.string().max(240).nullable().optional(),
  reviewed_by: z.string().max(120).nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  sources: z.any().optional(),
  scheduled_at: z.string().nullable().optional(),
  status: z.enum(["draft", "review", "scheduled", "published"]).optional(),
  content_json: z.any(),
  content_html: z.string(),
  amazon_products: z.any().optional(),
});

const PublishSchema = z.object({
  id: z.string().uuid(),
  published: z.boolean(),
});

type PillarConflictPayload = {
  code: "PILLAR_CONFLICT";
  silo_id: string;
  current_pillar: {
    id: string;
    title: string;
    slug: string;
    silo_order: number | null;
  };
};

function buildPillarConflictError(payload: PillarConflictPayload) {
  return new Error(`PILLAR_CONFLICT::${JSON.stringify(payload)}`);
}

function isPillarUniqueConstraintError(error: any) {
  if (String(error?.code ?? "") !== "UNIQUE_VIOLATION") return false;

  const raw = [error?.message, error?.dbMessage, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return raw.includes("idx_posts_unique_pillar_per_silo");
}

async function revalidatePostPaths(id: string) {
  const post = await adminGetPostById(id);
  if (!post) return;

  const rawSiloSlug = post.silo?.slug ?? null;
  const legacySiloPath = rawSiloSlug ? `/${rawSiloSlug}` : null;
  const legacyPostPath = rawSiloSlug ? `/${rawSiloSlug}/${post.slug}` : null;
  const canonicalSiloPath = buildSiloCanonicalPath(rawSiloSlug);
  const canonicalPostPath = buildPostCanonicalPath(rawSiloSlug, post.slug);

  if (legacySiloPath) {
    revalidatePath(legacySiloPath);
    revalidatePath(`/silos/${rawSiloSlug}`);
  }

  if (legacyPostPath) {
    revalidatePath(legacyPostPath);
  }

  if (canonicalSiloPath && canonicalSiloPath !== legacySiloPath) {
    revalidatePath(canonicalSiloPath);
  }

  if (canonicalPostPath && canonicalPostPath !== legacyPostPath) {
    revalidatePath(canonicalPostPath);
  }

  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

export async function saveEditorPost(payload: unknown) {
  await requireAdminSession();
  const data = SaveSchema.parse(payload);

  const parseResponsiveAttr = (raw?: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
      return null;
    } catch {
      return null;
    }
  };

    const parseJsonArrayAttr = (raw?: string | null) => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };

    const parseNumberArrayAttr = (raw?: string | null) => {
      const parsed = parseJsonArrayAttr(raw);
      if (!parsed) return null;
      const normalized = parsed
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
        .map((item) => Math.round(item * 100) / 100);
      return normalized.length ? normalized : null;
    };

    const parseLayoutAttr = (raw?: string | null) => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    };

  const parseNumberAttr = (raw?: string | null) => {
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseBooleanAttr = (raw?: string | null) => {
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  };

  const hydrateContentJsonFromHtml = (doc: any, html: string) => {
    if (!doc || typeof doc !== "object" || !html) return doc;
    const $ = cheerio.load(html);
    const imageQueue = $("img")
      .map((_idx, el) => ({
        src: $(el).attr("src") || null,
        alt: $(el).attr("alt") || null,
        title: $(el).attr("title") || null,
        width: $(el).attr("width") || null,
        height: $(el).attr("height") || null,
        "data-align": $(el).attr("data-align") || null,
        "data-tablet-align": $(el).attr("data-tablet-align") || null,
        "data-mobile-align": $(el).attr("data-mobile-align") || null,
        widthMode: $(el).attr("data-width-mode") || null,
        maxWidth: parseNumberAttr($(el).attr("data-max-width")),
        wrap: $(el).attr("data-wrap") || null,
        spacingY: $(el).attr("data-spacing-y") || null,
        visibleDesktop: parseBooleanAttr($(el).attr("data-visible-desktop")),
        visibleTablet: parseBooleanAttr($(el).attr("data-visible-tablet")),
        visibleMobile: parseBooleanAttr($(el).attr("data-visible-mobile")),
        responsive: parseResponsiveAttr($(el).attr("data-responsive")),
      }))
      .get();
    const ctaQueue = $("div[data-type='cta-button']")
      .map((_idx, el) => ({
        label: $(el).attr("data-label") || null,
        href: $(el).attr("data-href") || null,
        variant: $(el).attr("data-variant") || null,
        size: $(el).attr("data-size") || null,
        align: $(el).attr("data-align") || null,
        bgColor: $(el).attr("data-bg-color") || null,
        textColor: $(el).attr("data-text-color") || null,
        mobileAlign: $(el).attr("data-mobile-align") || null,
        mobileSize: $(el).attr("data-mobile-size") || null,
        mobileBgColor: $(el).attr("data-mobile-bg-color") || null,
        mobileTextColor: $(el).attr("data-mobile-text-color") || null,
        tabletAlign: $(el).attr("data-tablet-align") || null,
        tabletSize: $(el).attr("data-tablet-size") || null,
        tabletBgColor: $(el).attr("data-tablet-bg-color") || null,
        tabletTextColor: $(el).attr("data-tablet-text-color") || null,
        fullWidth: parseBooleanAttr($(el).attr("data-full-width")),
        spacingY: $(el).attr("data-spacing-y") || null,
        visibleDesktop: parseBooleanAttr($(el).attr("data-visible-desktop")),
        visibleTablet: parseBooleanAttr($(el).attr("data-visible-tablet")),
        visibleMobile: parseBooleanAttr($(el).attr("data-visible-mobile")),
        responsive: parseResponsiveAttr($(el).attr("data-responsive")),
        rel: $(el).attr("data-rel") || null,
        target: $(el).attr("data-target") || null,
        tracking: $(el).attr("data-tracking") || null,
        note: $(el).attr("data-note") || null,
      }))
      .get();
    const tableQueue = $("table")
      .map((_idx, el) => ({
        renderMode: $(el).attr("data-render-mode") || null,
        renderModeTablet: $(el).attr("data-render-mode-tablet") || null,
        renderModeMobile: $(el).attr("data-render-mode-mobile") || null,
        wrapCells: parseBooleanAttr($(el).attr("data-wrap-cells")),
        wrapCellsTablet: parseBooleanAttr($(el).attr("data-wrap-cells-tablet")),
        wrapCellsMobile: parseBooleanAttr($(el).attr("data-wrap-cells-mobile")),
        hiddenColumns: $(el).attr("data-hidden-columns") || null,
        hiddenColumnsTablet: $(el).attr("data-hidden-columns-tablet") || null,
        hiddenColumnsMobile: $(el).attr("data-hidden-columns-mobile") || null,
        columnWidths: parseNumberArrayAttr($(el).attr("data-column-widths")),
        columnWidthsTablet: parseNumberArrayAttr($(el).attr("data-column-widths-tablet")),
        columnWidthsMobile: parseNumberArrayAttr($(el).attr("data-column-widths-mobile")),
        visibleDesktop: parseBooleanAttr($(el).attr("data-visible-desktop")),
        visibleTablet: parseBooleanAttr($(el).attr("data-visible-tablet")),
        visibleMobile: parseBooleanAttr($(el).attr("data-visible-mobile")),
        layout: parseLayoutAttr($(el).attr("data-layout")),
        responsive: parseResponsiveAttr($(el).attr("data-responsive")),
      }))
      .get();
    const faqQueue = $("div[data-type='faq-block']")
      .map((_idx, el) => ({
        renderMode: $(el).attr("data-render-mode") || null,
        visibleDesktop: parseBooleanAttr($(el).attr("data-visible-desktop")),
        visibleTablet: parseBooleanAttr($(el).attr("data-visible-tablet")),
        visibleMobile: parseBooleanAttr($(el).attr("data-visible-mobile")),
        responsive: parseResponsiveAttr($(el).attr("data-responsive")),
        items: parseJsonArrayAttr($(el).attr("data-items")),
      }))
      .get();
    let imageIndex = 0;
    let ctaIndex = 0;
    let tableIndex = 0;
    let faqIndex = 0;

    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node.type === "image") {
        const attrs = node.attrs ?? {};
        let nextImage = imageQueue[imageIndex];

        if (attrs.src && nextImage?.src && attrs.src !== nextImage.src) {
          const matchedIndex = imageQueue.findIndex((item, idx) => idx >= imageIndex && item.src === attrs.src);
          if (matchedIndex >= 0) {
            imageIndex = matchedIndex;
            nextImage = imageQueue[imageIndex];
          }
        }

        if (nextImage && (!attrs.src || !nextImage.src || attrs.src === nextImage.src)) {
          imageIndex += 1;
          node.attrs = {
            ...attrs,
            src: attrs.src ?? nextImage.src ?? null,
            alt: attrs.alt ?? nextImage.alt ?? null,
            title: attrs.title ?? nextImage.title ?? null,
            width: attrs.width ?? nextImage.width ?? null,
            height: attrs.height ?? nextImage.height ?? null,
            "data-align": attrs["data-align"] ?? nextImage["data-align"] ?? null,
            "data-tablet-align": attrs["data-tablet-align"] ?? nextImage["data-tablet-align"] ?? null,
            "data-mobile-align": attrs["data-mobile-align"] ?? nextImage["data-mobile-align"] ?? null,
            widthMode: attrs.widthMode ?? nextImage.widthMode ?? null,
            maxWidth: attrs.maxWidth ?? nextImage.maxWidth ?? null,
            wrap: attrs.wrap ?? nextImage.wrap ?? null,
            spacingY: attrs.spacingY ?? nextImage.spacingY ?? null,
            visibleDesktop: attrs.visibleDesktop ?? nextImage.visibleDesktop ?? true,
            visibleTablet: attrs.visibleTablet ?? nextImage.visibleTablet ?? true,
            visibleMobile: attrs.visibleMobile ?? nextImage.visibleMobile ?? true,
            responsive: attrs.responsive ?? nextImage.responsive ?? null,
          };
        }
      }
      if (node.type === "cta_button") {
        const attrs = node.attrs ?? {};
        const nextCta = ctaQueue[ctaIndex];
        if ((!attrs.href && !attrs.label) && nextCta) {
          ctaIndex += 1;
          node.attrs = { ...attrs, ...nextCta };
        } else if (nextCta) {
          // Preenche apenas campos que estiverem vazios
          node.attrs = {
            ...attrs,
            bgColor: attrs.bgColor ?? nextCta.bgColor ?? null,
            textColor: attrs.textColor ?? nextCta.textColor ?? null,
            mobileAlign: attrs.mobileAlign ?? nextCta.mobileAlign ?? null,
            mobileSize: attrs.mobileSize ?? nextCta.mobileSize ?? null,
            mobileBgColor: attrs.mobileBgColor ?? nextCta.mobileBgColor ?? null,
            mobileTextColor: attrs.mobileTextColor ?? nextCta.mobileTextColor ?? null,
            tabletAlign: attrs.tabletAlign ?? nextCta.tabletAlign ?? null,
            tabletSize: attrs.tabletSize ?? nextCta.tabletSize ?? null,
            tabletBgColor: attrs.tabletBgColor ?? nextCta.tabletBgColor ?? null,
            tabletTextColor: attrs.tabletTextColor ?? nextCta.tabletTextColor ?? null,
            fullWidth: attrs.fullWidth ?? nextCta.fullWidth ?? false,
            spacingY: attrs.spacingY ?? nextCta.spacingY ?? "md",
            visibleDesktop: attrs.visibleDesktop ?? nextCta.visibleDesktop ?? true,
            visibleTablet: attrs.visibleTablet ?? nextCta.visibleTablet ?? true,
            visibleMobile: attrs.visibleMobile ?? nextCta.visibleMobile ?? true,
            responsive: attrs.responsive ?? nextCta.responsive ?? null,
          };
        }
      }
      if (node.type === "table") {
        const attrs = node.attrs ?? {};
        const nextTable = tableQueue[tableIndex];
        if (nextTable) {
          tableIndex += 1;
          node.attrs = {
            ...attrs,
            renderMode: attrs.renderMode ?? nextTable.renderMode ?? "table",
            renderModeTablet: attrs.renderModeTablet ?? nextTable.renderModeTablet ?? null,
            renderModeMobile: attrs.renderModeMobile ?? nextTable.renderModeMobile ?? null,
            wrapCells: attrs.wrapCells ?? nextTable.wrapCells ?? true,
            wrapCellsTablet: attrs.wrapCellsTablet ?? nextTable.wrapCellsTablet ?? null,
            wrapCellsMobile: attrs.wrapCellsMobile ?? nextTable.wrapCellsMobile ?? null,
            hiddenColumns: attrs.hiddenColumns ?? nextTable.hiddenColumns ?? "",
            hiddenColumnsTablet: attrs.hiddenColumnsTablet ?? nextTable.hiddenColumnsTablet ?? null,
            hiddenColumnsMobile: attrs.hiddenColumnsMobile ?? nextTable.hiddenColumnsMobile ?? null,
            columnWidths: attrs.columnWidths ?? nextTable.columnWidths ?? [],
            columnWidthsTablet: attrs.columnWidthsTablet ?? nextTable.columnWidthsTablet ?? null,
            columnWidthsMobile: attrs.columnWidthsMobile ?? nextTable.columnWidthsMobile ?? null,
            visibleDesktop: attrs.visibleDesktop ?? nextTable.visibleDesktop ?? true,
            visibleTablet: attrs.visibleTablet ?? nextTable.visibleTablet ?? true,
            visibleMobile: attrs.visibleMobile ?? nextTable.visibleMobile ?? true,
            layout: attrs.layout ?? nextTable.layout ?? null,
            responsive: attrs.responsive ?? nextTable.responsive ?? null,
          };
        }
      }
      if (node.type === "faq_block") {
        const attrs = node.attrs ?? {};
        const nextFaq = faqQueue[faqIndex];
        if (nextFaq) {
          faqIndex += 1;
          node.attrs = {
            ...attrs,
            items: attrs.items ?? nextFaq.items ?? [],
            renderMode: attrs.renderMode ?? nextFaq.renderMode ?? "expanded",
            visibleDesktop: attrs.visibleDesktop ?? nextFaq.visibleDesktop ?? true,
            visibleTablet: attrs.visibleTablet ?? nextFaq.visibleTablet ?? true,
            visibleMobile: attrs.visibleMobile ?? nextFaq.visibleMobile ?? true,
            responsive: attrs.responsive ?? nextFaq.responsive ?? null,
          };
        }
      }
      if (node.content) walk(node.content);
    };

    walk(doc);
    return doc;
  };

  const post = await adminGetPostById(data.id);
  if (!post) {
    throw new Error("Post nao encontrado");
  }
  const previousSiloId = post.silo_id ?? null;
  const selectedSilo = data.silo_id ? await adminGetSiloById(data.silo_id) : null;
  const finalSiloSlug = selectedSilo?.slug ?? post.silo?.slug ?? null;

  const coverImage =
    typeof data.cover_image === "string" ? (data.cover_image.trim() ? data.cover_image.trim() : null) : undefined;
  const metaDescription =
    typeof data.meta_description === "string"
      ? data.meta_description.trim()
        ? data.meta_description.trim()
        : null
      : undefined;
  const metaTitle =
    typeof data.meta_title === "string" ? (data.meta_title.trim() ? data.meta_title.trim() : null) : undefined;
  const authorName =
    typeof data.author_name === "string" ? (data.author_name.trim() ? data.author_name.trim() : null) : undefined;
  const scheduledAt =
    typeof data.scheduled_at === "string"
      ? data.scheduled_at.trim()
        ? new Date(data.scheduled_at).toISOString()
        : null
      : undefined;
  const reviewedAt =
    typeof data.reviewed_at === "string"
      ? data.reviewed_at.trim()
        ? new Date(data.reviewed_at).toISOString()
        : null
      : undefined;
  const canonicalPath = buildPostCanonicalPath(finalSiloSlug, data.slug) ?? normalizeCanonicalPath(data.canonical_path) ?? null;
  const isPillarRole = data.silo_role === "PILLAR";
  const isAuxRole = data.silo_role === "AUX";
  const normalizedSiloOrder =
    isPillarRole || isAuxRole
      ? 0
      : typeof data.silo_order === "number" && Number.isFinite(data.silo_order)
        ? Math.max(0, Math.trunc(data.silo_order))
        : 0;
  const normalizedShowInSiloMenu =
    isPillarRole ? true : isAuxRole ? false : typeof data.show_in_silo_menu === "boolean" ? data.show_in_silo_menu : true;

  if (data.silo_id && data.silo_role === "PILLAR") {
    const { adminGetSiloPostsBySiloId, adminListPostsBySiloId } = await import("@/lib/db");
    const [existingHierarchy, existingPosts] = await Promise.all([
      adminGetSiloPostsBySiloId(data.silo_id),
      adminListPostsBySiloId(data.silo_id),
    ]);

    let existingPillarPost:
      | {
          id: string;
          title: string;
          slug: string;
          silo_order: number | null;
        }
      | null = null;

    const fromPosts = existingPosts.find((postInSilo) => postInSilo.silo_role === "PILLAR" && postInSilo.id !== data.id);
    if (fromPosts) {
      existingPillarPost = {
        id: fromPosts.id,
        title: fromPosts.title,
        slug: fromPosts.slug,
        silo_order: fromPosts.silo_order ?? null,
      };
    }

    if (!existingPillarPost) {
      const hierarchyPillar = existingHierarchy.find((entry) => entry.role === "PILLAR" && entry.post_id !== data.id);
      if (hierarchyPillar) {
        const hydrated = await adminGetPostById(hierarchyPillar.post_id);
        existingPillarPost = hydrated
          ? {
              id: hydrated.id,
              title: hydrated.title,
              slug: hydrated.slug,
              silo_order: hydrated.silo_order ?? null,
            }
          : null;
      }
    }

    if (existingPillarPost && !data.replace_existing_pillar) {
      throw buildPillarConflictError({
        code: "PILLAR_CONFLICT",
        silo_id: data.silo_id,
        current_pillar: {
          id: existingPillarPost.id,
          title: existingPillarPost.title,
          slug: existingPillarPost.slug,
          silo_order: existingPillarPost.silo_order ?? null,
        },
      });
    }

    if (existingPillarPost && data.replace_existing_pillar) {
      const hierarchyEntry = existingHierarchy.find((entry) => entry.post_id === existingPillarPost?.id);
      if (existingPillarPost.id !== data.id) {
        await adminUpdatePost({
          id: existingPillarPost.id,
          silo_role: "SUPPORT",
        });
        await adminUpsertSiloPost({
          silo_id: data.silo_id,
          post_id: existingPillarPost.id,
          role: "SUPPORT",
          position:
            typeof hierarchyEntry?.position === "number"
              ? hierarchyEntry.position
              : typeof existingPillarPost.silo_order === "number"
                ? Math.max(1, existingPillarPost.silo_order)
                : undefined,
        });
      }
    }
  }

  const hydratedContentJson = hydrateContentJsonFromHtml(data.content_json, data.content_html);

  if (process.env.DEBUG_EDITOR_RESPONSIVE === "1") {
    const counts = {
      nodesWithResponsive: 0,
      nodesWithTabletOverrides: 0,
      nodesWithMobileOverrides: 0,
    };
    const walkResponsive = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walkResponsive);
        return;
      }
      const responsive = node?.attrs?.responsive;
      if (responsive && typeof responsive === "object") {
        counts.nodesWithResponsive += 1;
        if (responsive.tablet && Object.keys(responsive.tablet).length > 0) counts.nodesWithTabletOverrides += 1;
        if (responsive.mobile && Object.keys(responsive.mobile).length > 0) counts.nodesWithMobileOverrides += 1;
      }
      if (node.content) walkResponsive(node.content);
    };
    walkResponsive(hydratedContentJson);
    console.info("[editor-responsive] save payload summary", {
      postId: data.id,
      ...counts,
    });
  }

  try {
    await adminUpdatePost({
      id: data.id,
      silo_id: data.silo_id ?? undefined,
      title: data.title,
      seo_title: data.seo_title?.trim() || null,
      meta_title: metaTitle,
      slug: data.slug,
      target_keyword: data.target_keyword,
      supporting_keywords: data.supporting_keywords ?? [],
      silo_role: data.silo_role ?? null,
      silo_order: normalizedSiloOrder,
      show_in_silo_menu: normalizedShowInSiloMenu,
      meta_description: metaDescription,
      canonical_path: canonicalPath,
      entities: data.entities ?? [],
      schema_type: data.schema_type ?? undefined,
      faq_json: data.faq_json ?? null,
      howto_json: data.howto_json ?? null,
      hero_image_url: data.hero_image_url?.trim() || null,
      hero_image_alt: data.hero_image_alt?.trim() || null,
      og_image_url: data.og_image_url?.trim() || null,
      images: data.images ?? [],
      cover_image: coverImage,
      author_name: authorName,
      expert_name: data.expert_name?.trim() || null,
      expert_role: data.expert_role?.trim() || null,
      expert_bio: data.expert_bio?.trim() || null,
      expert_credentials: data.expert_credentials?.trim() || null,
      reviewed_by: data.reviewed_by?.trim() || null,
      reviewed_at: reviewedAt,
      sources: data.sources ?? [],
      scheduled_at: scheduledAt,
      status: data.status ?? undefined,
      content_json: hydratedContentJson,
      content_html: data.content_html,
      amazon_products: data.amazon_products ?? null,
    });
  } catch (error: any) {
    const conflictByConstraint = data.silo_id && data.silo_role === "PILLAR" && isPillarUniqueConstraintError(error);

    if (conflictByConstraint) {
      const { adminListPostsBySiloId } = await import("@/lib/db");
      const existing = (await adminListPostsBySiloId(data.silo_id)).find(
        (item) => item.silo_role === "PILLAR" && item.id !== data.id
      );
      if (existing) {
        throw buildPillarConflictError({
          code: "PILLAR_CONFLICT",
          silo_id: data.silo_id,
          current_pillar: {
            id: existing.id,
            title: existing.title,
            slug: existing.slug,
            silo_order: existing.silo_order ?? null,
          },
        });
      }
    }

    throw error;
  }

  let links: ExtractedLink[] = [];
  try {
    links = extractLinksFromJson(hydratedContentJson, {
      siloSlug: finalSiloSlug,
    });
  } catch (error) {
    console.error("Falha ao extrair links do JSON, continuando sem links", error);
    links = [];
  }
  try {
    if (links.length) {
      await adminReplacePostLinks(
        data.id,
        links.map((link) => ({
          target_post_id: link.target_post_id,
          target_url: link.target_url,
          anchor_text: link.anchor_text,
          link_type: link.link_type,
          rel_flags: link.rel_flags,
          is_blank: link.is_blank,
        }))
      );
    } else {
      await adminReplacePostLinks(data.id, []);
    }
  } catch (error) {
    console.error("Nao foi possivel sincronizar post_links, seguindo com o save do post", error);
  }

  // ========================================
  // SYNC LINK OCCURRENCES (SILO V2)
  // ========================================
  const finalSiloId = data.silo_id ?? post.silo_id;
  if (finalSiloId && data.content_html) {
    try {
      const { syncLinkOccurrences } = await import("@/lib/silo/siloService");
      await syncLinkOccurrences(finalSiloId, data.id, data.content_html, {
        siloSlug: finalSiloSlug,
        siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
      });
    } catch (error) {
      console.error("Erro ao sincronizar ocorrencias de links (V2):", error);
    }
  }

  // ========================================
  // SYNC SILO IDENTIFIER (role + optional post number)
  // ========================================
  if (data.silo_id) {
    if (previousSiloId && previousSiloId !== data.silo_id) {
      try {
        await adminDeleteSiloPost(previousSiloId, data.id);
      } catch (error) {
        console.error("Erro ao remover hierarquia antiga do silo:", error);
        throw error;
      }
    }

    const resolvedSiloRole = data.silo_role ?? post.silo_role ?? "SUPPORT";
    const resolvedSiloPosition =
      typeof data.silo_position === "number" && Number.isFinite(data.silo_position)
        ? Math.max(1, Math.trunc(data.silo_position))
        : undefined;

    try {
      await adminUpsertSiloPost({
        silo_id: data.silo_id,
        post_id: data.id,
        role: resolvedSiloRole,
        position: resolvedSiloPosition,
      });
    } catch (error) {
      console.error("Erro ao salvar hierarquia do silo:", error);
      throw error;
    }
  }




  if ((data.status ?? undefined) === "published") {
    const validation = await validatePostForPublish(data.id, { links, html: data.content_html ?? "", title: data.title, target_keyword: data.target_keyword, meta_description: metaDescription ?? "" });
    if (validation.errors.length) {
      throw new Error(validation.errors.join(" | "));
    }
  }

  await revalidatePostPaths(data.id);
  return { ok: true as const };
}

export async function setEditorPublishState(payload: unknown) {
  await requireAdminSession();
  const data = PublishSchema.parse(payload);

  if (data.published) {
    const validation = await validatePostForPublish(data.id);
    if (validation.errors.length) {
      throw new Error(validation.errors.join(" | "));
    }
  }

  await adminPublishPost({ id: data.id, published: data.published });
  await revalidatePostPaths(data.id);
  return { ok: true as const };
}

type ExtractedLink = {
  target_post_id: string | null;
  target_url: string | null;
  anchor_text: string;
  link_type: "internal" | "external" | "affiliate" | "about" | "mention";
  rel_flags: string[];
  is_blank: boolean;
};

function walkNode(node: any, activeMarks: any[], links: ExtractedLink[], ctx: { siloSlug: string | null }) {
  if (!node) return;

  // mention node
  if (node.type === "mention") {
    try {
      const rawHref = node.attrs?.href;
      if (typeof rawHref !== "string") return;
      const anchor = node.attrs?.label ?? "";
      links.push({
        target_post_id: node.attrs?.id ?? null,
        target_url: rawHref || null,
        anchor_text: anchor,
        link_type: "mention",
        rel_flags: [],
        is_blank: false,
      });
    } catch {
      return;
    }
    return;
  }

  if (node.type === "affiliateCta") {
    try {
      const href = node.attrs?.url ?? node.attrs?.href;
      if (typeof href !== "string" || !href) return;
      const label = node.attrs?.label ?? "CTA";
      links.push({
        target_post_id: null,
        target_url: href,
        anchor_text: String(label),
        link_type: "affiliate",
        rel_flags: ["sponsored"],
        is_blank: true,
      });
    } catch {
      return;
    }
    return;
  }

  if (node.type === "affiliateProductCard" || node.type === "affiliateProduct") {
    try {
      const href = node.attrs?.url ?? node.attrs?.href;
      if (typeof href !== "string" || !href) return;
      const label = node.attrs?.title ?? "Produto";
      links.push({
        target_post_id: null,
        target_url: href,
        anchor_text: String(label),
        link_type: "affiliate",
        rel_flags: ["sponsored"],
        is_blank: true,
      });
    } catch {
      return;
    }
    return;
  }

  if (node.type === "cta_button") {
    try {
      const href = node.attrs?.href ?? node.attrs?.url;
      if (typeof href !== "string" || !href) return;
      const label = node.attrs?.label ?? "CTA";
      const variant = node.attrs?.variant ?? "";
      const isAffiliate = String(variant).startsWith("amazon");
      const relRaw = String(node.attrs?.rel ?? "");
      const relFlags = relRaw
        .split(/\s+/)
        .map((r) => r.trim())
        .filter(Boolean);
      links.push({
        target_post_id: null,
        target_url: href,
        anchor_text: String(label),
        link_type: isAffiliate ? "affiliate" : href.startsWith("/") ? "internal" : "external",
        rel_flags: relFlags.length ? relFlags : isAffiliate ? ["sponsored"] : [],
        is_blank: node.attrs?.target === "_blank",
      });
    } catch {
      return;
    }
    return;
  }

  const marks = Array.isArray(node.marks) ? node.marks : activeMarks;
  if (node.type === "text") {
    const linkMark = marks?.find((m: any) => m.type === "link");
    if (linkMark) {
      try {
        const attrs = linkMark.attrs ?? {};
        const rawHref = attrs.href;
        if (typeof rawHref !== "string") return;
        const href = rawHref;
        if (!href) return;
        const rel = String(attrs.rel ?? "");
        const relFlags = rel
          .split(/\s+/)
          .map((r) => r.trim())
          .filter(Boolean);
        const isAffiliate = relFlags.includes("sponsored");
        const linkType: ExtractedLink["link_type"] =
          attrs["data-link-type"] ??
          (attrs["data-entity-type"] === "about" ? "about" : isAffiliate ? "affiliate" : href.startsWith("/") ? "internal" : "external");
        const targetPostId = attrs["data-post-id"] ?? null;
        links.push({
          target_post_id: targetPostId || null,
          target_url: href || null,
          anchor_text: node.text ?? "",
          link_type: linkType,
          rel_flags: relFlags,
          is_blank: attrs.target === "_blank",
        });
      } catch {
        return;
      }
    }
  }

  if (Array.isArray(node.content)) {
    node.content.forEach((child: any) => walkNode(child, marks ?? [], links, ctx));
  }
}

function extractLinksFromJson(json: any, ctx: { siloSlug: string | null }): ExtractedLink[] {
  if (!json) return [];
  const links: ExtractedLink[] = [];
  walkNode(json, [], links, ctx);
  return links;
}

function wordCountFromHtml(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

function extractListItemsFromHtml(html: string, limit = 5) {
  if (!html) return [];
  const items: string[] = [];
  const listMatch = html.match(/<(ol|ul)[^>]*>([\s\S]*?)<\/\1>/i);
  if (!listMatch) return items;
  const listHtml = listMatch[2] ?? "";
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = liRegex.exec(listHtml)) && items.length < limit) {
    const raw = match[1] ?? "";
    const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) items.push(text);
  }
  return items;
}

function detectFaqFromHtml(html: string, limit = 3) {
  if (!html) return [];
  const faqs: Array<{ question: string; answer: string }> = [];
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = h2Regex.exec(html)) && faqs.length < limit) {
    const q = (match[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const a = (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (q.endsWith("?") && a) {
      faqs.push({ question: q, answer: a });
    }
  }
  return faqs;
}

function detectYouTubeEmbed(html: string) {
  if (!html) return false;
  return /youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\//i.test(html);
}

function anchorWordCount(links: ExtractedLink[]) {
  return links.reduce((acc, link) => {
    const words = (link.anchor_text || "").trim().split(/\s+/).filter(Boolean).length;
    return acc + words;
  }, 0);
}

function normalizeHrefToPath(href: string): string | null {
  const raw = String(href ?? "").trim();
  if (!raw) return null;
  if (/^(#|mailto:|tel:|javascript:)/i.test(raw)) return null;
  try {
    const url = new URL(raw, "https://local.internal");
    return url.pathname.replace(/\/+$/g, "") || "/";
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeRelativeHrefToSiloPath(href: string, siloSlug: string): string | null {
  const raw = String(href ?? "").trim();
  if (!raw) return null;
  if (/^(#|mailto:|tel:|javascript:)/i.test(raw)) return null;
  if (/^(https?:)?\/\//i.test(raw)) return null;
  if (raw.startsWith("/")) return null;

  const cleaned = raw
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .split(/[?#]/)[0]
    .trim();
  if (!cleaned) return null;

  const normalizedSlug = String(siloSlug ?? "").trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!normalizedSlug) return null;
  return `/${normalizedSlug}/${cleaned}`.replace(/\/+$/g, "");
}

function isInternalHref(href: string): boolean {
  const raw = String(href ?? "").trim();
  if (!raw) return false;
  if (/^(#|mailto:|tel:|javascript:)/i.test(raw)) return false;
  if (/^(https?:)?\/\//i.test(raw)) {
    const path = normalizeHrefToPath(raw);
    return Boolean(path);
  }
  return true;
}

function extractHrefCandidatesFromHtml(html: string): string[] {
  if (!html) return [];
  const $ = cheerio.load(html);
  const fromAnchors = $("a[href]")
    .map((_index, element) => String($(element).attr("href") ?? "").trim())
    .get();
  const fromDataHrefs = $("[data-href]")
    .map((_index, element) => String($(element).attr("data-href") ?? "").trim())
    .get();
  return [...fromAnchors, ...fromDataHrefs].filter(Boolean);
}

function hasSiloReference(href: string, siloSlug: string): boolean {
  const normalizedSlug = safeDecode(String(siloSlug).trim().replace(/^\/+|\/+$/g, "")).toLowerCase();
  if (!normalizedSlug) return false;

  const pathCandidates = [normalizeHrefToPath(href), normalizeRelativeHrefToSiloPath(href, normalizedSlug)].filter(
    Boolean
  ) as string[];
  if (!pathCandidates.length) return false;

  const hubPath = `/silos/${normalizedSlug}`; // legado de hub
  const canonicalHubPath = `/${normalizedSlug}`; // hub atual
  const canonicalPostPrefix = `/${normalizedSlug}/`; // posts do silo
  const legacyPostPrefix = `/silos/${normalizedSlug}/`; // legado antigo /silos/{silo}/{post}

  for (const candidate of pathCandidates) {
    const normalizedPath = safeDecode(candidate).toLowerCase();
    if (normalizedPath === hubPath || normalizedPath === canonicalHubPath) return true;
    if (normalizedPath.startsWith(canonicalPostPrefix) || normalizedPath.startsWith(legacyPostPrefix)) return true;
  }

  return false;
}

export async function validatePostForPublish(
  postId: string,
  opts?: { links?: ExtractedLink[]; html?: string; title?: string; target_keyword?: string; meta_description?: string }
) {
  const post = await adminGetPostById(postId);
  if (!post) {
    return { errors: ["Post nao encontrado"], warnings: [] };
  }

  const links = opts?.links ?? extractLinksFromJson(post.content_json, { siloSlug: post.silo?.slug ?? null });
  const html = opts?.html ?? post.content_html ?? "";
  const totalWords = wordCountFromHtml(html);
  const anchorWords = anchorWordCount(links);
  const density = totalWords ? (anchorWords / totalWords) * 100 : 0;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!post.title || !post.slug || !(opts?.target_keyword ?? post.target_keyword)) {
    errors.push("Campos obrigatorios ausentes (titulo, slug ou target keyword)");
  }
  if (!post.meta_description && !(opts?.meta_description)) {
    warnings.push("Meta description ausente");
  }
  if (post.hero_image_url && !post.hero_image_alt) {
    errors.push("Alt text da imagem de capa Ã© obrigatÃ³rio");
  }

  const siloSlug = post.silo?.slug ?? null;
  if (siloSlug) {
    const normalizedSiloRole = String(post.silo_role ?? "SUPPORT").toUpperCase();
    const isPillarPost = normalizedSiloRole === "PILLAR";
    const hasInternalTarget = links.some((link) => Boolean(link.target_post_id));
    const candidates = [
      ...links.map((link) => (typeof link.target_url === "string" ? link.target_url : "")).filter(Boolean),
      ...extractHrefCandidatesFromHtml(html),
    ];
    const hasAnyInternalLink = hasInternalTarget || candidates.some((href) => isInternalHref(href));
    const hasLinkToSilo = hasInternalTarget || candidates.some((href) => hasSiloReference(href, siloSlug));
    if (!hasLinkToSilo) {
      if (isPillarPost) {
        if (hasAnyInternalLink) {
          warnings.push(
            "Pilar com links internos, mas nenhum para o silo atual. Recomenda-se linkar para o hub ou para suportes/apoio quando existirem."
          );
        } else {
          warnings.push(
            "Post pilar sem link interno para o silo. Recomendado linkar para o hub ou para suportes/apoio quando existirem."
          );
        }
      } else if (hasAnyInternalLink) {
        errors.push(
          "Links internos detectados, mas nenhum aponta para o silo atual. Adicione link para o hub ou para um post do mesmo silo."
        );
      } else {
        errors.push("Necessario pelo menos um link interno para o silo (hub ou post do mesmo silo)");
      }
    }
  }

  const badAffiliate = links.filter((l) => {
    const flags = l.rel_flags ?? [];
    const isAffiliate = l.link_type === "affiliate" || flags.includes("sponsored");
    return isAffiliate && !flags.includes("sponsored");
  });
  if (badAffiliate.length) {
    errors.push("Links de afiliado precisam de rel=sponsored");
  }

  if (density > 4) {
    errors.push("Densidade de ancora acima de 4%");
  } else if (density > 3) {
    warnings.push("Densidade de ancora acima de 3%");
  }

  const targetKw = opts?.target_keyword ?? post.target_keyword;
  if (post.silo_id && targetKw) {
    const conflict = await adminFindTargetKeywordConflict({
      silo_id: post.silo_id,
      target_keyword: targetKw,
      exclude_id: post.id,
    });
    if (conflict) {
      warnings.push("Possivel canibalizacao: target keyword duplicada no silo");
    }
  }

  const storedLinks = await adminGetPostLinks(postId);
  const duplicateAnchors = new Map<string, number>();
  storedLinks.forEach((l) => {
    const anchor = (l.anchor_text ?? "").trim().toLowerCase();
    if (!anchor) return;
    duplicateAnchors.set(anchor, (duplicateAnchors.get(anchor) ?? 0) + 1);
  });
  const repeated = Array.from(duplicateAnchors.entries()).filter(([, count]) => count > 2);
  if (repeated.length) {
    warnings.push("Ancoras repetidas mais de 2x no mesmo post");
  }

  // Schema checklist
  const schemaType = post.schema_type ?? "article";
  if (schemaType === "review") {
    const products = Array.isArray(post.amazon_products) ? post.amazon_products : [];
    if (!products.length) {
      errors.push("Schema Review exige pelo menos 1 produto (amazon_products)");
    }
  }
  if (schemaType === "howto") {
    const steps = Array.isArray(post.howto_json) ? post.howto_json : [];
    if (!steps.length) {
      errors.push("Schema HowTo exige passos (howto_json) ou conteÃºdo estruturado");
    }
  }
  if (schemaType === "faq") {
    const faq = Array.isArray(post.faq_json) ? post.faq_json : [];
    const detectedFaq = detectFaqFromHtml(html);
    if (!faq.length && !detectedFaq.length) {
      errors.push("Schema FAQ exige perguntas e respostas (faq_json ou H2 + parÃ¡grafo)");
    }
  }

  const title = opts?.title ?? post.title ?? "";
  const isTopList = /top|melhor|melhores|lista|ranking/i.test(title);
  if (isTopList) {
    const listItems = extractListItemsFromHtml(html);
    if (listItems.length === 0) {
      warnings.push("Artigo Top Lista detectado, mas nenhuma lista <ol>/<ul> foi encontrada");
    }
  }

  const mentionsVideo = /video|vÃ­deo/i.test(title);
  if (mentionsVideo && !detectYouTubeEmbed(html)) {
    warnings.push("Artigo com vÃ­deo no tÃ­tulo, mas nenhum embed do YouTube foi detectado");
  }

  return { errors, warnings };
}
