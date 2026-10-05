import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { getExpectedSessionValue } from "@/lib/admin/auth";
import { getAdminEmail, getAdminPassword } from "@/lib/admin/settings";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/admin");

  if (email !== getAdminEmail()) {
    return NextResponse.json({ error: "E-mail de administrador incorreto" }, { status: 401 });
  }

  let expectedPassword = "";
  try {
    expectedPassword = getAdminPassword();
  } catch {
    return NextResponse.json({ error: "Senha de administrador nao configurada" }, { status: 500 });
  }

  if (!password || password !== expectedPassword) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const safeNext = /^\/admin(?:\/|$|\?)/.test(nextPath) && !nextPath.includes("\\") ? nextPath : "/admin";
  const redirectUrl = new URL(safeNext, req.url);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  const sessionToken = await getExpectedSessionValue();

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
