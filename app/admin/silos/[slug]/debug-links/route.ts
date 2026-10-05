import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetSiloBySlug } from "@/lib/db";
import { getAdminDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  await requireAdminSession();
  const { slug } = await params;
  const silo = await adminGetSiloBySlug(slug);
  if (!silo) {
    return NextResponse.json({ error: "silo_not_found" }, { status: 404 });
  }

  const database = getAdminDatabase();

  const { count: postsCount } = await database
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("silo_id", silo.id);

  const { count: occurrencesTotalCount } = await database
    .from("post_link_occurrences")
    .select("id", { count: "exact", head: true })
    .eq("silo_id", silo.id);

  let occurrencesInternalCount = 0;
  let occurrencesAffiliateCount = 0;
  let occurrencesInternalWithTargetCount = 0;
  let occurrencesInternalWithoutTargetCount = 0;
  let sampleInternalWithoutTarget: any[] = [];
  let sampleInternalWithTarget: any[] = [];
  const schemaMissing: string[] = [];
  const errors: Array<{ step: string; message: string }> = [];

  {
    const res = await database
      .from("post_link_occurrences")
      .select("id", { count: "exact", head: true })
      .eq("silo_id", silo.id)
      .in("link_type", ["INTERNAL", "internal"]);
    if (res.error) {
      const missing = getMissingColumnFromError(res.error);
      if (missing) schemaMissing.push(missing);
      errors.push({ step: "count_internal", message: res.error.message ?? "unknown error" });
    } else {
      occurrencesInternalCount = res.count ?? 0;
    }
  }

  {
    const res = await database
      .from("post_link_occurrences")
      .select("id", { count: "exact", head: true })
      .eq("silo_id", silo.id)
      .in("link_type", ["AFFILIATE", "affiliate", "AMAZON", "amazon"]);
    if (res.error) {
      const missing = getMissingColumnFromError(res.error);
      if (missing) schemaMissing.push(missing);
      errors.push({ step: "count_affiliate", message: res.error.message ?? "unknown error" });
    } else {
      occurrencesAffiliateCount = res.count ?? 0;
    }
  }

  {
    const res = await database
      .from("post_link_occurrences")
      .select("id", { count: "exact", head: true })
      .eq("silo_id", silo.id)
      .in("link_type", ["INTERNAL", "internal"])
      .not("target_post_id", "is", null);
    if (res.error) {
      const missing = getMissingColumnFromError(res.error);
      if (missing) schemaMissing.push(missing);
      errors.push({ step: "count_internal_with_target", message: res.error.message ?? "unknown error" });
    } else {
      occurrencesInternalWithTargetCount = res.count ?? 0;
    }
  }

  {
    const res = await database
      .from("post_link_occurrences")
      .select("id", { count: "exact", head: true })
      .eq("silo_id", silo.id)
      .in("link_type", ["INTERNAL", "internal"])
      .is("target_post_id", null);
    if (res.error) {
      const missing = getMissingColumnFromError(res.error);
      if (missing) schemaMissing.push(missing);
      errors.push({ step: "count_internal_without_target", message: res.error.message ?? "unknown error" });
    } else {
      occurrencesInternalWithoutTargetCount = res.count ?? 0;
    }
  }

  if (!schemaMissing.includes("link_type")) {
    const resWithout = await database
      .from("post_link_occurrences")
      .select("id, href_normalized, source_post_id, target_post_id")
      .eq("silo_id", silo.id)
      .in("link_type", ["INTERNAL", "internal"])
      .is("target_post_id", null)
      .limit(5);
    if (!resWithout.error) {
      sampleInternalWithoutTarget = resWithout.data ?? [];
    }

    const resWith = await database
      .from("post_link_occurrences")
      .select("id, href_normalized, source_post_id, target_post_id")
      .eq("silo_id", silo.id)
      .in("link_type", ["INTERNAL", "internal"])
      .not("target_post_id", "is", null)
      .limit(5);
    if (!resWith.error) {
      sampleInternalWithTarget = resWith.data ?? [];
    }
  }

  return NextResponse.json({
    silo_slug: silo.slug,
    source_table: "post_link_occurrences",
    posts_count: postsCount ?? 0,
    occurrences_total_count: occurrencesTotalCount ?? 0,
    occurrences_internal_count: occurrencesInternalCount ?? 0,
    occurrences_affiliate_count: occurrencesAffiliateCount ?? 0,
    occurrences_internal_with_target_count: occurrencesInternalWithTargetCount ?? 0,
    occurrences_internal_without_target_count: occurrencesInternalWithoutTargetCount ?? 0,
    schema_missing: Array.from(new Set(schemaMissing)),
    errors,
    sample_internal_without_target: (sampleInternalWithoutTarget ?? []).map((row: any) => ({
      occurrence_id: row.id,
      href_original: row.href_normalized ?? null,
      href_normalized: row.href_normalized ?? null,
      source_post_id: row.source_post_id,
      target_post_id: row.target_post_id ?? null,
    })),
    sample_internal_with_target: (sampleInternalWithTarget ?? []).map((row: any) => ({
      occurrence_id: row.id,
      href_original: row.href_normalized ?? null,
      href_normalized: row.href_normalized ?? null,
      source_post_id: row.source_post_id,
      target_post_id: row.target_post_id ?? null,
    })),
  });
}
