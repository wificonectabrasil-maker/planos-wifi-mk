import { NextResponse } from "next/server";
import { adminSearchPostsByTitle } from "@/lib/db";
import { isAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const rows = await adminSearchPostsByTitle(q, 10);

  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    siloSlug: r.silo_slug,
  }));

  return NextResponse.json({ items });
}
