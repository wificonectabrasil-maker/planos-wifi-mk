import { brandConfig } from "@/brand.config";
export type EditorialArticleRole = "PILLAR" | "SUPPORT";

export type ExpectedInternalLink = {
  targetSlug: string;
  anchor: string;
  relationship:
    | "pillar-to-support"
    | "support-to-pillar"
    | "support-to-support";
};

export type EditorialArticlePlan = {
  siloName: string;
  siloSlug: string;
  kgrSiloSlug: string;
  role: EditorialArticleRole;
  position: number;
  uniqueIntent: string;
  title: string;
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  anchorIn: string;
  expectedLinks: ExpectedInternalLink[];
};

export type EditorialSiloPlan = {
  name: string;
  slug: string;
  kgrSlug: string;
  articles: EditorialArticlePlan[];
};

export type ExistingPlanLink = {
  href?: string | null;
  text?: string | null;
  anchorText?: string | null;
  dataPostId?: string | null;
  targetSlug?: string | null;
  type?: string | null;
};

export type ExpectedLinkAudit = {
  articleSlug: string;
  expectedTotal: number;
  present: ExpectedInternalLink[];
  missing: ExpectedInternalLink[];
  duplicateTargetSlugs: string[];
  weakAnchors: Array<{ href: string; anchor: string; reason: string }>;
  outsideSilo: Array<{
    href: string;
    targetSlug: string;
    targetSiloSlug: string;
  }>;
  coverageScore: number;
};

export type SemanticAnchorSuggestion = {
  targetSlug: string;
  targetTitle: string;
  relationship: ExpectedInternalLink["relationship"];
  status: "missing" | "present" | "weak_anchor";
  anchorTerms: string[];
  preferredZones: Array<"middle" | "final">;
  insertionGuidance: string;
};

export type VisualPlanKind = "hero" | "og" | "body";
export type VisualPlanPriority = "required" | "high" | "medium";
export type VisualPlanRole =
  | "cover_thumbnail"
  | "body_context"
  | "table_visual"
  | "og";

export type CoverArtDirection = {
  cameraAngle: string;
  framing: string;
  modelPose: string;
  modelAction: string;
  compositionVariant: string;
  heroProp: string;
  backgroundMotif: string;
  textMode: string;
  doNotRepeat: string[];
};

export type BodyArtDirection = {
  layoutPattern: string;
  focalObject: string;
  visualAction: string;
  supportObjects: string[];
  doNotRepeat: string[];
  markerVariant: string;
};

export type VisualPlanSuggestion = {
  id: string;
  kind: VisualPlanKind;
  priority: VisualPlanPriority;
  visualRole?: VisualPlanRole;
  placement: string;
  sectionHeading?: string;
  markerId?: string;
  contextBefore?: string;
  contextAfter?: string;
  cropGuidance?: string;
  promptIntent?: string;
  visualTheme?: string;
  localVisualBrief?: string;
  markerSection?: string;
  strongSentence?: string;
  specificTerms?: string[];
  visualDuplicateOf?: string;
  dedupeReason?: string;
  sourceTextUsed?: string;
  coverSourceMode?: "stock_image_edit";
  googleInspiredVisualSystem?: string[];
  augmentedRealityDirection?: string;
  stockPhotoEditInstruction?: string;
  generatorPromptProfile?: "multi_generator";
  coverVariable?: string;
  coverDifferentiator?: string;
  coverArtDirection?: CoverArtDirection;
  bodyArtDirection?: BodyArtDirection;
  compositionVariant?: string;
  cameraAngle?: string;
  modelPose?: string;
  modelAction?: string;
  layoutPattern?: string;
  focalObject?: string;
  doNotRepeat?: string[];
  visualType: string;
  aspectRatio: string;
  prompt: string;
  altText: string;
  caption: string;
  objective: string;
};

export type VisualPlanDiagnostics = {
  hasHero: boolean;
  hasHeroAlt: boolean;
  hasOgImage: boolean;
  ogStatus: "defined" | "inherits_hero" | "missing";
  bodyImageCount: number;
  wordCount: number;
  missingHero: boolean;
  missingHeroAlt: boolean;
  longArticleNeedsBodyImage: boolean;
  hasVisualPlaceholder: boolean;
  warnings: string[];
};

export const EDITORIAL_SEO_POLICY = {
  source: "Plano editorial do projeto",
  tone: brandConfig.tone,
  forbiddenTerms: ["clique aqui", "saiba mais", "leia mais"],
  visualPalette: brandConfig.visualPalette,
  visualStyle: [
    "infográfico",
    "comparativo",
    "fotografia editorial",
    "fluxo visual",
  ],
  visualAvoid: ["promessas sem comprovação", "imagem sem função editorial"],
};

export const EDITORIAL_CONTENT_PLAN: EditorialSiloPlan[] =
  brandConfig.contentPlan;

export const EDITORIAL_ARTICLES = EDITORIAL_CONTENT_PLAN.flatMap(
  (silo) => silo.articles,
);

export function normalizePlanText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/:\-_\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function listEditorialArticlePlans() {
  return EDITORIAL_ARTICLES;
}

export function getEditorialSiloPlan(slug: string | null | undefined) {
  const normalized = normalizePlanText(slug);
  return EDITORIAL_CONTENT_PLAN.find(
    (silo) =>
      normalizePlanText(silo.slug) === normalized ||
      normalizePlanText(silo.kgrSlug) === normalized,
  );
}

export function getEditorialArticlePlan(slug: string | null | undefined) {
  const normalized = normalizePlanText(slug);
  if (!normalized) return undefined;
  return EDITORIAL_ARTICLES.find(
    (article) => normalizePlanText(article.slug) === normalized,
  );
}

export function getEditorialArticlePlanByKeyword(
  keyword: string | null | undefined,
) {
  const normalized = normalizePlanText(keyword);
  if (!normalized) return undefined;
  return EDITORIAL_ARTICLES.find((article) => {
    if (normalizePlanText(article.primaryKeyword) === normalized) return true;
    return article.secondaryKeywords.some(
      (item) => normalizePlanText(item) === normalized,
    );
  });
}

export function findEditorialArticlePlan(args: {
  slug?: string | null;
  keyword?: string | null;
  title?: string | null;
}) {
  return (
    getEditorialArticlePlan(args.slug) ??
    getEditorialArticlePlanByKeyword(args.keyword) ??
    EDITORIAL_ARTICLES.find(
      (article) =>
        normalizePlanText(article.title) === normalizePlanText(args.title),
    )
  );
}

export function buildPlanTerms(plan: EditorialArticlePlan | undefined) {
  if (!plan) return [];
  return Array.from(
    new Set(
      [
        plan.primaryKeyword,
        plan.anchorIn,
        plan.uniqueIntent,
        ...plan.secondaryKeywords,
        ...plan.expectedLinks.map((link) => link.anchor),
      ].filter(Boolean),
    ),
  );
}

function extractSlugFromHref(href: string | null | undefined) {
  if (!href) return "";
  const cleaned = href.split("#")[0]?.split("?")[0]?.replace(/\/+$/, "") ?? "";
  const parts = cleaned.split("/").filter(Boolean);
  return parts.at(-1) ?? "";
}

