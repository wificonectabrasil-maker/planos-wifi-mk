import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminDatabase } from "@/lib/database";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireAdminSession();
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");

  if (!postId || !isUuid(postId)) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }

  const database = getAdminDatabase();
  const { data: occurrences, error: occError } = await database
    .from("post_link_occurrences")
    .select("id, anchor_text, href_normalized")
    .eq("source_post_id", postId);

  if (occError) {
    return NextResponse.json({ items: [] }, { status: 500 });
  }

  const occurrenceIds = (occurrences || []).map((occ) => occ.id);
  let audits: any[] = [];

  if (occurrenceIds.length) {
    const { data: auditData, error: auditError } = await database
      .from("link_audits")
      .select("occurrence_id, label, score, reasons, action, recommendation, spam_risk")
      .in("occurrence_id", occurrenceIds);

    if (!auditError && Array.isArray(auditData)) {
      audits = auditData;
    }
  }

  const auditMap = new Map(audits.map((audit) => [audit.occurrence_id, audit]));
  const items = (occurrences || []).map((occ) => ({
    occurrence_id: occ.id,
    anchor_text: occ.anchor_text,
    href_normalized: occ.href_normalized,
    audit: auditMap.get(occ.id) ?? null,
  }));

  return NextResponse.json({ items });
}
