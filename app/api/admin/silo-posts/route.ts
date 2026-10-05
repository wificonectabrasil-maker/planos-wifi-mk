import { NextRequest, NextResponse } from "next/server";
import { adminGetSiloPost } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminDatabase } from "@/lib/database";
import { getCanonicalSiloSlug } from "@/lib/silo-config";
import { isUuid } from "@/lib/uuid";

function getMissingColumnFromError(error: any): string | null {
  if (!error) return null;
  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  const patterns = [
    /column\s+(?:["]?[a-zA-Z0-9_]+["]?\.)*["]?([a-zA-Z0-9_]+)["]?\s+does not exist/i,
    /Could not find the '([a-zA-Z0-9_]+)' column/i,
    /missing column:\s*["']?([a-zA-Z0-9_]+)["']?/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(message);
    if (match?.[1]) return match[1];
  }
  return null;
}

function isMissingColumnError(error: any): boolean {
  return Boolean(getMissingColumnFromError(error));
}

async function selectSinglePostOrg(database: ReturnType<typeof getAdminDatabase>, siloId: string, postId: string) {
  let columns = ["id", "silo_id", "silo_role", "silo_order", "show_in_silo_menu"];

  for (let attempt = 0; attempt < columns.length; attempt += 1) {
    const { data, error } = await database
      .from("posts")
      .select(columns.join(", "))
      .eq("id", postId)
      .eq("silo_id", siloId)
      .maybeSingle();

    if (!error) return data;

    const missingColumn = getMissingColumnFromError(error);
    if (missingColumn && columns.includes(missingColumn)) {
      columns = columns.filter((column) => column !== missingColumn);
      continue;
    }

    throw error;
  }

  const { data, error } = await database
    .from("posts")
    .select("id, silo_id")
    .eq("id", postId)
    .eq("silo_id", siloId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function selectPostsOrgList(database: ReturnType<typeof getAdminDatabase>, siloId: string) {
  let columns = ["id", "title", "slug", "silo_role", "silo_order", "show_in_silo_menu", "updated_at"];

  for (let attempt = 0; attempt < columns.length; attempt += 1) {
    const { data, error } = await database.from("posts").select(columns.join(", ")).eq("silo_id", siloId);
    if (!error) return data ?? [];

    const missingColumn = getMissingColumnFromError(error);
    if (missingColumn && columns.includes(missingColumn)) {
      columns = columns.filter((column) => column !== missingColumn);
      continue;
    }

    throw error;
  }

  const { data, error } = await database.from("posts").select("id, title, slug, updated_at").eq("silo_id", siloId);
  if (error) throw error;
  return data ?? [];
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(request.url);
    const siloId = searchParams.get("siloId");
    const postId = searchParams.get("postId");

    if (!siloId || !isUuid(siloId)) {
      return NextResponse.json({ error: "Valid siloId required" }, { status: 400 });
    }

    if (postId && !isUuid(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    const database = getAdminDatabase();

    const { data: siloData, error: siloError } = await database
      .from("silos")
      .select("name, slug")
      .eq("id", siloId)
      .maybeSingle();
    if (siloError) {
      return NextResponse.json({ error: "Failed to load silo" }, { status: 500 });
    }



    if (postId) {
      let postData: any = null;
      try {
        postData = await selectSinglePostOrg(database, siloId, postId);
      } catch (postQueryError: any) {
        if (!isMissingColumnError(postQueryError)) {
          return NextResponse.json({ error: "Failed to load post organization" }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to load post organization" }, { status: 500 });
      }

      const siloPost = await adminGetSiloPost(siloId, postId);
      const role = (postData?.silo_role ?? siloPost?.role ?? null) as "PILLAR" | "SUPPORT" | "AUX" | null;
      const order =
        role === "PILLAR" || role === "AUX"
          ? 0
          : typeof postData?.silo_order === "number"
            ? postData.silo_order
            : 0;
      const showInSiloMenu =
        role === "AUX" ? false : typeof postData?.show_in_silo_menu === "boolean" ? postData.show_in_silo_menu : true;

      return NextResponse.json({
        role,
        position: siloPost?.position ?? null,
        silo_order: order,
        show_in_silo_menu: showInSiloMenu,
        siloSlug: siloData?.slug ? getCanonicalSiloSlug(siloData.slug) : null,
        siloName: siloData?.name ?? null,
      });
    }

    let posts: any[] = [];
    try {
      posts = await selectPostsOrgList(database, siloId);
    } catch (postsQueryError: any) {
      return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
    }

    const { data: hierarchy, error: hierarchyError } = await database
      .from("silo_posts")
      .select("post_id, role, position")
      .eq("silo_id", siloId);
    if (hierarchyError && hierarchyError.code !== "TABLE_NOT_FOUND") {
      return NextResponse.json({ error: "Failed to load hierarchy" }, { status: 500 });
    }

    const hierarchyMap = new Map((hierarchy || []).map((item) => [item.post_id, item]));

    const roleRank: Record<string, number> = {
      PILLAR: 0,
      SUPPORT: 1,
      AUX: 2,
      "": 3,
    };

    const items = (posts || [])
      .map((post: any) => {
        const info = hierarchyMap.get(post.id) as any;
        const role = post.silo_role ?? info?.role ?? null;
        const order =
          role === "PILLAR" || role === "AUX"
            ? 0
            : typeof post.silo_order === "number"
              ? post.silo_order
              : 0;
        const showInSiloMenu = role === "AUX" ? false : typeof post.show_in_silo_menu === "boolean" ? post.show_in_silo_menu : true;

        return {
          id: post.id,
          title: post.title,
          slug: post.slug,
          role,
          position: info?.position ?? null,

          silo_order: order,
          show_in_silo_menu: showInSiloMenu,
          updated_at: post.updated_at,
          siloSlug: siloData?.slug ? getCanonicalSiloSlug(siloData.slug) : null,
          siloName: siloData?.name ?? null,
        };
      })
      .sort((a, b) => {
        const roleA = roleRank[a.role ?? ""] ?? 3;
        const roleB = roleRank[b.role ?? ""] ?? 3;
        if (roleA !== roleB) return roleA - roleB;
        if (a.silo_order !== b.silo_order) return a.silo_order - b.silo_order;
        return String(a.title || "").localeCompare(String(b.title || ""), "pt-BR");
      });

    const pillar = items.find((item) => item.role === "PILLAR") ?? null;

    return NextResponse.json({
      siloSlug: siloData?.slug ? getCanonicalSiloSlug(siloData.slug) : null,
      siloName: siloData?.name ?? null,
      pillar,
      items,
    });
  } catch (error) {
    console.error("Error loading silo hierarchy:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