export function buildExpectedLinkAudit(
  plan: EditorialArticlePlan | undefined,
  existingLinks: ExistingPlanLink[] = [],
  allPlans: EditorialArticlePlan[] = EDITORIAL_ARTICLES,
): ExpectedLinkAudit | null {
  if (!plan) return null;

  const allBySlug = new Map(allPlans.map((article) => [article.slug, article]));
  const internalSlugs = existingLinks
    .map((link) => ({
      href: String(link.href ?? ""),
      targetSlug: String(link.targetSlug ?? extractSlugFromHref(link.href)),
      anchor: String(link.anchorText ?? link.text ?? ""),
      type: String(link.type ?? ""),
    }))
    .filter((link) => link.targetSlug);

  const targetCounts = internalSlugs.reduce<Map<string, number>>(
    (acc, link) => {
      acc.set(link.targetSlug, (acc.get(link.targetSlug) ?? 0) + 1);
      return acc;
    },
    new Map(),
  );

  const expectedSlugs = new Set(
    plan.expectedLinks.map((link) => link.targetSlug),
  );
  const present = plan.expectedLinks.filter((link) =>
    targetCounts.has(link.targetSlug),
  );
  const missing = plan.expectedLinks.filter(
    (link) => !targetCounts.has(link.targetSlug),
  );
  const duplicateTargetSlugs = Array.from(targetCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug);

  const outsideSilo = internalSlugs
    .map((link) => {
      const target = allBySlug.get(link.targetSlug);
      if (!target || target.siloSlug === plan.siloSlug) return null;
      return {
        href: link.href,
        targetSlug: link.targetSlug,
        targetSiloSlug: target.siloSlug,
      };
    })
    .filter(
      (
        item,
      ): item is { href: string; targetSlug: string; targetSiloSlug: string } =>
        Boolean(item),
    );

  const weakAnchors = internalSlugs
    .filter((link) => expectedSlugs.has(link.targetSlug))
    .filter((link) => {
      const normalized = normalizePlanText(link.anchor);
      return (
        !normalized ||
        normalized.length < 8 ||
        ["clique aqui", "saiba mais", "leia mais", "aqui"].includes(normalized)
      );
    })
    .map((link) => ({
      href: link.href,
      anchor: link.anchor,
      reason: "Ancora fraca para um link esperado do plano KGR.",
    }));

  const coverageScore = plan.expectedLinks.length
    ? Math.round((present.length / plan.expectedLinks.length) * 100)
    : 100;

  return {
    articleSlug: plan.slug,
    expectedTotal: plan.expectedLinks.length,
    present,
    missing,
    duplicateTargetSlugs,
    weakAnchors,
    outsideSilo,
    coverageScore,
  };
}

function cleanAnchorCandidate(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\/_]+/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulAnchorTerm(value: string, targetSlug: string) {
  const cleaned = cleanAnchorCandidate(value);
  const normalized = normalizePlanText(cleaned);
  if (!cleaned || !normalized) return false;
  if (cleaned.includes("-")) return false;
  if (normalized === normalizePlanText(targetSlug.replace(/-/g, " ")))
    return false;
  if (normalized.startsWith("como ")) return false;
  if (normalized.split(/\s+/).length > 4) return false;
  if (["guia", "pratico", "2026", "artigo", "post"].includes(normalized))
    return false;
  return true;
}

function semanticPhraseCandidates(
  target: EditorialArticlePlan | undefined,
  link: ExpectedInternalLink,
) {
  return [
    target?.primaryKeyword,
    target?.title,
    link.anchor,
    ...(target?.secondaryKeywords ?? []),
  ]
    .filter((item): item is string => Boolean(item))
    .map(cleanAnchorCandidate);
}

function anchorTermsForTarget(
  target: EditorialArticlePlan | undefined,
  link: ExpectedInternalLink,
) {
  const directCandidates = [
    target?.anchorIn,
    link.anchor,
    target?.primaryKeyword,
    ...(target?.secondaryKeywords ?? []),
    target?.uniqueIntent,
  ]
    .map(cleanAnchorCandidate)
    .filter((item) => isUsefulAnchorTerm(item, link.targetSlug));

  const candidates = [
    ...semanticPhraseCandidates(target, link),
    ...directCandidates,
  ];
  const unique = new Map<string, string>();
  for (const candidate of candidates) {
    const key = normalizePlanText(candidate);
    if (!key || unique.has(key)) continue;
    unique.set(key, candidate);
  }

  return Array.from(unique.values()).slice(0, 5);
}

function relationshipGuidance(
  relationship: ExpectedInternalLink["relationship"],
) {
  if (relationship === "support-to-pillar")
    return "reforçar o pilar sem repetir a introdução dele";
  if (relationship === "pillar-to-support")
    return "abrir ponte para o suporte quando o texto tocar nessa subintenção";
  return "conectar apoio lateral dentro do mesmo silo";
}

export function buildSemanticAnchorSuggestions(
  plan: EditorialArticlePlan | undefined,
  existingLinks: ExistingPlanLink[] = [],
  allPlans: EditorialArticlePlan[] = EDITORIAL_ARTICLES,
): SemanticAnchorSuggestion[] {
  if (!plan) return [];
  const audit = buildExpectedLinkAudit(plan, existingLinks, allPlans);
  if (!audit) return [];

  const allBySlug = new Map(allPlans.map((article) => [article.slug, article]));
  const missingSlugs = new Set(audit.missing.map((link) => link.targetSlug));
  const weakSlugs = new Set(
    audit.weakAnchors
      .map((link) => extractSlugFromHref(link.href))
      .filter(Boolean),
  );

  return plan.expectedLinks
    .map((link) => {
      const target = allBySlug.get(link.targetSlug);
      const status: SemanticAnchorSuggestion["status"] = weakSlugs.has(
        link.targetSlug,
      )
        ? "weak_anchor"
        : missingSlugs.has(link.targetSlug)
          ? "missing"
          : "present";
      const anchorTerms = anchorTermsForTarget(target, link);
      const termsText = anchorTerms.length
        ? anchorTerms.slice(0, 3).join(", ")
        : cleanAnchorCandidate(link.anchor);
      const targetLabel = target?.title ?? link.targetSlug.replace(/-/g, " ");
      return {
        targetSlug: link.targetSlug,
        targetTitle: targetLabel,
        relationship: link.relationship,
        status,
        anchorTerms,
        preferredZones: ["middle", "final"] as Array<"middle" | "final">,
        insertionGuidance: `No meio ou final do artigo, preparar uma frase de continuidade usando ${termsText} para ${relationshipGuidance(link.relationship)}. Nao colar o slug inteiro nem forcar keyword exata.`,
      };
    })
    .sort((a, b) => {
      const order = { missing: 0, weak_anchor: 1, present: 2 };
      return order[a.status] - order[b.status];
    });
}

