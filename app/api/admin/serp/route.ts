import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { searchCSE } from "@/lib/googleCSE/search";
import { mapSerpProviderError } from "@/lib/serp/errors";
import { SerpProviderError } from "@/lib/serp/provider";

type SerpResult = {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
};

type SerpAnalysis = {
  results: SerpResult[];
  anomalies: string[];
  intents: {
    ecommerce: number;
    informational: number;
    mixed: number;
  };
};

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const { keyword } = await request.json();
    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const response = await searchCSE(keyword, { num: 10, hl: "pt-BR", gl: "BR", useCache: true });
    const results: SerpResult[] = response.items.map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
    }));

    const anomalies: string[] = [];
    const intents = {
      ecommerce: 0,
      informational: 0,
      mixed: 0,
    };

    const ecommerceKeywords = ["comprar", "preco", "frete", "loja", "marketplace", "amazon", "mercado livre", "shopee"];
    const forumVideoKeywords = ["youtube", "reddit", "forum", "quora", "video"];

    let ecommerceCount = 0;
    let forumVideoCount = 0;
    const domainCount: Record<string, number> = {};

    for (const result of results) {
      const textLower = `${result.title} ${result.snippet}`.toLowerCase();

      if (ecommerceKeywords.some((keywordTerm) => textLower.includes(keywordTerm))) {
        ecommerceCount++;
      }

      if (forumVideoKeywords.some((keywordTerm) => textLower.includes(keywordTerm) || result.link.includes(keywordTerm))) {
        forumVideoCount++;
      }

      domainCount[result.displayLink] = (domainCount[result.displayLink] || 0) + 1;
    }

    const totalResults = results.length;
    if (totalResults > 0) {
      intents.ecommerce = Math.round((ecommerceCount / totalResults) * 100);
      intents.informational = Math.round(((totalResults - ecommerceCount - forumVideoCount) / totalResults) * 100);
      intents.mixed = forumVideoCount > 0 ? Math.round((forumVideoCount / totalResults) * 100) : 0;
    }

    if (intents.ecommerce > 50) {
      anomalies.push("SERP dominada por e-commerce (>50%). Seu conteudo informativo pode ter dificuldade para ranquear.");
    }

    if (intents.mixed > 30) {
      anomalies.push("SERP mista detectada (videos/forums >30%). Considere adicionar video ou formatos interativos.");
    }

    const repeatedDomains = Object.entries(domainCount).filter(([, count]) => count >= 3);
    if (repeatedDomains.length > 0) {
      anomalies.push(`SERP concentrada: ${repeatedDomains.map(([domain]) => domain).join(", ")} aparece(m) 3+ vezes.`);
    }

    if (results.length < 10) {
      anomalies.push(`Poucos resultados retornados (${results.length}). Keyword pode ter baixo volume.`);
    }

    const analysis: SerpAnalysis = {
      results,
      anomalies,
      intents,
    };

    return NextResponse.json(analysis);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized", message: "Nao autorizado." }, { status: 401 });
    }
    if (error?.message === "missing_credentials") {
      return NextResponse.json(
        { error: "missing_credentials", message: "Configure SERPER_API_KEY, SERPAPI_KEY ou GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX." },
        { status: 400 }
      );
    }
    if (error instanceof SerpProviderError) {
      const mapped = mapSerpProviderError(error);
      return NextResponse.json({ error: mapped.error, message: mapped.message, details: error.code }, { status: mapped.status });
    }

    console.error("Erro no SERP Analyzer:", error);
    return NextResponse.json({ error: "Erro interno", message: error?.message || "Falha ao consultar SERP." }, { status: 500 });
  }
}
