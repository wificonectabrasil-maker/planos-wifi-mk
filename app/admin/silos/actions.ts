"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  adminAddPostToBatch,
  adminCreatePost,
  adminDeleteSilo,
  adminCreateSilo,
  adminCreateSiloBatch,
  adminGetSiloById,
  adminGetSiloPostsBySiloId,
  adminGetSiloBySlug,
  adminListPostsBySiloId,
  adminUpdateSilo,
  adminUpdatePost,
} from "@/lib/db";
import { isUuid } from "@/lib/uuid";

const CreateBatchSchema = z.object({
  siloSlug: z.string().min(1),
  name: z.string().min(3),
  count: z.number().min(3).max(10),
});

export async function createBatchWithPosts(formData: FormData) {
  await requireAdminSession();
  const siloSlug = String(formData.get("siloSlug") ?? "");
  const name = String(formData.get("name") ?? "").trim() || `Batch ${new Date().toISOString().slice(0, 10)}`;
  const count = Number(formData.get("count") ?? 5);

  const payload = CreateBatchSchema.parse({ siloSlug, name, count });
  const silo = await adminGetSiloBySlug(payload.siloSlug);
  if (!silo) {
    throw new Error("Silo nao encontrado");
  }

  const batch = await adminCreateSiloBatch({ silo_id: silo.id, name: payload.name, status: "draft" });

  for (let i = 0; i < payload.count; i++) {
    const title = `Post de teste ${i + 1}`;
    const slug = `${silo.slug}-draft-${Date.now()}-${i + 1}`;
    const post = await adminCreatePost({
      silo_id: silo.id,
      title,
      slug,
      target_keyword: `keyword-${i + 1}`,
      supporting_keywords: [],
      meta_description: null,
      entities: [],
    });
    await adminAddPostToBatch({ batch_id: batch.id, post_id: post.id, position: i + 1 });
  }

  redirect(`/admin/silos/${silo.slug}/batch/${batch.id}`);
}


const CreateSiloSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  pillar_content_html: z.string().optional().nullable(),
  menu_order: z.number().int().optional().nullable(),
  is_active: z.boolean().optional(),
  show_in_navigation: z.boolean().optional(),
});

export async function createSiloAction(formData: FormData) {
  await requireAdminSession();
  const rawMenuOrder = typeof formData.get("menu_order") === "string" ? String(formData.get("menu_order")) : "";
  const parsedMenuOrder = Number.parseInt(rawMenuOrder, 10);
  const payload = CreateSiloSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: toNullableText(formData.get("description")),
    pillar_content_html: toNullableText(formData.get("pillar_content_html")),
    menu_order: Number.isFinite(parsedMenuOrder) ? parsedMenuOrder : null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "1",
    show_in_navigation: formData.get("show_in_navigation") === "on" || formData.get("show_in_navigation") === "1",
  });

  const created = await adminCreateSilo({
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
  });

  await adminUpdateSilo(created.id, {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    pillar_content_html: payload.pillar_content_html,
    menu_order: payload.menu_order ?? 0,
    is_active: payload.is_active ?? true,
    show_in_navigation: payload.show_in_navigation ?? true,
  });

  redirect(`/admin/silos/${created.slug}`);
}

const UpdateSiloSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  hero_image_url: z.string().optional().nullable(),
  hero_image_alt: z.string().optional().nullable(),
  pillar_content_html: z.string().optional().nullable(),
  menu_order: z.number().int().optional().nullable(),
  is_active: z.boolean().optional(),
  show_in_navigation: z.boolean().optional(),
});

function toNullableText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateSiloAction(formData: FormData) {
  await requireAdminSession();
  const rawMenuOrder = typeof formData.get("menu_order") === "string" ? String(formData.get("menu_order")) : "";
  const parsedMenuOrder = Number.parseInt(rawMenuOrder, 10);
  const payload = UpdateSiloSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: toNullableText(formData.get("description")),
    meta_title: toNullableText(formData.get("meta_title")),
    meta_description: toNullableText(formData.get("meta_description")),
    hero_image_url: toNullableText(formData.get("hero_image_url")),
    hero_image_alt: toNullableText(formData.get("hero_image_alt")),
    pillar_content_html: toNullableText(formData.get("pillar_content_html")),
    menu_order: Number.isFinite(parsedMenuOrder) ? parsedMenuOrder : null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "1",
    show_in_navigation: formData.get("show_in_navigation") === "on" || formData.get("show_in_navigation") === "1",
  });

  await adminUpdateSilo(payload.id, {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    meta_title: payload.meta_title,
    meta_description: payload.meta_description,
    hero_image_url: payload.hero_image_url,
    hero_image_alt: payload.hero_image_alt,
    pillar_content_html: payload.pillar_content_html,
    menu_order: payload.menu_order ?? 0,
    is_active: payload.is_active ?? true,
    show_in_navigation: payload.show_in_navigation ?? true,
  });
  redirect(`/admin/silos/${payload.slug}`);
}


const DeleteSiloSchema = z.object({
  id: z.string().uuid(),
  return_to: z.string().optional(),
  confirm_delete: z.literal("1"),
});

function toSafeReturnPath(path: string | null | undefined) {
  if (!path) return "/admin/silos";
  return path.startsWith("/") ? path : "/admin/silos";
}

export async function deleteSiloAction(formData: FormData) {
  await requireAdminSession();

  const returnTo = toSafeReturnPath(
    typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : undefined
  );

  const parsed = DeleteSiloSchema.safeParse({
    id: formData.get("id"),
    return_to: formData.get("return_to"),
    confirm_delete: formData.get("confirm_delete"),
  });

  if (!parsed.success) {
    redirect(`${returnTo}?error=confirm_required`);
  }

  try {
    await adminDeleteSilo(parsed.data.id);
    redirect("/admin/silos?deleted=1");
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "SILO_HAS_POSTS") {
      redirect(`${returnTo}?error=has_posts`);
    }
    if (message === "SILO_HAS_BATCHES") {
      redirect(`${returnTo}?error=has_batches`);
    }
    redirect(`${returnTo}?error=delete_failed`);
  }
}