export function buildSemanticAnchorGptBrief(args: {
  title: string;
  keyword?: string;
  suggestions: SemanticAnchorSuggestion[];
}) {
  const priority = args.suggestions
    .filter((item) => item.status !== "present")
    .slice(0, 5);
  const selected = priority.length ? priority : args.suggestions.slice(0, 4);
  const linkLines = selected.map((item) => {
    const statusLabel =
      item.status === "missing"
        ? "faltante"
        : item.status === "weak_anchor"
          ? "ancora fraca"
          : "ja presente";
    return `- ${item.targetTitle} (${statusLabel}): usar variacoes curtas como ${item.anchorTerms
      .slice(0, 4)
      .join(
        ", ",
      )}. Inserir no meio/final quando a passagem pedir continuidade natural.`;
  });

  return [
    "# Brief Guardiao SEO para GPT",
    `Artigo: ${args.title}.`,
    args.keyword ? `Keyword/intencao: ${args.keyword}.` : "",
    "Use este brief junto com o relatorio de Duplicacao Interna e com o texto completo do artigo.",
    "Objetivo: melhorar o conteudo inteiro preservando a intencao unica, reduzindo canibalizacao e preparando links internos naturais.",
    "Links internos no meio/final:",
    linkLines.length
      ? linkLines.join("\n")
      : "- Sem link KGR prioritario neste momento; manter naturalidade editorial.",
    "Instrucoes: nao usar slug completo como ancora; nao transformar todos os destinos em exact match; inserir palavras ou frases semanticas apenas onde o paragrafo ja aponta para aquele assunto.",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 3400);
}

