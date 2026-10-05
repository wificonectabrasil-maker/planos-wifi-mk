import { brandConfig } from "@/brand.config";
import { requireAdminSession } from "@/lib/admin/auth";
import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/database";
import { buildGeminiGenerateContentUrl, getGeminiApiKey } from "@/lib/ai/gemini";
import { buildArticlePlanPromptContext, findEditorialArticlePlan } from "@/lib/editorial/content-plan";
import { buildDriveSupportPromptContext } from "@/lib/editorial/drive-support";
import { buildEditorialManifestoStrategy } from "@/lib/editorial/manifesto-strategy";

const PROMPT_TEMPLATE = (
  title: string,
  keyword: string,
  position: string,
  reason: string,
  siloKeywords: string[],
  planContext: string,
  driveSupportContext: string,
  strategicReframeBrief: string
) => `
Você é o Assistente Editorial do projeto. Reescreva o trecho selecionado mantendo o sentido original, a voz da marca, a filosofia E-E-A-T/YMYL e a intencao unica definida no plano KGR.

CONTEXTO DO ARTIGO:
- Titulo: "${title}"
- Palavra-chave principal: "${keyword}"
- Posicao do trecho selecionado: "${position}"
- Motivo da reescrita/melhoria: "${reason === "duplication" ? "Resolver duplicacao/redundancia interna com outros artigos ou trechos ja escritos" : reason === "repetition" ? "Resolver termos/palavras repetidas em excesso" : reason === "search" ? "Integrar palavra-chave de busca naturalmente" : "Aprimorar fluidez, autoridade e engajamento"}"
- Plano canonico KGR:
${planContext}
- Base de apoio Drive:
${driveSupportContext}
- Estrategia de fundo de funil:
${strategicReframeBrief}

DIRETRIZES DO PROJETO:
- Marca: ${brandConfig.name}. Nicho: ${brandConfig.niche || "tema do artigo"}.
- Tom: ${brandConfig.tone.join(", ")}.
- ${brandConfig.sourcePolicy}
- ${brandConfig.manifesto.join("; ")}
- Preserve a intenção única e o sentido do trecho. Use links internos somente quando úteis. Não invente experiências nem credenciais. Ajuste introdução, desenvolvimento e conclusão à posição indicada.

${siloKeywords.length > 0 ? `TEMAS DO MESMO SILO PARA GANCHOS NATURAIS:
${siloKeywords.map((item) => `- "${item}"`).join("\n")}` : ""}

Responda APENAS em JSON valido contendo exatamente 3 opcoes de reescrita estruturadas no array "options". Cada opcao deve ter uma abordagem/nuance diferente de estilo (ex: Opcao 1 focada em fluidez e tom direto da marca, Opcao 2 focada na resolucao especifica da redundancia ou integracao semantica da palavra-chave, Opcao 3 focada em forte conexao empatica e legibilidade conversacional).

Estrutura JSON obrigatoria:
{
  "improvedText": "Texto reescrito da Opcao 1 (para retrocompatibilidade)",
  "explanation": "Breve explicacao da Opcao 1 (para retrocompatibilidade)",
  "options": [
    {
      "improvedText": "Texto da Opcao 1: Foco em fluidez, autoridade e voz da marca (projeto)",
      "explanation": "Explicacao de 1 a 2 frases destacando a fluidez e autoridade"
    },
    {
      "improvedText": "Texto da Opcao 2: Foco em resolver o problema (${reason === "duplication" ? "Reestruturacao completa para quebrar similaridade e redundancia" : reason === "repetition" ? "Substituicao de termos repetidos por sinonimos ricos" : reason === "search" ? "Integracao da palavra-chave na ancora de forma ultra-natural" : "Aprimoramento semantico estrutural"})",
      "explanation": "Explicacao de 1 a 2 frases de como esta opcao resolve o problema especifico"
    },
    {
      "improvedText": "Texto da Opcao 3: Foco em engajamento, tom conversacional empatico e ritmo de leitura",
      "explanation": "Explicacao de 1 a 2 frases sobre a empatia e conexao humana"
    }
  ],
  "semanticAnchors": ["ancora natural 1"],
  "riskNotes": ["nota de anticanibalizacao ou redundancia"]
}
`;

