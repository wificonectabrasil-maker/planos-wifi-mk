"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminCreatePost,
  adminCreateDraftPost,
  adminCreateSilo,
  adminDeleteSiloPost,
  adminGetPostById,
  adminGetSiloById,
  adminListPostsBySiloId,
  adminDeletePosts,
  adminPublishPost,
  adminUpdatePost,
  adminUpsertSiloPost,
} from "@/lib/db";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildPostCanonicalPath, buildSiloCanonicalPath, normalizeCanonicalPath } from "@/lib/seo/canonical";
import { isUuid } from "@/lib/uuid";
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
  title: z.string().min(3).max(180),
  slug: PostSlugSchema,
  target_keyword: z.string().min(2).max(180),
  supporting_keywords: z.array(z.string()).optional(),
  meta_description: z.string().max(200).optional(),
  meta_title: z.string().max(180).optional(),
  canonical_path: z.string().max(220).optional(),
  entities: z.array(z.string()).optional(),
  schema_type: z.enum(["article", "review", "faq", "howto"]).optional(),
  status: z.enum(["draft", "review", "scheduled", "published"]).optional(),
  scheduled_at: z.string().optional(),
  content_json: z.any(),
  content_html: z.string(),
  amazon_products: z.any().optional(),
});

const PublishSchema = z.object({
  id: z.string().uuid(),
  published: z.boolean(),
});

const ScheduleSchema = z.object({
  id: z.string().uuid(),
  scheduled_at: z.string().optional(),
});

const CreateSchema = z.object({
  silo_id: z.string().uuid(),
  title: z.string().min(3).max(180),
  slug: PostSlugSchema,
  target_keyword: z.string().min(2).max(180),
  supporting_keywords: z.array(z.string()).optional(),
  meta_description: z.string().max(200).optional(),
  entities: z.array(z.string()).optional(),
});

const CreateSiloSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  description: z.string().max(240).optional(),
});

const DeleteSchema = z.object({
  ids: z.array(z.string()),
  confirm_intent: z.string().nullable().optional(),
  confirm_redirect: z.string().nullable().optional(),
  confirm_count: z.string().nullable().optional(),
});

const UpdatePostOrganizationSchema = z.object({
  id: z.string().uuid(),
  silo_id: z.string().uuid(),
  silo_role: z.enum(["PILLAR", "SUPPORT", "AUX"]),
  silo_position: z.string().optional(),
  silo_order: z.string().optional(),
  show_in_silo_menu: z.enum(["0", "1"]).optional(),
});

export type UpdatePostOrganizationState = {
  ok: boolean;
  success: string | null;
  error: string | null;
  canonicalPath: string | null;
};

function revalidateKnownPostPaths(siloSlug: string | null | undefined, postSlug: string | null | undefined) {
  const rawSiloSlug = siloSlug ?? null;
  const legacySiloPath = rawSiloSlug ? `/${rawSiloSlug}` : null;
  const legacyPostPath = rawSiloSlug && postSlug ? `/${rawSiloSlug}/${postSlug}` : null;
  const canonicalSiloPath = buildSiloCanonicalPath(rawSiloSlug);
  const canonicalPostPath = buildPostCanonicalPath(rawSiloSlug, postSlug);

  if (legacySiloPath) {
    revalidatePath(legacySiloPath);
    revalidatePath(`/silos/${rawSiloSlug}`);
    revalidatePath(`/admin/silos/${rawSiloSlug}`);
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
}

async function revalidatePostPaths(id: string) {
  const post = await adminGetPostById(id);
  if (!post) return;

  revalidateKnownPostPaths(post.silo?.slug ?? null, post.slug);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/sitemap.xml");
}

function parsePositiveInt(value: string | undefined, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.trunc(parsed);
}

function parseNonNegativeInt(value: string | undefined, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.trunc(parsed);
}

function parseConfirmedSlugs(value: FormDataEntryValue | null) {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^https?:\/\/[^/]+/i, ""))
        .map((item) => item.split("?")[0]?.split("#")[0] ?? "")
        .map((item) => item.replace(/^\/+|\/+$/g, ""))
        .map((item) => item.split("/").filter(Boolean).at(-1) ?? "")
        .filter(Boolean)
    )
  );
}

