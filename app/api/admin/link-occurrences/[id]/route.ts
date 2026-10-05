import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminDatabase } from "@/lib/database";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Params) {
  await requireAdminSession();
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid occurrence id" }, { status: 400 });
  }

  const database = getAdminDatabase();
  const { data, error } = await database
    .from("post_link_occurrences")
    .select("id, source_post_id, target_post_id, anchor_text, href_normalized, context_snippet, start_index, end_index, occurrence_key")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Occurrence not found" }, { status: 404 });
  }

  return NextResponse.json({ occurrence: data });
}
