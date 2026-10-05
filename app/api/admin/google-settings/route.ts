import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getGoogleCseSettingsSummary, saveGoogleCseSettings } from "@/lib/google/settings";

export async function GET() {
  try {
    await requireAdminSession();
    const summary = await getGoogleCseSettingsSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized", message: "Nao autorizado." }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error", message: error?.message || "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json().catch(() => ({}));
    const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
    const cx = typeof body?.cx === "string" ? body.cx.trim() : "";

    if (!apiKey && !cx) {
      return NextResponse.json({ error: "invalid_request", message: "Informe API key ou CX." }, { status: 400 });
    }

    const saved = await saveGoogleCseSettings({
      apiKey: apiKey || undefined,
      cx: cx || undefined,
    });

    return NextResponse.json({ ok: true, ...saved });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized", message: "Nao autorizado." }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error", message: error?.message || "Erro interno." }, { status: 500 });
  }
}