function redirectDeleteError(code: string, error?: any): never {
  const params = new URLSearchParams({ delete_error: code });
  const detail = [
    error?.message,
    error?.dbMessage,
    error?.details,
    error?.hint,
    error?.code ? `code=${error.code}` : "",
    typeof error === "string" ? error : "",
  ]
    .filter(Boolean)
    .join(" | ")
    .trim();
  if (detail) params.set("delete_detail", detail.slice(0, 500));
  redirect(`/admin?${params.toString()}`);
}

export async function saveDraft(payload: unknown) {
  await requireAdminSession();
  const data = SaveSchema.parse(payload);
  const post = await adminGetPostById(data.id);
  const canonicalPath = buildPostCanonicalPath(post?.silo?.slug ?? null, data.slug) ?? normalizeCanonicalPath(data.canonical_path) ?? null;

  await adminUpdatePost({
    id: data.id,
    title: data.title,
    slug: data.slug,
    target_keyword: data.target_keyword,
    supporting_keywords: data.supporting_keywords ?? [],
    meta_description: data.meta_description ?? null,
    meta_title: data.meta_title ?? null,
    canonical_path: canonicalPath,
    entities: data.entities ?? [],
    schema_type: data.schema_type ?? undefined,
    status: data.status ?? undefined,
    scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : undefined,
    content_json: data.content_json,
    content_html: data.content_html,
    amazon_products: data.amazon_products ?? null,
  });

  await revalidatePostPaths(data.id);

  return { ok: true as const };
}

export async function setPublishState(payload: unknown | FormData) {
  await requireAdminSession();

  const raw =
    payload instanceof FormData
      ? {
          id: payload.get("id"),
          published: payload.get("published"),
        }
      : payload;

  const data = PublishSchema.parse({
    id: (raw as any)?.id,
    published:
      (raw as any)?.published === "true"
        ? true
        : (raw as any)?.published === "false"
          ? false
          : (raw as any)?.published,
  });

  await adminPublishPost({ id: data.id, published: data.published });
  await revalidatePostPaths(data.id);

  return;
}

export async function schedulePost(formData: FormData) {
  await requireAdminSession();

  const payload = {
    id: String(formData.get("id") ?? ""),
    scheduled_at: String(formData.get("scheduled_at") ?? ""),
  };

  const data = ScheduleSchema.parse(payload);
  const scheduledRaw = data.scheduled_at ? data.scheduled_at.trim() : "";
  const scheduledAt = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;

  await adminUpdatePost({
    id: data.id,
    status: scheduledAt ? "scheduled" : "draft",
    scheduled_at: scheduledAt,
  });

  await revalidatePostPaths(data.id);
  return;
}

export async function createPost(formData: FormData) {
  await requireAdminSession();

  const supporting = String(formData.get("supporting_keywords") ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const entities = String(formData.get("entities") ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    silo_id: String(formData.get("silo_id") ?? ""),
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    target_keyword: String(formData.get("target_keyword") ?? ""),
    supporting_keywords: supporting,
    meta_description: String(formData.get("meta_description") ?? "").trim() || undefined,
    entities,
  };

  const data = CreateSchema.parse(payload);
  const post = await adminCreateDraftPost({
    silo_id: data.silo_id,
    title: data.title,
    slug: data.slug,
    target_keyword: data.target_keyword,
    supporting_keywords: data.supporting_keywords ?? [],
    meta_description: data.meta_description ?? null,
    entities: data.entities ?? [],
  });

  redirect(`/admin/editor/${post.id}`);
}

export async function createSilo(formData: FormData) {
  await requireAdminSession();

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
  };

  const data = CreateSiloSchema.parse(payload);
  await adminCreateSilo({
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
  });

  redirect("/admin/editor/new");
}

