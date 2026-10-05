import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/database";
import { isAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ available: false }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") ?? "").trim();
  const siloId = (searchParams.get("siloId") ?? "").trim();
  const id = (searchParams.get("id") ?? "").trim();

  if (!slug) {
    return NextResponse.json({ available: false });
  }

  const database = getAdminDatabase();
  let query = database.from("posts").select("id").eq("slug", slug);

  if (siloId) {
    query = query.eq("silo_id", siloId);
  }

  if (id) {
    query = query.neq("id", id);
  }

  const { data, error } = await query.limit(1);
  if (error) {
    return NextResponse.json({ available: false }, { status: 500 });
  }

  return NextResponse.json({ available: !data || data.length === 0 });
}
