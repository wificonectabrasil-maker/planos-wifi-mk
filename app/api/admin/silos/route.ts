import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/auth";
import { adminCreateSilo, adminListSilos } from "@/lib/db";

export const runtime = "nodejs";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await adminListSilos();
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed to load silos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { name?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(payload?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  try {
    const item = await adminCreateSilo({ name, slug, description: null });
    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed to create silo" }, { status: 500 });
  }
}
