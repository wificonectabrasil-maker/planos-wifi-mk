import { brandConfig } from "@/brand.config";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { buildGeminiGenerateContentUrl, getGeminiApiKey } from "@/lib/ai/gemini";
import { buildSemanticFoundationDiagnostics, extractFrequentTermsPtBr } from "@/lib/seo/semanticFoundation";
import {
  EDITORIAL_SEO_POLICY,
  buildArticlePlanPromptContext,
  buildExpectedLinkAudit,
  buildSemanticAnchorGptBrief,
  buildSemanticAnchorSuggestions,
  buildVisualPlanForArticle,
  findEditorialArticlePlan,
  type SemanticAnchorSuggestion,
} from "@/lib/editorial/content-plan";
import { buildGuardianSupportContext } from "@/lib/editorial/drive-support";
import { buildEditorialManifestoStrategy } from "@/lib/editorial/manifesto-strategy";

export const runtime = "nodejs";

const PROMPT = `Você é o Guardião SEO do projeto ${brandConfig.name}.
Nicho: ${brandConfig.niche || "adapte ao tema do artigo"}.
Tom: ${brandConfig.tone.join(", ")}.
Fontes: ${brandConfig.sourcePolicy}.
Diretrizes adicionais: ${brandConfig.manifesto.join("; ")}.
Avalie intenção de busca, clareza, estrutura, fontes verificáveis, autoria real, anticanibalização e links internos naturais. Evite repetição forçada de palavras-chave e promessas sem evidências. Avalie SEO local somente quando pertinente ao artigo.

Responda SOMENTE em JSON valido:
{
  "analysis": "Resumo critico focado no guia editorial do projeto",
  "quick_fixes": ["ajuste 1 (fiel ao guia)", "ajuste 2"],
  "suggested_meta_description": "texto curto e claro",
  "suggested_first_paragraph": "intro seguindo a Regra 8 (o que e / pra quem e / quando usar)",
  "lsi_gaps": ["termos semanticos faltando"],
  "pnl_missing_sections": ["secoes faltantes da estrutura"],
  "priority_actions": ["acao 1", "acao 2"],
  "plan_checks": ["checagem do plano KGR"],
  "silo_checks": ["checagem de papel no silo, intencao unica e links"],
  "eeat_checks": ["checagem de confianca, autoria, fonte ou promessa sensivel"],
  "local_seo_checks": ["checagem de SEO local quando houver clinica, bairro, cidade, mapa ou Google Business Profile"],
  "anti_cannibalization_checks": ["risco de competicao interna e acao: diferenciar, mover, linkar, canonicalizar ou revisar"],
  "manifesto_checks": ["checagem de alinhamento com diretrizes adicionais do projeto"],
  "bottom_funnel_actions": ["acao para puxar o texto para fundo de funil, dor real, SEO local/GEO e ativo proprietario"],
  "strategic_reframe_brief": "brief curto com angulo obvio a evitar, dor a expor, reframe SEO local/GEO e autoria e fontes verificáveis",
  "internal_link_anchor_suggestions": [
    {
      "targetSlug": "slug tecnico do destino",
      "targetTitle": "titulo do destino",
      "relationship": "pillar-to-support|support-to-pillar|support-to-support",
      "status": "missing|present|weak_anchor",
      "anchorTerms": ["frase curta sem hifen e sem slug completo"],
      "preferredZones": ["middle", "final"],
      "insertionGuidance": "orientacao curta para encaixar no meio/final sem forcar keyword"
    }
  ],
  "gpt_rewrite_brief": "brief compacto para colar no GPT junto com o artigo e o relatorio de Duplicacao Interna",
  "visual_actions": ["acao visual pendente"],
  "drive_support": ["fonte do Drive usada na revisao"]
}
`;

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}...`;
}

function buildGuardianRewriteBrief(args: {
  title: string;
  keyword: string;
  lsiGaps: string[];
  pnlMissing: string[];
  priorityActions: string[];
  anchorSuggestions: SemanticAnchorSuggestion[];
  eeatChecks: string[];
  localSeoChecks: string[];
  antiCannibalizationChecks: string[];
  manifestoChecks: string[];
  bottomFunnelActions: string[];
  strategicReframeBrief: string;
}) {
  return [
    "# Brief Guardiao SEO para reescrita",
    `Artigo: ${args.title}.`,
    args.keyword ? `Keyword/intencao: ${args.keyword}.` : "",
    "Use junto com a copia completa do artigo e com o relatorio de Duplicacao Interna. Reescreva preservando a intencao unica e sem apagar contexto local necessario.",
    "Estrategia obrigatoria: diretrizes adicionais do projeto. Puxe o texto para fundo de funil, dor real, SEO local/GEO, E-E-A-T medico e ativo proprietario.",
    args.strategicReframeBrief,
    args.manifestoChecks.length ? `Manifesto: ${args.manifestoChecks.slice(0, 3).join(" | ")}` : "",
    args.bottomFunnelActions.length ? `Fundo de funil: ${args.bottomFunnelActions.slice(0, 4).join(" | ")}` : "",
    args.lsiGaps.length ? `LSI a reforcar: ${args.lsiGaps.slice(0, 8).join(", ")}.` : "LSI: manter variacoes naturais sem stuffing.",
    args.pnlMissing.length
      ? `PNL/estrutura faltante: ${args.pnlMissing.slice(0, 6).join(", ")}.`
      : "PNL/estrutura: manter resposta direta, escaneabilidade e conclusao util.",
    args.priorityActions.length ? `Acoes prioritarias: ${args.priorityActions.slice(0, 4).join(" | ")}.` : "",
    args.eeatChecks.length ? `E-E-A-T/YMYL: ${args.eeatChecks.slice(0, 2).join(" | ")}` : "",
    args.localSeoChecks.length ? `SEO local: ${args.localSeoChecks.slice(0, 2).join(" | ")}` : "",
    args.antiCannibalizationChecks.length
      ? `Anticanibalizacao: ${args.antiCannibalizationChecks.slice(0, 2).join(" | ")}`
      : "",
    buildSemanticAnchorGptBrief({
      title: args.title,
      keyword: args.keyword,
      suggestions: args.anchorSuggestions,
    }),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function sanitizeAnchorSuggestions(
  value: unknown,
  fallback: SemanticAnchorSuggestion[]
): SemanticAnchorSuggestion[] {
  if (!Array.isArray(value)) return fallback;
  const fallbackBySlug = new Map(fallback.map((item) => [item.targetSlug, item]));
  const sanitized = value
    .map((item: any) => {
      const targetSlug = String(item?.targetSlug ?? "").trim();
      const fallbackItem = fallbackBySlug.get(targetSlug);
      if (!targetSlug && !fallbackItem) return null;
      const slug = targetSlug || fallbackItem?.targetSlug || "";
      const anchorTerms = Array.isArray(item?.anchorTerms)
        ? item.anchorTerms
            .map((term: unknown) => String(term ?? "").trim())
            .filter((term: string) => term && !term.includes("-") && !term.includes(slug))
            .slice(0, 5)
        : [];
      const preferredZones = Array.isArray(item?.preferredZones)
        ? item.preferredZones.filter((zone: unknown) => zone === "middle" || zone === "final")
        : [];

      return {
        targetSlug: slug,
        targetTitle: String(item?.targetTitle ?? fallbackItem?.targetTitle ?? slug.replace(/-/g, " ")),
        relationship: (["pillar-to-support", "support-to-pillar", "support-to-support"].includes(item?.relationship)
          ? item.relationship
          : fallbackItem?.relationship ?? "support-to-support") as SemanticAnchorSuggestion["relationship"],
        status: (["missing", "present", "weak_anchor"].includes(item?.status)
          ? item.status
          : fallbackItem?.status ?? "missing") as SemanticAnchorSuggestion["status"],
        anchorTerms: anchorTerms.length ? anchorTerms : fallbackItem?.anchorTerms ?? [],
        preferredZones: preferredZones.length ? preferredZones : fallbackItem?.preferredZones ?? ["middle", "final"],
        insertionGuidance: String(item?.insertionGuidance ?? fallbackItem?.insertionGuidance ?? "").trim(),
      };
    })
    .filter((item): item is SemanticAnchorSuggestion => Boolean(item?.targetSlug && item.anchorTerms.length));

  return sanitized.length ? sanitized.slice(0, 8) : fallback;
}

function buildLocalFallback(args: {
  title: string;
  keyword: string;
  metaDescription: string;
  text: string;
  diagnostics: ReturnType<typeof buildSemanticFoundationDiagnostics>;
  planContext: string;
  linkAudit: ReturnType<typeof buildExpectedLinkAudit>;
  anchorSuggestions: SemanticAnchorSuggestion[];
  visualDiagnostics: ReturnType<typeof buildVisualPlanForArticle>["diagnostics"];
  driveSupport: ReturnType<typeof buildGuardianSupportContext>;
  manifestoStrategy: ReturnType<typeof buildEditorialManifestoStrategy>;
}) {
  const lsiGaps = args.diagnostics.coverage.missingRelatedTerms.slice(0, 6);
  const pnlMissing = args.diagnostics.structure.missingSections.slice(0, 5);
  const frequentTerms = extractFrequentTermsPtBr(args.text, { limit: 8 });
  const linkAnchorPriorities = args.anchorSuggestions.filter((item) => item.status !== "present").slice(0, 3);

  const quickFixes: string[] = [];
  if (lsiGaps.length > 0) quickFixes.push(`Incluir termos relacionados ao tema: ${lsiGaps.slice(0, 3).join(", ")}.`);
  if (pnlMissing.length > 0) quickFixes.push(`Adicionar secoes PNL ausentes: ${pnlMissing.join(", ")}.`);
  if (args.diagnostics.coverage.repeatedTerms.length > 0) {
    const hot = args.diagnostics.coverage.repeatedTerms.slice(0, 2).map((item) => item.term).join(", ");
    quickFixes.push(`Reduzir repeticao de termos para evitar stuffing (${hot}).`);
  }
  if (linkAnchorPriorities.length) {
    quickFixes.push(
      `Preparar links internos no meio/final: ${linkAnchorPriorities
        .map((item) => `${item.targetTitle} com ${item.anchorTerms.slice(0, 2).join(" ou ")}`)
        .join("; ")}.`
    );
  }
  if (args.visualDiagnostics.warnings.length > 0) {
    quickFixes.push(args.visualDiagnostics.warnings[0]);
  }
  if (!quickFixes.length) {
    quickFixes.push("Manter estrutura clara em H2/H3 com foco na intencao de busca.");
    quickFixes.push("Expandir exemplos praticos e linguagem natural para reforcar NLP.");
  }

  const metaBase =
    args.metaDescription.trim() ||
    `${args.keyword || args.title}: guia pratico com explicacoes claras, cuidados e comparacoes para decidir com seguranca.`;

  const firstParagraphBase = `Se voce busca ${args.keyword || args.title}, este guia explica de forma direta como funciona, quando usar e quais cuidados evitar para ter resultado melhor.`;
  const priorityActions = [
    args.manifestoStrategy.priorityAction,
    ...(args.linkAudit?.missing.length ? ["Preparar ancoras semanticas no meio/final antes da revisao final."] : []),
    ...(args.visualDiagnostics.warnings.length ? ["Resolver pendencias de capa, alt text, OG ou imagem de corpo."] : []),
    ...(lsiGaps.length ? ["Reforcar termos semanticos ausentes no corpo e nos H2/H3."] : []),
    ...(pnlMissing.length ? ["Completar blocos PNL para cobrir toda a intencao da busca."] : []),
    ...(frequentTerms.length ? [`Usar variacoes naturais como: ${frequentTerms.slice(0, 4).join(", ")}.`] : []),
  ].slice(0, 4);
  const eeatChecks = [
    "Conferir autoria, revisao, profundidade tecnica do SEO e demonstracao pratica de autoridade e EEAT do autor.",
    args.driveSupport.sources.some((source) => source.tags.includes("ymyl"))
      ? "Verificar autoria, experiência e fontes primárias em temas sensíveis."
      : "Sem sinal YMYL forte no trecho inicial analisado.",
  ];
  const localSeoChecks = [
    "Quando citar bairro, cidade, mapa ou Google Business Profile, manter NAP, reputacao e servico/regiao coerentes.",
    "Não prometer resultados garantidos; avaliar contexto local quando necessário.",
  ];
  const antiCannibalizationChecks = [
    "Se o trecho pertencer melhor a outro artigo do silo, reduzir profundidade e criar link interno natural.",
    "Diferenciar exemplos, H2 e promessa editorial quando houver termos muito proximos entre pilar e suporte.",
  ];
  const manifestoChecks = args.manifestoStrategy.manifestoChecks;
  const bottomFunnelActions = args.manifestoStrategy.bottomFunnelActions;
  const strategicReframeBrief = args.manifestoStrategy.strategicReframeBrief;

  return {
    analysis: `Cobertura LSI ${args.diagnostics.coverage.lsiCoverageScore}% e estrutura PNL ${args.diagnostics.structure.coverageScore}%. ${args.planContext.split("\n")[0]}`,
    quick_fixes: quickFixes.slice(0, 6),
    suggested_meta_description: truncate(metaBase, 155),
    suggested_first_paragraph: truncate(firstParagraphBase, 260),
    lsi_gaps: lsiGaps,
    pnl_missing_sections: pnlMissing,
    priority_actions: priorityActions,
    plan_checks: [
      args.linkAudit
        ? `Links KGR: ${args.linkAudit.present.length}/${args.linkAudit.expectedTotal} presentes; ${args.linkAudit.missing.length} faltando.`
        : "Plano KGR nao localizado para este artigo.",
      args.planContext,
    ],
    silo_checks: [
      args.linkAudit
        ? `Cobertura do silo: ${args.linkAudit.coverageScore}% dos links esperados estao presentes.`
        : "Sem plano KGR localizado; validar pilar/suporte manualmente.",
      "Confirmar se o artigo tem intencao unica e nao responde por completo uma subintencao de outro post.",
    ],
    eeat_checks: eeatChecks,
    local_seo_checks: localSeoChecks,
    anti_cannibalization_checks: antiCannibalizationChecks,
    manifesto_checks: manifestoChecks,
    bottom_funnel_actions: bottomFunnelActions,
    strategic_reframe_brief: strategicReframeBrief,
    internal_link_anchor_suggestions: args.anchorSuggestions.slice(0, 8),
    gpt_rewrite_brief: buildGuardianRewriteBrief({
      title: args.title,
      keyword: args.keyword,
      lsiGaps,
      pnlMissing,
      priorityActions,
      anchorSuggestions: args.anchorSuggestions,
      eeatChecks,
      localSeoChecks,
      antiCannibalizationChecks,
      manifestoChecks,
      bottomFunnelActions,
      strategicReframeBrief,
    }),
    visual_actions: args.visualDiagnostics.warnings.length
      ? args.visualDiagnostics.warnings
      : ["Plano visual sem bloqueios criticos no momento."],
    drive_support: [
      `Base Drive ativa: ${args.driveSupport.folder.name}.`,
      ...args.driveSupport.sources.slice(0, 4).map((source) => source.title),
    ],
    supportSources: args.driveSupport.sources.map((source) => source.title),
    supportContext: args.driveSupport.supportContext,
  };
}

export async function POST(req: Request) {
  await requireAdminSession();

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const text = String(payload.text ?? "").slice(0, 12000);
  const issues = Array.isArray(payload.issues) ? payload.issues : [];
  const keyword = String(payload.keyword ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const metaDescription = String(payload.metaDescription ?? "").trim();
  const slug = String(payload.slug ?? "").trim();
  const plan = findEditorialArticlePlan({ slug, keyword, title });
  const planContext = buildArticlePlanPromptContext(plan);
  const linkAudit = buildExpectedLinkAudit(plan, Array.isArray(payload.links) ? payload.links : []);
  const anchorSuggestions = buildSemanticAnchorSuggestions(plan, Array.isArray(payload.links) ? payload.links : []);
  const visualPlan = buildVisualPlanForArticle({
    articlePlan: plan,
    title,
    keyword,
    text,
    outline: Array.isArray(payload.outline) ? payload.outline : [],
    images: Array.isArray(payload.images) ? payload.images : [],
    heroImageUrl: typeof payload.heroImageUrl === "string" ? payload.heroImageUrl : "",
    heroImageAlt: typeof payload.heroImageAlt === "string" ? payload.heroImageAlt : "",
    ogImageUrl: typeof payload.ogImageUrl === "string" ? payload.ogImageUrl : "",
  });
  const driveSupport = buildGuardianSupportContext({
    slug,
    title,
    keyword,
    text,
  });
  const manifestoStrategy = buildEditorialManifestoStrategy({
    articlePlan: plan,
    slug,
    title,
    keyword,
    text,
  });

  const diagnostics = buildSemanticFoundationDiagnostics({
    text,
    keyword,
    relatedTerms: extractFrequentTermsPtBr(text, { limit: 12 }),
    entities: [],
  });

  const localFallback = buildLocalFallback({
    title,
    keyword,
    metaDescription,
    text,
    diagnostics,
    planContext,
    linkAudit,
    anchorSuggestions,
    visualDiagnostics: visualPlan.diagnostics,
    driveSupport,
    manifestoStrategy,
  });
  const contextPayload = {
    plan: plan
      ? {
          siloSlug: plan.siloSlug,
          role: plan.role,
          slug: plan.slug,
          uniqueIntent: plan.uniqueIntent,
        }
      : null,
    linkAudit,
    visualDiagnostics: visualPlan.diagnostics,
    driveSupport: {
      folder: driveSupport.folder,
      sources: driveSupport.sources,
    },
    supportSources: driveSupport.sources,
    supportContext: driveSupport.supportContext,
    internalLinkAnchorSuggestions: anchorSuggestions,
    manifestoStrategy,
  };

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      source: "local_fallback",
      result: localFallback,
      diagnostics,
      ...contextPayload,
    });
  }

  const userPayload = {
    keyword,
    title,
    metaDescription,
    issues,
    text,
    diagnostics,
    planContext,
    driveSupportContext: driveSupport.promptContext,
    supportContext: driveSupport.supportContext,
    seoPolicy: EDITORIAL_SEO_POLICY,
    linkAudit,
    internalLinkAnchorSuggestions: anchorSuggestions,
    manifestoStrategy,
    visualDiagnostics: visualPlan.diagnostics,
  };

  try {
    const response = await fetch(
      buildGeminiGenerateContentUrl(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${PROMPT}\n\nDados:\n${JSON.stringify(userPayload)}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        ok: true,
        source: "local_fallback",
        result: localFallback,
        diagnostics,
        ...contextPayload,
      });
    }

    const data = await response.json().catch(() => null);
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse || typeof textResponse !== "string") {
      return NextResponse.json({
        ok: true,
        source: "local_fallback",
        result: localFallback,
        diagnostics,
        ...contextPayload,
      });
    }

    try {
      const parsed = JSON.parse(textResponse);
      const parsedAnchorSuggestions = sanitizeAnchorSuggestions(
        parsed?.internal_link_anchor_suggestions,
        localFallback.internal_link_anchor_suggestions
      );
      const parsedManifestoChecks = Array.isArray(parsed?.manifesto_checks)
        ? parsed.manifesto_checks
        : localFallback.manifesto_checks;
      const parsedBottomFunnelActions = Array.isArray(parsed?.bottom_funnel_actions)
        ? parsed.bottom_funnel_actions
        : localFallback.bottom_funnel_actions;
      const parsedStrategicReframeBrief =
        typeof parsed?.strategic_reframe_brief === "string" && parsed.strategic_reframe_brief.trim()
          ? parsed.strategic_reframe_brief
          : localFallback.strategic_reframe_brief;
      return NextResponse.json({
        ok: true,
        source: "ai",
        result: {
          ...parsed,
          plan_checks: Array.isArray(parsed?.plan_checks) ? parsed.plan_checks : localFallback.plan_checks,
          silo_checks: Array.isArray(parsed?.silo_checks) ? parsed.silo_checks : localFallback.silo_checks,
          eeat_checks: Array.isArray(parsed?.eeat_checks) ? parsed.eeat_checks : localFallback.eeat_checks,
          local_seo_checks: Array.isArray(parsed?.local_seo_checks) ? parsed.local_seo_checks : localFallback.local_seo_checks,
          anti_cannibalization_checks: Array.isArray(parsed?.anti_cannibalization_checks)
            ? parsed.anti_cannibalization_checks
            : localFallback.anti_cannibalization_checks,
          visual_actions: Array.isArray(parsed?.visual_actions) ? parsed.visual_actions : localFallback.visual_actions,
          drive_support: Array.isArray(parsed?.drive_support) ? parsed.drive_support : localFallback.drive_support,
          manifesto_checks: parsedManifestoChecks,
          bottom_funnel_actions: parsedBottomFunnelActions,
          strategic_reframe_brief: parsedStrategicReframeBrief,
          internal_link_anchor_suggestions: parsedAnchorSuggestions,
          gpt_rewrite_brief: buildGuardianRewriteBrief({
            title,
            keyword,
            lsiGaps: Array.isArray(parsed?.lsi_gaps) ? parsed.lsi_gaps : localFallback.lsi_gaps,
            pnlMissing: Array.isArray(parsed?.pnl_missing_sections)
              ? parsed.pnl_missing_sections
              : localFallback.pnl_missing_sections,
            priorityActions: Array.isArray(parsed?.priority_actions) ? parsed.priority_actions : localFallback.priority_actions,
            anchorSuggestions: parsedAnchorSuggestions,
            eeatChecks: Array.isArray(parsed?.eeat_checks) ? parsed.eeat_checks : localFallback.eeat_checks,
            localSeoChecks: Array.isArray(parsed?.local_seo_checks)
              ? parsed.local_seo_checks
              : localFallback.local_seo_checks,
            antiCannibalizationChecks: Array.isArray(parsed?.anti_cannibalization_checks)
              ? parsed.anti_cannibalization_checks
              : localFallback.anti_cannibalization_checks,
            manifestoChecks: parsedManifestoChecks,
            bottomFunnelActions: parsedBottomFunnelActions,
            strategicReframeBrief: parsedStrategicReframeBrief,
          }),
          supportSources: Array.isArray(parsed?.supportSources) ? parsed.supportSources : localFallback.supportSources,
          supportContext: typeof parsed?.supportContext === "string" ? parsed.supportContext : localFallback.supportContext,
        },
        diagnostics,
        ...contextPayload,
      });
    } catch {
      return NextResponse.json({
        ok: true,
        source: "ai_text_fallback",
        result: { ...localFallback, analysis: truncate(textResponse, 600) },
        diagnostics,
        ...contextPayload,
      });
    }
  } catch {
    return NextResponse.json({
      ok: true,
      source: "local_fallback",
      result: localFallback,
      diagnostics,
      ...contextPayload,
    });
  }
}