export async function updatePostOrganization(
  _prevState: UpdatePostOrganizationState,
  formData: FormData
): Promise<UpdatePostOrganizationState> {
  await requireAdminSession();

  try {
    const parsed = UpdatePostOrganizationSchema.parse({
      id: String(formData.get("id") ?? ""),
      silo_id: String(formData.get("silo_id") ?? ""),
      silo_role: String(formData.get("silo_role") ?? "SUPPORT"),
      silo_position:
        typeof formData.get("silo_position") === "string" ? String(formData.get("silo_position")) : undefined,
      silo_order:
        typeof formData.get("silo_order") === "string" ? String(formData.get("silo_order")) : undefined,
      show_in_silo_menu:
        typeof formData.get("show_in_silo_menu") === "string" ? String(formData.get("show_in_silo_menu")) as "0" | "1" : undefined,
    });

    const [post, silo] = await Promise.all([adminGetPostById(parsed.id), adminGetSiloById(parsed.silo_id)]);
    if (!post) {
      return { ok: false, success: null, error: "Post não encontrado.", canonicalPath: null };
    }
    if (!silo) {
      return { ok: false, success: null, error: "Silo não encontrado.", canonicalPath: null };
    }

    if (parsed.silo_role === "PILLAR") {
      const existingPillar = (await adminListPostsBySiloId(parsed.silo_id)).find(
        (item) => item.id !== parsed.id && item.silo_role === "PILLAR"
      );
      if (existingPillar) {
        return {
          ok: false,
          success: null,
          error: `Já existe um pilar neste silo: ${existingPillar.title}.`,
          canonicalPath: null,
        };
      }
    }

    const isPillarRole = parsed.silo_role === "PILLAR";
    const isAuxRole = parsed.silo_role === "AUX";
    const normalizedOrder = isPillarRole || isAuxRole ? 0 : parseNonNegativeInt(parsed.silo_order, 0);
    const normalizedPosition = isPillarRole ? 1 : parsePositiveInt(parsed.silo_position, 1);
    const showInSiloMenu =
      isPillarRole ? true : isAuxRole ? false : (parsed.show_in_silo_menu ?? "1") === "1";
    const canonicalPath =
      buildPostCanonicalPath(silo.slug, post.slug) ?? normalizeCanonicalPath(post.canonical_path) ?? null;

    if (post.silo_id && post.silo_id !== parsed.silo_id) {
      await adminDeleteSiloPost(post.silo_id, parsed.id);
    }

    const previousSiloSlug = post.silo?.slug ?? null;

    await adminUpdatePost({
      id: parsed.id,
      silo_id: parsed.silo_id,
      silo_role: parsed.silo_role,
      silo_order: normalizedOrder,
      show_in_silo_menu: showInSiloMenu,
      canonical_path: canonicalPath,
    });

    await adminUpsertSiloPost({
      silo_id: parsed.silo_id,
      post_id: parsed.id,
      role: parsed.silo_role,
      position: normalizedPosition,
    });

    if (previousSiloSlug && previousSiloSlug !== silo.slug) {
      revalidateKnownPostPaths(previousSiloSlug, post.slug);
    }

    await revalidatePostPaths(parsed.id);

    return {
      ok: true,
      success: "Organização salva.",
      error: null,
      canonicalPath,
    };
  } catch (error: any) {
    const message = typeof error?.message === "string" ? error.message : "Não foi possível salvar a organização.";
    return {
      ok: false,
      success: null,
      error: message,
      canonicalPath: null,
    };
  }
}

export async function bulkDeletePosts(formData: FormData) {
  await requireAdminSession();
  const rawIds = formData.getAll("ids").map((value) => String(value)).filter(Boolean);
  const confirmedSlugs = parseConfirmedSlugs(formData.get("confirm_intent"));
  const data = DeleteSchema.safeParse({
    ids: rawIds,
    confirm_intent: formData.get("confirm_intent"),
    confirm_redirect: formData.get("confirm_redirect"),
    confirm_count: formData.get("confirm_count"),
  });
  if (!data.success) {
    redirectDeleteError("failed", data.error);
  }

  const validIds = data.data.ids.filter((id) => isUuid(id));
  if (data.data.ids.length > 0 && validIds.length !== data.data.ids.length) {
    redirectDeleteError("failed", new Error("A selecao enviou IDs invalidos. Recarregue o admin e selecione os artigos de novo."));
  }

  let result: Awaited<ReturnType<typeof adminDeletePosts>>;
  try {
    result = await adminDeletePosts(validIds, {
      allowPublicUrlDeletion: true,
      confirmedSlugs,
    });
  } catch (error: any) {
    if (error?.message === "DELETE_SLUGS_REQUIRED") {
      redirect("/admin?delete_error=confirm_slugs");
    }
    if (error?.message === "DELETE_SLUGS_MISMATCH") {
      redirect("/admin?delete_error=slug_mismatch");
    }
    if (error?.message === "URL_GUARDRAILS_NOT_MIGRATED") {
      redirect("/admin?delete_error=guardrails");
    }
    console.error("[ADMIN] bulk delete failed", error);
    redirectDeleteError("failed", error);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");

  const params = new URLSearchParams();
  params.set("deleted", String(result.hardDeleted + result.softDeleted));
  if (result.softDeleted > 0) params.set("redirected", String(result.softDeleted));
  redirect(`/admin?${params.toString()}`);
}
