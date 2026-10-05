import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/auth";
import { getAdminDatabase } from "@/lib/database";
import { generateAppPassword, hashAppPassword } from "@/lib/wp/passwords";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { username?: string; display_name?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = String(payload.username ?? "").trim();
  const displayName = String(payload.display_name ?? "").trim() || null;

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const appPassword = generateAppPassword();
  const passwordHash = hashAppPassword(appPassword);

  const database = getAdminDatabase();
  const { data, error } = await database
    .from("wp_app_passwords")
    .insert({
      username,
      display_name: displayName,
      password_hash: passwordHash,
      is_active: true,
    })
    .select("id, username, display_name")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create app password" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    username: data.username,
    display_name: data.display_name ?? null,
    app_password: appPassword,
  });
}