export function buildArticlePlanPromptContext(
  plan: EditorialArticlePlan | undefined,
) {
  if (!plan) {
    return "Plano KGR: artigo nao encontrado na fonte canonica local. Avalie com cautela e nao invente relacoes de silo.";
  }

  return [
    `Plano KGR: ${plan.siloName} / ${plan.role} / posicao ${plan.position}.`,
    `Slug: ${plan.slug}.`,
    `Keyword principal: ${plan.primaryKeyword}.`,
    `Intencao unica: ${plan.uniqueIntent}.`,
    `Intencao de busca: ${plan.searchIntent}.`,
    `Ancora de entrada preferencial: ${plan.anchorIn}.`,
    `Links esperados: ${plan.expectedLinks.map((link) => `${link.targetSlug} :: ${link.anchor}`).join(" | ")}.`,
  ].join("\n");
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function firstUsefulHeadings(
  outline: Array<{ text?: string; level?: number }>,
) {
  return outline
    .filter((item) => Number(item.level ?? 2) <= 3)
    .map((item) => String(item.text ?? "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

type CoverVisualConcept = {
  variable: string;
  differentiator: string;
  scene: string;
  artDirection: CoverArtDirection;
  googleInspiredVisualSystem: string[];
  augmentedRealityDirection: string;
  stockPhotoEditInstruction: string;
};

type LocalVisualConcept = {
  visualTheme: string;
  localVisualBrief: string;
  mainMetaphor: string;
  supportingElements: string[];
  markerSection?: string;
  strongSentence: string;
  specificTerms: string[];
  artDirection: BodyArtDirection;
  googleInspiredVisualSystem: string[];
  augmentedRealityDirection: string;
};

function coverDirection(args: CoverArtDirection): CoverArtDirection {
  return args;
}

function bodyDirection(args: BodyArtDirection): BodyArtDirection {
  return args;
}

const GOOGLE_INSPIRED_VISUAL_SYSTEM = [
  "caixa de busca inteligente inspirada no visual Google Search/AI Mode 2026, sem copiar UI real",
  "cards flutuantes translucidos de resposta AI",
  "pin/mapa local abstrato",
  "painel de busca por voz ou camera/Lens como simbolo, sem copiar UI real",
  "camadas espaciais de realidade aumentada com bordas suaves",
];

const STOCK_PHOTO_EDIT_INSTRUCTION =
  "Use a foto-base fornecida de banco de imagem como pessoa principal; preserve 100% rosto, olhos, olhar, expressao, pose, roupa, iluminacao, proporcoes, pele, cabelo, fundo e aparencia original; nao feche os olhos se estiverem abertos, nao mude a direcao do olhar, nao redesenhe a pessoa e nao invente outro modelo. Nao force toque, gesto ou interacao; se a pessoa estiver apenas pensando, olhando ou posando, adapte os overlays AR ao olhar e ao espaco da foto.";

function uniqueVisualItems(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function coverGoogleVisualSystemFor(value: string) {
  const items = [...GOOGLE_INSPIRED_VISUAL_SYSTEM];
  return uniqueVisualItems(items).slice(0, 5);
}

function augmentedRealityDirectionFor(items: string[]) {
  return `Adicionar elementos de realidade aumentada editorial somente onde a foto-base permitir, perto do olhar, mao, tela, espelho, produto ou area livre: ${items.slice(0, 4).join(", ")}. Organize como uma composicao clara: 1 painel principal maior, ate 2 paineis secundarios menores, alinhados a perspectiva da foto, sem cobrir rosto, olhos, boca ou produto principal. Os elementos devem parecer paineis rigidos, translucidos e alinhados no espaco, inspirados no novo visual de busca AI. Preferir nome Google apenas em texto neutro quando indispensavel; nao usar logotipo oficial, nao imitar a identidade visual da marca e nao copiar telas reais.`;
}

function bodyGoogleVisualSystemFor(normalized: string, terms: string[]) {
  const items = [
    "painel AR translucido inspirado em busca AI",
    "card flutuante limpo",
    "gradiente sutil tipo Google I/O sem logotipo",
  ];
  const value = `${normalized} ${normalizePlanText(terms.join(" "))}`;
  if (
    value.includes("perfil da empresa") ||
    value.includes("busca local") ||
    value.includes("google")
  ) {
    items.push(
      "pin/mapa local abstrato",
      "search box inteligente sem marca oficial",
    );
  }
  if (
    value.includes("agenda") ||
    value.includes("agendamento") ||
    value.includes("calendario")
  ) {
    items.push("calendario AR simples", "linha de fluxo estabilizada");
  }
  if (
    value.includes("orcamento") ||
    value.includes("custo") ||
    value.includes("cac") ||
    value.includes("anuncio")
  ) {
    items.push("barras de investimento rigidas", "filtro estrategico em vidro");
  }
  if (
    value.includes("reputacao") ||
    value.includes("avaliacao") ||
    value.includes("confianca")
  ) {
    items.push(
      "avaliacoes como cards organizados",
      "selo de confianca abstrato",
    );
  }
  return uniqueVisualItems(items).slice(0, 5);
}

function defaultCoverArtDirection(): CoverArtDirection {
  return coverDirection({
    cameraAngle: "angulo 3/4 levemente lateral, nao frontal",
    framing:
      "meio corpo dentro da area segura central, laterais limpas para recorte",
    modelPose:
      "pessoa da foto-base em postura de concentracao, sem sorriso posado e sem olhar direto para a camera",
    modelAction:
      "olhando, pensando ou observando o objeto do tema conforme a foto-base ja sugerir, sem forcar gesto",
    compositionVariant:
      "retrato editorial assimetrico com espaco negativo controlado",
    heroProp: "objeto visual simples ligado ao tema do artigo",
    backgroundMotif:
      "interface abstrata sutil do tema, desfocada e sem texto pequeno",
    textMode: "sem texto dentro da imagem",
    doNotRepeat: [
      "retrato frontal sorrindo",
      "notebook frontal generico",
      "pessoa olhando para camera",
      "funil cheio de dados",
    ],
  });
}

function coverArtDirectionFor(value: string): CoverArtDirection {
  return defaultCoverArtDirection();
}

function buildCoverVisualConcept(
  plan: EditorialArticlePlan | undefined,
  keyword: string,
  title: string,
): CoverVisualConcept {
  const value = normalizePlanText(
    [plan?.slug, keyword, title].filter(Boolean).join(" "),
  );
  const withGoogleLayer = (
    concept: Omit<
      CoverVisualConcept,
      | "googleInspiredVisualSystem"
      | "augmentedRealityDirection"
      | "stockPhotoEditInstruction"
    >,
  ): CoverVisualConcept => {
    const googleInspiredVisualSystem = coverGoogleVisualSystemFor(value);
    return {
      ...concept,
      googleInspiredVisualSystem,
      augmentedRealityDirection: augmentedRealityDirectionFor(
        googleInspiredVisualSystem,
      ),
      stockPhotoEditInstruction: STOCK_PHOTO_EDIT_INSTRUCTION,
    };
  };

  return withGoogleLayer({
    variable: plan?.primaryKeyword || keyword || title,
    differentiator: plan?.uniqueIntent || "diferencial editorial do artigo",
    scene:
      "pessoa da foto-base interagindo com paineis AR ligados ao tema do artigo",
    artDirection: defaultCoverArtDirection(),
  });
}

function slugVariable(
  plan: EditorialArticlePlan | undefined,
  keyword: string,
  title: string,
) {
  return buildCoverVisualConcept(plan, keyword, title).variable;
}

function buildCoverPrompt(
  plan: EditorialArticlePlan | undefined,
  title: string,
  keyword: string,
) {
  const concept = buildCoverVisualConcept(plan, keyword, title);
  const art = concept.artDirection;

  return [
    `Edite a foto-base fornecida de banco de imagem para criar uma capa 16:9 editorial fotorealista e crop-safe para o tema ${concept.variable}.`,
    concept.stockPhotoEditInstruction,
    `Diferenciador visual obrigatorio: ${concept.differentiator}.`,
    `Sistema visual inspirado em Google Search/I/O 2026, sem copiar UI real: ${concept.googleInspiredVisualSystem.join(", ")}. Preferir sem logotipo oficial; se for indispensavel pelo contexto editorial de SEO, usar apenas referencia textual neutra a Google, pequena e sem sugerir parceria, certificacao ou endosso.`,
    `Realidade aumentada: ${concept.augmentedRealityDirection}`,
    "Organizacao visual: 1 painel AR principal maior e ate 2 secundarios menores, alinhados ao olhar, mao, tela, espelho, produto ou mesa da foto-base quando existir espaco livre. Nao cubra rosto, olhos, boca, pele, cabelo, produto principal ou gesto importante.",
    `Direcao de arte: ${art.compositionVariant}.`,
    `Camera/enquadramento: ${art.cameraAngle}; ${art.framing}.`,
    `Pose da pessoa/foto-base: ${art.modelPose}.`,
    `Acao principal: ${art.modelAction}.`,
    `Objeto principal: ${art.heroProp}.`,
    `Fundo/motivo: ${art.backgroundMotif}.`,
    `Texto na imagem: ${art.textMode}; se houver palavra curta, ela deve ser grande, legivel e em portugues do Brasil.`,
    "Mantenha o assunto principal dentro da area segura central, mas respeite a pose original: a pessoa pode estar pensando, olhando, lendo ou apenas posando; nao force toque, apontamento, sorriso, olhos fechados ou interacao artificial.",
    "Use apenas 1 ou 2 sinais visuais de apoio para diferenciar este artigo dos outros slugs parecidos; sem labels, sem checklist, sem funil cheio de dados e sem ecossistema completo na capa.",
    "Use fundo editorial hibrido limpo: centro levemente claro, bordas e sombras Midnight #0d1325, contraste medio-alto, 40-50% de peso escuro, acentos Emerald #20ffb4 e Cobalt #0b65ff, sem textura poluida.",
    `Nao repetir: ${art.doNotRepeat.join(", ")}.`,
    "Nao altere a pessoa da foto-base, nao invente outra pessoa, nao use sorriso artificial, UI real copiada, texto pequeno, ingles na imagem, paciente real, procedimento clinico, antes/depois, promessa de resultado ou cena manipulativa.",
  ].join(" ");
}

function buildPromptBase(
  plan: EditorialArticlePlan | undefined,
  title: string,
  keyword: string,
) {
  return "Use fundo editorial hibrido limpo: centro levemente claro, bordas e sombras Midnight #0d1325, contraste medio-alto, 40-50% de peso escuro, acentos Emerald #20ffb4 e Cobalt #0b65ff. Visual limpo, moderno, sem fotos genericas, sem promessas medicas, sem antes/depois clinico, sem pessoas identificaveis.";
}

function compactText(value: string, words = 42) {
  return value.split(/\s+/).filter(Boolean).slice(0, words).join(" ");
}

function splitTextBlocks(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n{2,}|\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

const VISUAL_MARKER_PATTERN =
  /\bAQUI\s+VAI\s+A\s+IMAGEM\s+(\d+)\b|\[PLANO VISUAL\]/i;

type VisualTextBlock = {
  text: string;
  kind: "heading" | "paragraph" | "list" | "table" | "marker" | "other";
  level?: number;
};

function isVisualMarkerBlock(value: string) {
  return VISUAL_MARKER_PATTERN.test(value);
}

function isGenericVisualHeading(value: string) {
  return /^(diagnostico|checklist|conclusao|faq|duvidas|principais estrategias|guia pratico|introducao)/i.test(
    normalizePlanText(value),
  );
}

function isTerminalVisualHeading(value: string) {
  return /^(faq|duvidas|perguntas|conclusao|consideracoes finais|resumo|checklist final)/i.test(
    normalizePlanText(value),
  );
}

function outlineHeadingSet(outline: Array<{ text?: string; level?: number }>) {
  return new Set(
    outline
      .filter((item) => Number(item.level ?? 2) <= 3)
      .map((item) => normalizePlanText(String(item.text ?? "")))
      .filter(Boolean),
  );
}

function stripHtmlBlock(value: string) {
  return compactText(
    decodeHtmlEntities(
      value
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    ),
    120,
  );
}

function htmlVisualBlocks(html = ""): VisualTextBlock[] {
  if (!html.trim()) return [];
  const matches = Array.from(
    html.matchAll(/<(h[1-6]|p|li|blockquote|table)\b[^>]*>([\s\S]*?)<\/\1>/gi),
  );
  return matches
    .map((match): VisualTextBlock | null => {
      const tag = String(match[1] ?? "").toLowerCase();
      const raw = String(match[2] ?? "");
      const text = stripHtmlBlock(raw);
      if (!text) return null;
      if (isVisualMarkerBlock(text)) return { text, kind: "marker" as const };
      if (tag.startsWith("h"))
        return {
          text,
          kind: "heading" as const,
          level: Number(tag.slice(1)) || 2,
        };
      if (tag === "li") return { text, kind: "list" as const };
      if (tag === "table") return { text, kind: "table" as const };
      return { text, kind: "paragraph" as const };
    })
    .filter((item): item is VisualTextBlock => item !== null);
}

function textVisualBlocks(
  text: string,
  outline: Array<{ text?: string; level?: number }>,
): VisualTextBlock[] {
  const headingSet = outlineHeadingSet(outline);
  return splitTextBlocks(text).map((block) => {
    const normalized = normalizePlanText(block);
    if (isVisualMarkerBlock(block)) return { text: block, kind: "marker" };
    if (headingSet.has(normalized)) {
      const outlineItem = outline.find(
        (item) => normalizePlanText(String(item.text ?? "")) === normalized,
      );
      return {
        text: block,
        kind: "heading",
        level: Number(outlineItem?.level ?? 2) || 2,
      };
    }
    return { text: block, kind: "paragraph" };
  });
}

function splitSentences(value: string) {
  return value
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractSpecificVisualTerms(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,;:.!?\n]/)
        .map((part) => compactText(part.trim(), 6))
        .filter((part) => part.length > 3),
    ),
  ).slice(0, 7);
}

function sentenceScore(sentence: string) {
  const normalized = normalizePlanText(sentence);
  let score = 0;
  if (sentence.split(/\s+/).length >= 10) score += 1;
  if (/\d|%|cac|nap|seo|google|whatsapp/i.test(sentence)) score += 2;
  score += extractSpecificVisualTerms(sentence).length;
  if (
    /\b(significa|permite|funciona|depender|quando|por isso|sem um|em vez de)\b/.test(
      normalized,
    )
  )
    score += 1;
  return score;
}

function extractStrongSentence(value: string) {
  const candidates = splitSentences(value)
    .map((sentence) => compactText(sentence, 34))
    .filter((sentence) => sentence.split(/\s+/).length >= 7);
  if (!candidates.length) return compactText(value, 34);
  return candidates.sort((a, b) => sentenceScore(b) - sentenceScore(a))[0];
}

function extractVisualMarkers(
  text: string,
  outline: Array<{ text?: string; level?: number }>,
  html = "",
) {
  const htmlBlocks = htmlVisualBlocks(html);
  const blocks = htmlBlocks.some((block) => block.kind === "marker")
    ? htmlBlocks
    : textVisualBlocks(text, outline);
  const usefulHeadings = firstUsefulHeadings(outline);
  const markers: Array<{
    markerId: string;
    raw: string;
    heading?: string;
    markerSection?: string;
    contextBefore: string;
    contextAfter: string;
    strongSentence: string;
    specificTerms: string[];
    sourceTextUsed: string;
  }> = [];

  let currentHeading = usefulHeadings[0] ?? "";
  blocks.forEach((block, index) => {
    if (block.kind === "heading") currentHeading = block.text;

    const match = VISUAL_MARKER_PATTERN.exec(block.text);
    if (!match) return;

    const markerNumber = match[1] || String(markers.length + 1);
    const previous = blocks
      .slice(Math.max(0, index - 2), index)
      .filter(
        (item) => item.kind !== "marker" && !isVisualMarkerBlock(item.text),
      )
      .map((item) => item.text);
    const next: VisualTextBlock[] = [];
    let nextHeading = "";
    let paragraphCount = 0;
    let nextWordCount = 0;
    for (const item of blocks.slice(index + 1)) {
      if (item.kind === "marker" || isVisualMarkerBlock(item.text)) break;
      if (!item.text.trim()) continue;
      if (item.kind === "table") break;
      if (item.kind === "heading") {
        if (isTerminalVisualHeading(item.text) && next.length > 0) break;
        if (
          Number(item.level ?? 2) <= 2 &&
          next.some((entry) => entry.kind !== "heading")
        )
          break;
        if (!nextHeading && !isGenericVisualHeading(item.text))
          nextHeading = item.text;
      } else {
        paragraphCount += 1;
      }
      next.push(item);
      nextWordCount += item.text.split(/\s+/).filter(Boolean).length;
      if (paragraphCount >= 5 || next.length >= 10 || nextWordCount >= 230)
        break;
    }

    const sectionText = next.map((item) => item.text).join(" ");
    const proseText = next
      .filter((item) => item.kind !== "heading")
      .map((item) => item.text)
      .join(" ");
    const strongSentence = extractStrongSentence(
      proseText || sectionText || nextHeading || currentHeading,
    );
    const specificTerms = extractSpecificVisualTerms(
      [nextHeading, proseText || sectionText].filter(Boolean).join(" "),
    );
    markers.push({
      markerId: `imagem-${markerNumber}`,
      raw: match[0],
      heading: nextHeading || currentHeading,
      markerSection: nextHeading || currentHeading,
      contextBefore: compactText(previous.join(" "), 54),
      contextAfter: compactText(sectionText, 90),
      strongSentence,
      specificTerms,
      sourceTextUsed: compactText(
        [nextHeading, strongSentence, proseText || sectionText]
          .filter(Boolean)
          .join(" "),
        220,
      ),
    });
  });

  return markers;
}

function bodyArtDirectionFor(args: {
  normalized: string;
  visualTheme: string;
  markerId?: string;
  preferredFocalObject?: string;
  preferredAction?: string;
  preferredSupportObjects?: string[];
}): BodyArtDirection {
  const markerNumber = Number(/\d+/.exec(args.markerId ?? "")?.[0] ?? 1);
  const variants = [
    bodyDirection({
      layoutPattern:
        "metafora central com dois elementos orbitando em espaco amplo",
      focalObject: args.preferredFocalObject || "objeto central abstrato",
      visualAction:
        args.preferredAction ||
        "transformar a ideia do trecho em uma cena simples",
      supportObjects: args.preferredSupportObjects || [
        "pista visual do problema",
        "pista visual da solucao",
      ],
      doNotRepeat: [
        "browser com escudo no centro",
        "cartoes empilhados",
        "cenário sem relação com o tema",
        "setas neon em excesso",
      ],
      markerVariant: "foco central minimalista",
    }),
    bodyDirection({
      layoutPattern:
        "split-screen editorial com contraste antes/depois, sem inventar resultados",
      focalObject:
        args.preferredFocalObject ||
        "divisao visual entre problema e organizacao",
      visualAction:
        args.preferredAction ||
        "mostrar a passagem de um estado confuso para um estado claro",
      supportObjects: args.preferredSupportObjects || [
        "lado caotico suavizado",
        "lado organizado limpo",
      ],
      doNotRepeat: [
        "escudo grande",
        "mapa como fundo",
        "browser central",
        "muitos cards",
      ],
      markerVariant: "comparativo limpo",
    }),
    bodyDirection({
      layoutPattern:
        "top-down editorial com objeto fisico/digital sobre superficie limpa",
      focalObject:
        args.preferredFocalObject || "objeto principal visto de cima",
      visualAction:
        args.preferredAction || "organizar o conceito em uma decisao visual",
      supportObjects: args.preferredSupportObjects || [
        "anotacao grande",
        "marcador visual",
        "linha discreta",
      ],
      doNotRepeat: [
        "painel 3D escuro",
        "predio",
        "setas grandes",
        "pilha de cartoes",
      ],
      markerVariant: "mesa limpa top-down",
    }),
    bodyDirection({
      layoutPattern: "close-up de interface abstrata com muito espaco negativo",
      focalObject: args.preferredFocalObject || "interface simples em close",
      visualAction:
        args.preferredAction || "destacar um unico ponto de decisao",
      supportObjects: args.preferredSupportObjects || [
        "um indicador grande",
        "uma linha de progresso discreta",
      ],
      doNotRepeat: [
        "modelo humana",
        "dashboard cheio",
        "mapa complexo",
        "texto pequeno",
      ],
      markerVariant: "close minimalista",
    }),
    bodyDirection({
      layoutPattern: "caminho diagonal com 3 etapas maximas e margem ampla",
      focalObject: args.preferredFocalObject || "trajeto simples do conceito",
      visualAction:
        args.preferredAction || "guiar o olhar por uma sequencia curta",
      supportObjects: args.preferredSupportObjects || [
        "inicio",
        "meio",
        "resultado prudente",
      ],
      doNotRepeat: [
        "funil",
        "rede de conexoes",
        "neon em excesso",
        "cards repetidos",
      ],
      markerVariant: "trajeto curto",
    }),
  ];

  if (args.normalized.includes("redes") || args.normalized.includes("depend"))
    return variants[(markerNumber + 1) % variants.length];
  if (
    args.normalized.includes("intencao") ||
    args.normalized.includes("procurando")
  )
    return variants[(markerNumber + 3) % variants.length];
  if (
    args.normalized.includes("perene") ||
    args.normalized.includes("longo prazo")
  )
    return variants[(markerNumber + 3) % variants.length];
  return variants[(markerNumber - 1 + variants.length) % variants.length];
}

function localThemeFromHeading(heading: string, fallback: string) {
  const cleanHeading = heading.trim();
  if (
    cleanHeading &&
    !/^(diagnostico|checklist|conclusao|faq|duvidas|principais estrategias)/i.test(
      cleanHeading,
    )
  ) {
    return compactText(cleanHeading, 9);
  }
  return compactText(fallback, 9) || "ideia central do trecho";
}

function buildBodyContextPrompt(args: {
  keyword: string;
  heading: string;
  contextBefore?: string;
  contextAfter?: string;
  sourceTextUsed?: string;
  markerSection?: string;
  strongSentence?: string;
  specificTerms?: string[];
  markerId?: string;
  markerLabel?: string;
}) {
  const concept = buildLocalVisualConcept({
    keyword: args.keyword,
    heading: args.heading,
    contextBefore: args.contextBefore,
    contextAfter: args.contextAfter,
    sourceTextUsed: args.sourceTextUsed,
    markerSection: args.markerSection,
    strongSentence: args.strongSentence,
    specificTerms: args.specificTerms,
    markerId: args.markerId,
  });
  const art = concept.artDirection;
  const elements = art.supportObjects.slice(0, 2).join(", ");
  const terms = concept.specificTerms.slice(0, 4).join(", ");
  return [
    `Crie uma imagem editorial quadrada 1:1 para representar especificamente: ${concept.strongSentence}.`,
    `Tema especifico: ${concept.visualTheme}.`,
    terms
      ? `Use estes sinais concretos do trecho como guia visual: ${terms}.`
      : "",
    `Sistema visual inspirado em Google Search/I/O 2026, sem logotipo oficial e sem copiar UI real: ${concept.googleInspiredVisualSystem.join(", ")}.`,
    `Realidade aumentada editorial: ${concept.augmentedRealityDirection}`,
    `Cena principal: ${concept.localVisualBrief}; metafora principal: ${concept.mainMetaphor}.`,
    "Escopo: representar somente a ideia local do trecho. Nao mostre o artigo inteiro, todos os canais do marketing, ecossistema completo, pipeline ou funil, salvo quando o proprio trecho falar de filtro, orcamento, CAC ou custo.",
    `Composicao: ${art.layoutPattern}; objeto focal ${art.focalObject}; acao visual ${art.visualAction}.`,
    elements
      ? `Elementos de apoio permitidos, no maximo dois: ${elements}.`
      : "",
    `Diferenciacao visual: ${art.markerVariant}.`,
    "Composicao limpa: um foco principal, no maximo 2-3 elementos de apoio e 30-40% de area livre com margens de respiro.",
    "Evite o pacote visual generico de busca local, conteudo, confianca e contato se esses elementos nao estiverem no conceito local.",
    `Nao repetir: ${art.doNotRepeat.join(", ")}.`,
    "Nao use excesso de mapas, setas, cards, predios, brilhos, redes, logos ou elementos decorativos sem funcao.",
    "Use poucos rotulos grandes apenas se forem indispensaveis; nao use texto pequeno.",
    "A imagem deve explicar esta ideia especifica do trecho, nao resumir o artigo inteiro nem repetir sempre o mesmo funil.",
    "Fundo hibrido limpo com 40-50% de peso escuro, centro levemente claro, bordas Midnight e acentos Emerald/Cobalt para funcionar no modo claro e escuro.",
    "Nao use pessoa como foco principal, nao use foto generica, nao use texto pequeno e nao prometa resultado.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildLocalVisualConcept(args: {
  keyword: string;
  heading: string;
  contextBefore?: string;
  contextAfter?: string;
  sourceTextUsed?: string;
  markerSection?: string;
  strongSentence?: string;
  specificTerms?: string[];
  markerId?: string;
}): LocalVisualConcept {
  const localSource = [
    args.markerSection || args.heading,
    args.sourceTextUsed || args.contextAfter,
  ]
    .filter(Boolean)
    .join(" ");
  const combined = localSource || args.contextBefore || args.keyword;
  const normalized = normalizePlanText(combined);
  const strongSentence = args.strongSentence || extractStrongSentence(combined);
  const specificTerms = Array.from(
    new Set([
      ...(args.specificTerms ?? []),
      ...extractSpecificVisualTerms(combined),
      ...extractSpecificVisualTerms(strongSentence),
    ]),
  ).slice(0, 7);
  const googleInspiredVisualSystem = bodyGoogleVisualSystemFor(
    normalized,
    specificTerms,
  );
  const headingTheme =
    normalizePlanText(args.markerSection || args.heading).length > 0
      ? (args.markerSection || args.heading).trim()
      : "";
  const artDirection = (
    visualTheme: string,
    preferredFocalObject: string,
    preferredAction: string,
    preferredSupportObjects: string[],
  ) =>
    bodyArtDirectionFor({
      normalized,
      visualTheme,
      markerId: args.markerId,
      preferredFocalObject,
      preferredAction,
      preferredSupportObjects,
    });
  const concept = (
    visualTheme: string,
    localVisualBrief: string,
    mainMetaphor: string,
    supportingElements: string[],
    art: BodyArtDirection,
  ): LocalVisualConcept => ({
    visualTheme,
    localVisualBrief,
    mainMetaphor,
    supportingElements,
    markerSection: args.markerSection || args.heading || undefined,
    strongSentence,
    specificTerms,
    artDirection: art,
    googleInspiredVisualSystem,
    augmentedRealityDirection: augmentedRealityDirectionFor(
      googleInspiredVisualSystem,
    ),
  });

  const theme =
    headingTheme &&
    !/^(diagnostico|checklist|conclusao|faq|duvidas|principais estrategias)/i.test(
      headingTheme,
    )
      ? compactText(headingTheme, 9)
      : compactText(combined, 9) || "ideia central do trecho";

  return concept(
    theme,
    `represente ${compactText(strongSentence || combined, 30)} com uma metafora visual simples e especifica`,
    "um painel editorial minimalista com a ideia principal no centro",
    specificTerms.length
      ? specificTerms.slice(0, 2)
      : ["um objeto central", "duas pistas visuais do contexto"],
    artDirection(
      theme,
      "objeto central do trecho",
      "transformar a frase principal do trecho em uma cena visual simples",
      specificTerms.length
        ? specificTerms.slice(0, 2)
        : ["um objeto central", "duas pistas visuais do contexto"],
    ),
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToText(value: string) {
  return compactText(
    decodeHtmlEntities(
      value
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    ),
    24,
  );
}

function extractRelevantTable(html = "") {
  const tableMatches = Array.from(html.matchAll(/<table[\s\S]*?<\/table>/gi));
  for (const tableMatch of tableMatches) {
    const tableHtml = tableMatch[0] ?? "";
    const rows = Array.from(tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi))
      .map((rowMatch) => {
        const rowHtml = rowMatch[0] ?? "";
        return Array.from(rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi))
          .map((cellMatch) => htmlToText(cellMatch[1] ?? ""))
          .filter(Boolean);
      })
      .filter((row) => row.length >= 2);

    if (rows.length < 2) continue;

    const headers = rows[0];
    const bodyRows = rows.slice(1, 6);
    if (headers.length < 2 || bodyRows.length < 2) continue;

    return {
      headers,
      rows: bodyRows,
    };
  }

  return null;
}

function buildTableVisualPrompt(args: {
  base: string;
  keyword: string;
  headers: string[];
  rows: string[][];
}) {
  const headerText = args.headers.join(" | ");
  const rowText = args.rows
    .slice(0, 4)
    .map((row) => row.join(" | "))
    .join(" / ");

  return [
    `${args.base} Crie uma imagem 5:4 (1200x960) que transforme a tabela do artigo em um visual comparativo editorial.`,
    `Headers da tabela: ${headerText}.`,
    `Linhas principais resumidas: ${rowText}.`,
    `Objetivo: facilitar a comparacao sobre ${args.keyword} sem substituir a tabela HTML do artigo.`,
    "Use visual inspirado em Google Search/I/O 2026 sem logotipo: cards translucidos, paineis AR rigidos, gradiente controlado e hierarquia limpa.",
    "Texto da tabela: use portugues do Brasil; preserve todos os cabecalhos e criterios principais; resuma celulas sem omitir colunas; nao invente dados; nao use ingles.",
    "Use cards, colunas claras, hierarquia visual forte e palavras grandes essenciais; nao copie a tabela inteira em texto pequeno, mas nao perca nenhum detalhe estrutural importante.",
    "Use fundo editorial hibrido claro/escuro equilibrado: centro levemente claro, bordas e sombras Midnight, 40-50% de peso escuro e acentos Emerald/Cobalt.",
    "Nao prometa resultado, ranking, agenda cheia ou captacao garantida.",
  ].join(" ");
}

function bodyConceptSignature(concept: LocalVisualConcept) {
  return normalizePlanText(
    [
      concept.visualTheme,
      concept.mainMetaphor,
      concept.strongSentence,
      concept.specificTerms.join(" "),
      concept.artDirection.focalObject,
      concept.artDirection.visualAction,
    ].join(" "),
  );
}

export function buildVisualPlanForArticle(args: {
  articlePlan?: EditorialArticlePlan;
  title: string;
  keyword: string;
  text: string;
  html?: string;
  outline?: Array<{ text?: string; level?: number }>;
  images?: Array<{
    url?: string | null;
    alt?: string | null;
    kind?: string | null;
  }>;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  ogImageUrl?: string | null;
}) {
  const plan = args.articlePlan;
  const title = args.title || plan?.title || "";
  const keyword = args.keyword || plan?.primaryKeyword || title;
  const words = wordCount(args.text);
  const base = buildPromptBase(plan, title, keyword);
  const hasHero = Boolean(args.heroImageUrl?.trim());
  const hasHeroAlt = Boolean(args.heroImageAlt?.trim());
  const hasOgImage = Boolean(args.ogImageUrl?.trim());
  const bodyImageCount = (args.images ?? []).filter((image) => {
    if (!image?.url) return false;
    if (image.url === args.heroImageUrl) return false;
    return image.kind !== "hero" && image.kind !== "og";
  }).length;
  const headings = firstUsefulHeadings(args.outline ?? []);
  const visualMarkers = extractVisualMarkers(
    args.text,
    args.outline ?? [],
    args.html ?? "",
  );
  const hasVisualPlaceholder =
    args.text.includes("[PLANO VISUAL]") || visualMarkers.length > 0;
  const relevantTable = extractRelevantTable(args.html);

  const suggestions: VisualPlanSuggestion[] = [];

  if (!hasHero) {
    const coverConcept = buildCoverVisualConcept(plan, keyword, title);
    suggestions.push({
      id: `${plan?.slug ?? "article"}-hero`,
      kind: "hero",
      priority: "required",
      visualRole: "cover_thumbnail",
      coverSourceMode: "stock_image_edit",
      googleInspiredVisualSystem: coverConcept.googleInspiredVisualSystem,
      augmentedRealityDirection: coverConcept.augmentedRealityDirection,
      stockPhotoEditInstruction: coverConcept.stockPhotoEditInstruction,
      generatorPromptProfile: "multi_generator",
      placement: "Capa do artigo",
      visualType: "capa editorial fotorealista com foto-base e overlays AR",
      aspectRatio: "16:9 / 1200x675",
      cropGuidance:
        "Manter rosto/pessoa e elemento central dentro da area central segura; laterais podem ser recortadas sem perder sentido.",
      promptIntent: `Criar miniatura crop-safe para representar ${coverConcept.variable}.`,
      visualTheme: coverConcept.variable,
      coverVariable: coverConcept.variable,
      coverDifferentiator: coverConcept.differentiator,
      coverArtDirection: coverConcept.artDirection,
      compositionVariant: coverConcept.artDirection.compositionVariant,
      cameraAngle: coverConcept.artDirection.cameraAngle,
      modelPose: coverConcept.artDirection.modelPose,
      modelAction: coverConcept.artDirection.modelAction,
      doNotRepeat: coverConcept.artDirection.doNotRepeat,
      prompt: buildCoverPrompt(plan, title, keyword),
      altText: `Capa editorial sobre ${coverConcept.variable}`,
      caption: `Capa visual do tema: ${coverConcept.variable}.`,
      objective:
        "Criar uma capa/thumbnail centralizada, reconhecivel em recortes e sem excesso de informacao.",
    });
  }

  const bodyNeedsImage = words >= 900 || bodyImageCount === 0;
  const seenBodyConcepts = new Map<string, string>();
  if (visualMarkers.length > 0) {
    visualMarkers.forEach((marker) => {
      const heading =
        marker.heading || headings[0] || "Trecho marcado para imagem";
      const localConcept = buildLocalVisualConcept({
        keyword,
        heading,
        contextBefore: marker.contextBefore,
        contextAfter: marker.contextAfter,
        sourceTextUsed: marker.sourceTextUsed,
        markerSection: marker.markerSection,
        strongSentence: marker.strongSentence,
        specificTerms: marker.specificTerms,
        markerId: marker.markerId,
      });
      const suggestionId = `${plan?.slug ?? "article"}-${marker.markerId}`;
      const conceptSignature = bodyConceptSignature(localConcept);
      const duplicateOf = seenBodyConcepts.get(conceptSignature);
      if (!duplicateOf) seenBodyConcepts.set(conceptSignature, suggestionId);
      suggestions.push({
        id: suggestionId,
        kind: "body",
        priority: duplicateOf ? "medium" : "high",
        visualRole: "body_context",
        markerId: marker.markerId,
        placement: `Na marcacao: ${marker.raw}`,
        sectionHeading: heading,
        visualType: "imagem quadrada contextual de respiro",
        aspectRatio: "1:1",
        contextBefore: marker.contextBefore,
        contextAfter: marker.contextAfter,
        sourceTextUsed: marker.sourceTextUsed,
        markerSection: localConcept.markerSection,
        strongSentence: localConcept.strongSentence,
        specificTerms: localConcept.specificTerms,
        visualDuplicateOf: duplicateOf,
        dedupeReason: duplicateOf
          ? `Conceito visual equivalente a ${duplicateOf}; reutilize a imagem anterior ou gere uma variacao apenas se o trecho exigir.`
          : undefined,
        visualTheme: localConcept.visualTheme,
        localVisualBrief: localConcept.localVisualBrief,
        googleInspiredVisualSystem: localConcept.googleInspiredVisualSystem,
        augmentedRealityDirection: localConcept.augmentedRealityDirection,
        generatorPromptProfile: "multi_generator",
        bodyArtDirection: localConcept.artDirection,
        compositionVariant: localConcept.artDirection.markerVariant,
        layoutPattern: localConcept.artDirection.layoutPattern,
        focalObject: localConcept.artDirection.focalObject,
        doNotRepeat: localConcept.artDirection.doNotRepeat,
        promptIntent: `Apoiar o trecho sobre ${localConcept.visualTheme}, sem resumir o artigo inteiro.`,
        prompt: buildBodyContextPrompt({
          keyword,
          heading,
          contextBefore: marker.contextBefore,
          contextAfter: marker.contextAfter,
          sourceTextUsed: marker.sourceTextUsed,
          markerSection: marker.markerSection,
          strongSentence: marker.strongSentence,
          specificTerms: marker.specificTerms,
          markerId: marker.markerId,
          markerLabel: marker.raw,
        }),
        altText: `Imagem contextual sobre ${localConcept.visualTheme}`,
        caption: `Apoio visual para entender ${localConcept.visualTheme}.`,
        objective: duplicateOf
          ? "Trecho visualmente parecido com outra marcacao; evitar gerar uma segunda imagem redundante."
          : "Apoiar a narrativa exatamente no ponto marcado no artigo.",
      });
    });
  }
  if (!visualMarkers.length && bodyNeedsImage) {
    const firstHeading = headings[0] || "Primeira explicacao densa";
    const localConcept = buildLocalVisualConcept({
      keyword,
      heading: firstHeading,
      contextAfter: firstHeading,
      sourceTextUsed: firstHeading,
      markerId: "fallback-1",
    });
    suggestions.push({
      id: `${plan?.slug ?? "article"}-body-flow`,
      kind: "body",
      priority: bodyImageCount === 0 ? "high" : "medium",
      visualRole: "body_context",
      placement: `Depois da secao: ${firstHeading}`,
      sectionHeading: firstHeading,
      visualTheme: localConcept.visualTheme,
      localVisualBrief: localConcept.localVisualBrief,
      googleInspiredVisualSystem: localConcept.googleInspiredVisualSystem,
      augmentedRealityDirection: localConcept.augmentedRealityDirection,
      generatorPromptProfile: "multi_generator",
      markerSection: localConcept.markerSection,
      strongSentence: localConcept.strongSentence,
      specificTerms: localConcept.specificTerms,
      sourceTextUsed: firstHeading,
      bodyArtDirection: localConcept.artDirection,
      compositionVariant: localConcept.artDirection.markerVariant,
      layoutPattern: localConcept.artDirection.layoutPattern,
      focalObject: localConcept.artDirection.focalObject,
      doNotRepeat: localConcept.artDirection.doNotRepeat,
      promptIntent: `Explicar ${localConcept.visualTheme} com uma imagem quadrada de respiro.`,
      visualType:
        plan?.role === "PILLAR"
          ? "mapa de silo e fluxo de decisao"
          : "fluxo operacional em 3 a 5 passos",
      aspectRatio: "1:1",
      prompt: buildBodyContextPrompt({
        keyword,
        heading: firstHeading,
        contextAfter: firstHeading,
        sourceTextUsed: firstHeading,
        markerSection: localConcept.markerSection,
        strongSentence: localConcept.strongSentence,
        specificTerms: localConcept.specificTerms,
        markerId: "fallback-1",
      }),
      altText: `Fluxo visual para entender ${localConcept.visualTheme}`,
      caption: `Fluxo pratico para visualizar ${localConcept.visualTheme}.`,
      objective:
        "Quebrar trecho denso e explicar o raciocinio sem depender de leitura longa.",
    });
  }

  if (relevantTable) {
    suggestions.push({
      id: `${plan?.slug ?? "article"}-table-visual`,
      kind: "body",
      priority: "medium",
      visualRole: "table_visual",
      placement: "Apoio visual para tabela comparativa",
      sectionHeading: headings[0] || "Tabela comparativa",
      promptIntent:
        "Transformar a tabela mais importante do artigo em infografico 5:4 sem substituir o HTML.",
      visualTheme: "comparativo visual da tabela",
      localVisualBrief: `comparar ${relevantTable.headers.join(", ")} sem copiar a tabela inteira`,
      googleInspiredVisualSystem: uniqueVisualItems([
        "cards comparativos translucidos inspirados em busca AI",
        "colunas rigidas em glassmorphism sutil",
        "gradiente discreto tipo Google I/O sem logotipo",
      ]),
      augmentedRealityDirection:
        "Representar a tabela como paineis AR comparativos, rigidos e alinhados, com poucos rotulos grandes em portugues do Brasil e sem copiar toda a tabela.",
      generatorPromptProfile: "multi_generator",
      sourceTextUsed: relevantTable.rows
        .map((row) => row.join(" | "))
        .join(" / "),
      visualType: "tabela visual comparativa 5:4",
      aspectRatio: "5:4 / 1200x960",
      contextBefore: `Colunas: ${relevantTable.headers.join(" | ")}`,
      contextAfter: relevantTable.rows
        .map((row) => row.join(" | "))
        .join(" / "),
      prompt: buildTableVisualPrompt({
        base,
        keyword,
        headers: relevantTable.headers,
        rows: relevantTable.rows,
      }),
      altText: `Tabela visual comparativa sobre ${keyword}`,
      caption: `Comparacao visual para apoiar a tabela sobre ${keyword}.`,
      objective:
        "Criar um apoio visual mais escaneavel para a tabela, mantendo a tabela HTML no artigo.",
    });
  }

  const warnings: string[] = [];
  if (!hasHero) warnings.push("Capa obrigatoria ausente.");
  if (hasHero && !hasHeroAlt) warnings.push("Capa sem alt text.");
  if (!hasOgImage && !hasHero)
    warnings.push("Imagem OG deve herdar a capa assim que ela for definida.");
  if (words >= 900 && bodyImageCount === 0)
    warnings.push("Artigo longo sem imagem util no corpo.");
  if (hasVisualPlaceholder)
    warnings.push(
      "Existe placeholder de plano visual no texto; substitua por imagem real antes de publicar.",
    );

  const diagnostics: VisualPlanDiagnostics = {
    hasHero,
    hasHeroAlt,
    hasOgImage,
    ogStatus: hasOgImage ? "defined" : "inherits_hero",
    bodyImageCount,
    wordCount: words,
    missingHero: !hasHero,
    missingHeroAlt: hasHero && !hasHeroAlt,
    longArticleNeedsBodyImage: words >= 900 && bodyImageCount === 0,
    hasVisualPlaceholder,
    warnings,
  };

  return { suggestions, diagnostics };
}
