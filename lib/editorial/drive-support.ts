import { brandConfig } from "@/brand.config";
import {
  findEditorialArticlePlan,
  type EditorialArticlePlan,
} from "./content-plan";

export type DriveSupportSource = {
  id: string;
  title: string;
  url: string;
  localPath?: string;
  mimeType: string;
  tags: Array<
    | "kgr"
    | "silos"
    | "eeat"
    | "ymyl"
    | "lsi"
    | "pnl"
    | "bert"
    | "copy"
    | "marketing"
    | "technical-seo"
    | "anti-cannibalization"
    | "visual"
    | "blog-strategy"
    | "local-seo"
    | "linking"
    | "topical-authority"
    | "manifesto"
    | "bottom-funnel"
    | "geo"
    | "b2b-strategy"
  >;
  guidance: string;
};

export const EDITORIAL_SUPPORT_FOLDER = brandConfig.supportFolder;

export const EDITORIAL_SUPPORT_SOURCES: DriveSupportSource[] =
  brandConfig.supportSources;

const CORE_SOURCE_IDS = new Set<string>();

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTags(args: {
  title?: string | null;
  keyword?: string | null;
  text?: string | null;
  plan?: EditorialArticlePlan | null;
}) {
  const value = normalize(
    [
      args.title,
      args.keyword,
      args.text?.slice(0, 1200),
      args.plan?.uniqueIntent,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const tags = new Set<DriveSupportSource["tags"][number]>([
    "kgr",
    "silos",
    "anti-cannibalization",
    "lsi",
    "blog-strategy",
    "manifesto",
    "bottom-funnel",
    "geo",
  ]);

  if (
    /\b(saude|medic|clinica|paciente|odont|dentista|harmonizacao|estetica|ymyl|crm|cro|cfm|cfo)\b/.test(
      value,
    )
  ) {
    tags.add("eeat");
    tags.add("ymyl");
  }
  if (/\b(pnl|bert|entidade|semant|lsi|snippet|google)\b/.test(value)) {
    tags.add("pnl");
    tags.add("bert");
  }
  if (/\b(copy|campanha|marketing|conversao|cta|pitch|persuas)\b/.test(value)) {
    tags.add("copy");
    tags.add("marketing");
  }
  if (
    /\b(fundo|funil|lead|leads|trafego|ads|anuncio|instagram|tiktok|influencer|promoc|desconto|geo|b2b)\b/.test(
      value,
    )
  ) {
    tags.add("manifesto");
    tags.add("bottom-funnel");
    tags.add("geo");
    tags.add("b2b-strategy");
    tags.add("copy");
    tags.add("marketing");
  }
  if (
    /\b(canonical|index|schema|tecnico|link|silo|arquitetura)\b/.test(value)
  ) {
    tags.add("technical-seo");
  }
  if (
    /\b(google|maps|mapa|bairro|cidade|regiao|local|perfil|negocio|nap|reputacao|avaliac)\b/.test(
      value,
    )
  ) {
    tags.add("local-seo");
  }
  if (
    /\b(anchor|ancora|link|pilar|suporte|hub|ponte|topica|autoridade)\b/.test(
      value,
    )
  ) {
    tags.add("linking");
    tags.add("topical-authority");
  }

  return tags;
}

export function selectDriveSupportSources(args: {
  title?: string | null;
  keyword?: string | null;
  text?: string | null;
  slug?: string | null;
  maxSources?: number;
}) {
  const plan = findEditorialArticlePlan({
    slug: args.slug,
    keyword: args.keyword,
    title: args.title,
  });
  const tags = inferTags({ ...args, plan });
  const maxSources = args.maxSources ?? 7;

  return EDITORIAL_SUPPORT_SOURCES.map((source) => {
    const coreScore = CORE_SOURCE_IDS.has(source.id) ? 10 : 0;
    const tagScore = source.tags.reduce(
      (score, tag) => score + (tags.has(tag) ? 2 : 0),
      0,
    );
    return { source, score: coreScore + tagScore };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSources)
    .map((item) => item.source);
}

export function buildDriveSupportPromptContext(args: {
  title?: string | null;
  keyword?: string | null;
  text?: string | null;
  slug?: string | null;
  maxSources?: number;
}) {
  const sources = selectDriveSupportSources(args);
  const sourceLines = sources.map(
    (source) => `- ${source.title}: ${source.guidance}`,
  );

  return {
    folder: EDITORIAL_SUPPORT_FOLDER,
    sources,
    promptContext: [
      `Base de apoio Drive: ${EDITORIAL_SUPPORT_FOLDER.name} (${EDITORIAL_SUPPORT_FOLDER.url}).`,
      "Use somente fontes configuradas, sem inventar conteúdo de documentos não consultados.",
      "Regras consolidadas:",
      "- preservar intencao unica do artigo e evitar concorrencia interna;",
      "- revisar E-E-A-T/YMYL quando houver saude, estetica, clinicas, pacientes ou decisao sensivel;",
      ...brandConfig.manifesto,
      "- enriquecer LSI/PNL por entidades e exemplos, nao por repeticao de keyword;",
      "- manter copy etica, sem promessas medicas, urgencia falsa ou tom de afiliado;",
      "- conferir links internos esperados, ancoras descritivas e rel=canonical quando houver sobreposicao real.",
      "Fontes selecionadas:",
      ...sourceLines,
    ].join("\n"),
  };
}

type ToolSupportArgs = {
  title?: string | null;
  keyword?: string | null;
  text?: string | null;
  slug?: string | null;
  maxSources?: number;
};

function selectToolSources(
  args: ToolSupportArgs,
  requiredTags: DriveSupportSource["tags"][number][],
  preferredIds: string[],
  maxSources: number,
) {
  const inferred = inferTags({
    ...args,
    plan: findEditorialArticlePlan({
      slug: args.slug,
      keyword: args.keyword,
      title: args.title,
    }),
  });
  requiredTags.forEach((tag) => inferred.add(tag));

  return EDITORIAL_SUPPORT_SOURCES.map((source) => {
    const preferredScore = preferredIds.includes(source.id) ? 12 : 0;
    const coreScore = CORE_SOURCE_IDS.has(source.id) ? 8 : 0;
    const tagScore = source.tags.reduce(
      (score, tag) => score + (inferred.has(tag) ? 3 : 0),
      0,
    );
    return { source, score: preferredScore + coreScore + tagScore };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSources)
    .map((item) => item.source);
}

function buildToolSupportContext(
  args: ToolSupportArgs & {
    toolName: string;
    requiredTags: DriveSupportSource["tags"][number][];
    preferredIds: string[];
    rules: string[];
    maxSources?: number;
  },
) {
  const sources = selectToolSources(
    args,
    args.requiredTags,
    args.preferredIds,
    args.maxSources ?? 7,
  );
  const sourceLines = sources.map(
    (source) => `- ${source.title}: ${source.guidance}`,
  );

  return {
    folder: EDITORIAL_SUPPORT_FOLDER,
    toolName: args.toolName,
    sources,
    supportContext: [
      `Base curada para ${args.toolName}: ${EDITORIAL_SUPPORT_FOLDER.name}.`,
      "Use estes documentos como regras compactas de apoio; nao copie PDF inteiro e nao trate como automacao de publicacao.",
      ...args.rules.map((rule) => `- ${rule}`),
    ].join("\n"),
    promptContext: [
      `Base curada para ${args.toolName}: ${EDITORIAL_SUPPORT_FOLDER.name} (${EDITORIAL_SUPPORT_FOLDER.url}).`,
      "Regras aplicadas:",
      ...args.rules.map((rule) => `- ${rule}`),
      "Fontes selecionadas:",
      ...sourceLines,
    ].join("\n"),
  };
}

export function buildGuardianSupportContext(args: ToolSupportArgs) {
  return buildToolSupportContext({
    ...args,
    toolName: "Guardiao SEO",
    requiredTags: [
      "kgr",
      "silos",
      "blog-strategy",
      "manifesto",
      "bottom-funnel",
      "geo",
      "b2b-strategy",
      "eeat",
      "ymyl",
      "lsi",
      "local-seo",
      "anti-cannibalization",
      "visual",
    ],
    preferredIds: [],
    rules: [
      brandConfig.sourcePolicy,
      ...brandConfig.manifesto,
      "Respeitar intenção única, arquitetura de silos e âncoras naturais.",
    ],
    maxSources: args.maxSources ?? 10,
  });
}

export function buildInternalLinksSupportContext(args: ToolSupportArgs) {
  return buildToolSupportContext({
    ...args,
    toolName: "Links Internos IA",
    requiredTags: [
      "kgr",
      "silos",
      "linking",
      "topical-authority",
      "local-seo",
      "anti-cannibalization",
    ],
    preferredIds: [],
    rules: [
      brandConfig.sourcePolicy,
      ...brandConfig.manifesto,
      "Respeitar intenção única, arquitetura de silos e âncoras naturais.",
    ],
    maxSources: args.maxSources ?? 7,
  });
}

export function buildDuplicationSupportContext(args: ToolSupportArgs) {
  return buildToolSupportContext({
    ...args,
    toolName: "Duplicacao Interna",
    requiredTags: [
      "kgr",
      "silos",
      "anti-cannibalization",
      "linking",
      "topical-authority",
      "local-seo",
    ],
    preferredIds: [],
    rules: [
      brandConfig.sourcePolicy,
      ...brandConfig.manifesto,
      "Respeitar intenção única, arquitetura de silos e âncoras naturais.",
    ],
    maxSources: args.maxSources ?? 7,
  });
}