export async function POST(req: Request) {
  try {
    const { text, title, keyword, siloId, postId, position, slug, reason = "improve" } = await req.json();

    if (!text) {
      return NextResponse.json({ ok: false, error: "Nenhum texto fornecido." }, { status: 400 });
    }

    const articlePlan = findEditorialArticlePlan({ slug, keyword, title });
    const planContext = buildArticlePlanPromptContext(articlePlan);
    const driveSupport = buildDriveSupportPromptContext({
      slug,
      keyword,
      title,
      text,
    });
    const manifestoStrategy = buildEditorialManifestoStrategy({
      articlePlan,
      slug,
      keyword,
      title,
      text,
    });

    let siloKeywords: string[] = [];
    if (siloId) {
      const database = getAdminDatabase();
      const { data: posts } = await database
        .from("posts")
        .select("title, target_keyword, focus_keyword")
        .eq("silo_id", siloId)
        .neq("id", postId || "");

      if (posts) {
        siloKeywords = posts
          .map((post: any) => post.target_keyword || post.focus_keyword || post.title)
          .filter(Boolean);
      }
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      const defaultText = String(text).trim();
      return NextResponse.json({
        ok: true,
        improvedText: defaultText,
        explanation:
          "Gemini nao configurado. Mantive o trecho original e devolvi os ganchos KGR/Drive para revisao manual sem alterar a intencao do artigo.",
        options: [
          { improvedText: defaultText + " (Opção 1)", explanation: "Fluidez padrão sem Gemini." },
          { improvedText: defaultText + " (Opção 2)", explanation: "Opção alternativa sem Gemini." },
          { improvedText: defaultText + " (Opção 3)", explanation: "Abordagem alternativa sem Gemini." },
        ],
        semanticAnchors: articlePlan?.expectedLinks.map((link) => link.anchor).slice(0, 3) ?? [],
        riskNotes: [
          articlePlan?.uniqueIntent
            ? `Preserve a intencao: ${articlePlan.uniqueIntent}.`
            : "Plano KGR nao localizado para este artigo.",
          manifestoStrategy.strategicReframeBrief,
          `Base Drive ativa: ${driveSupport.folder.name}.`,
        ],
      });
    }

    const finalPrompt =
      PROMPT_TEMPLATE(
        title || "",
        keyword || "",
        position || "meio do texto",
        reason,
        siloKeywords,
        planContext,
        driveSupport.promptContext,
        manifestoStrategy.strategicReframeBrief
      ) +
      "\nTEXTO PARA REESCREVER:\n" +
      text;

    const response = await fetch(buildGeminiGenerateContentUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Falha na requisicao para o Gemini");
    }

    const data = await response.json();
    const jsonString = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonString) {
      throw new Error("Resposta invalida do Gemini");
    }

    try {
      const parsed = JSON.parse(jsonString);
      return NextResponse.json({
        ok: true,
        improvedText: parsed.improvedText?.trim() || parsed.options?.[0]?.improvedText?.trim(),
        explanation: parsed.explanation?.trim() || parsed.options?.[0]?.explanation?.trim(),
        options: Array.isArray(parsed.options) ? parsed.options : [],
        semanticAnchors: Array.isArray(parsed.semanticAnchors) ? parsed.semanticAnchors : [],
        riskNotes: Array.isArray(parsed.riskNotes) ? parsed.riskNotes : [],
      });
    } catch {
      console.error("Falha ao parsear JSON:", jsonString);
      return NextResponse.json({ ok: false, error: "O Gemini nao retornou um JSON valido." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Improve Fragment Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
