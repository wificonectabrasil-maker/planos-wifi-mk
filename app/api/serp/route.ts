import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { searchCSE } from "@/lib/googleCSE/search";
import { mapSerpProviderError } from "@/lib/serp/errors";
import { SerpProviderError } from "@/lib/serp/provider";

const PayloadSchema = z.object({
  query: z.string().min(2).max(120),
  num: z.number().int().min(1).max(10).optional(),
  start: z.number().int().min(1).max(91).optional(),
  hl: z.string().min(2).max(10).optional(),
  gl: z.string().min(2).max(5).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const body = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse({
      query: body?.query,
      num: typeof body?.num === "number" ? body.num : body?.num ? Number(body.num) : undefined,
      start: typeof body?.start === "number" ? body.start : body?.start ? Number(body.start) : undefined,
      hl: typeof body?.hl === "string" ? body.hl.trim() : undefined,
      gl: typeof body?.gl === "string" ? body.gl.trim() : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request", message: "Query invalida." }, { status: 400 });
    }

    const query = parsed.data.query.trim();
    if (query.length < 2 || query.length > 120) {
      return NextResponse.json({ error: "invalid_request", message: "Query deve ter entre 2 e 120 caracteres." }, { status: 400 });
    }

    const response = await searchCSE(query, {
      num: parsed.data.num,
      start: parsed.data.start,
      hl: parsed.data.hl?.trim(),
      gl: parsed.data.gl?.trim(),
      useCache: true,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized", message: "Nao autorizado." }, { status: 401 });
    }
    if (error?.message === "missing_credentials") {
      return NextResponse.json(
        {
          error: "missing_credentials",
          message: "Configure SERPER_API_KEY, SERPAPI_KEY ou GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX.",
        },
        { status: 400 }
      );
    }
    if (error instanceof SerpProviderError) {
      const mapped = mapSerpProviderError(error);
      return NextResponse.json(
        { error: mapped.error, message: mapped.message, details: error.code },
        { status: mapped.status }
      );
    }

    return NextResponse.json({ error: "internal_error", message: "Erro interno." }, { status: 500 });
  }
}
