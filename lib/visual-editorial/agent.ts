import {
  EDITORIAL_SEO_POLICY,
  buildVisualPlanForArticle,
  type EditorialArticlePlan,
  type ExistingPlanLink,
  type VisualPlanDiagnostics,
  type VisualPlanKind,
  type VisualPlanPriority,
  type VisualPlanSuggestion,
} from "../editorial/content-plan";
import {
  buildDriveSupportPromptContext,
  type DriveSupportSource,
} from "../editorial/drive-support";

export type VisualEditorialImageStatus =
  | "prompt_ready"
  | "generated"
  | "uploaded"
  | "inserted"
  | "approved";

export type VisualEditorialAlertSeverity = "info" | "warning" | "critical";

export type VisualEditorialSupportFolder = {
  name: string;
  url?: string;
};

export type VisualEditorialSupportSource = {
  title: string;
  guidance: string;
  url?: string;
};

export type VisualEditorialNicheProfile = {
  id: string;
  name: string;
  audience: string;
  tone: string[];
  palette: Record<string, string>;
  visualStyles: string[];
  avoid: string[];
  supportFolder?: VisualEditorialSupportFolder;
  supportSources?: VisualEditorialSupportSource[];
};

export type VisualEditorialInput = {
  articlePlan?: EditorialArticlePlan;
  title: string;
  keyword: string;
  text: string;
  html?: string;
  outline?: Array<{ text?: string; level?: number }>;
  links?: ExistingPlanLink[];
  images?: Array<{ url?: string | null; alt?: string | null; kind?: string | null }>;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  ogImageUrl?: string | null;
  profile?: VisualEditorialNicheProfile;
};

export type VisualEditorialSuggestion = Omit<VisualPlanSuggestion, "prompt"> & {
  kind: VisualPlanKind;
  priority: VisualPlanPriority;
  prompt: string;
  chatgptImagesPrompt: string;
  geminiImagePrompt: string;
  customGptPrompt: string;
  promptMode: "multi_generator";
  promptLength: {
    chatgptImages: number;
    geminiImage: number;
  };
  promptWarnings: string[];
  technicalBrief: string;
  suggestedFileName: string;
  approvalCriteria: string[];
  status: VisualEditorialImageStatus;
};

export type VisualEditorialAlert = {
  id: string;
  severity: VisualEditorialAlertSeverity;
  code:
    | "missing_cover"
    | "missing_alt"
    | "missing_og"
    | "dense_section_without_visual"
    | "visual_placeholder"
    | "decorative_image"
    | "medical_visual_promise"
    | "too_many_images"
    | "generic_prompt";
  message: string;
  action: string;
};

export type VisualEditorialDiagnostics = VisualPlanDiagnostics & {
  internalLinkCount: number;
  supportSourceCount: number;
  suggestedImageCount: number;
};

export type VisualEditorialResult = {
  agent: {
    id: "visual-editorial-agent";
    name: "Agente Visual Editorial";
    version: "1.0";
    mode: "prompt_review_manual";
  };
  profile: VisualEditorialNicheProfile;
  workflow: Array<{
    status: VisualEditorialImageStatus;
    label: string;
  }>;
  suggestions: VisualEditorialSuggestion[];
  diagnostics: VisualEditorialDiagnostics;
  alerts: VisualEditorialAlert[];
};

export const DEFAULT_VISUAL_EDITORIAL_PROFILE: VisualEditorialNicheProfile = {
  id: "generic-blog",
  name: "Blog SEO generico",
  audience: "leitores que precisam entender um tema rapidamente antes de tomar uma decisao",
  tone: ["claro", "util", "editorial", "sem promessa exagerada"],
  palette: {
    primary: "#2563eb",
    accent: "#10b981",
    dark: "#111827",
  },
  visualStyles: [
    "infografico tecnico",
    "fluxo simples",
    "checklist visual",
    "comparativo diagramado",
  ],
  avoid: ["banco de imagem generico", "imagem decorativa sem funcao", "texto pequeno demais"],
};

export const BRAND_VISUAL_EDITORIAL_PROFILE: VisualEditorialNicheProfile = {...DEFAULT_VISUAL_EDITORIAL_PROFILE, name: "Perfil editorial do projeto", audience: "Leitores do projeto", tone: EDITORIAL_SEO_POLICY.tone, palette: EDITORIAL_SEO_POLICY.visualPalette, visualStyles: EDITORIAL_SEO_POLICY.visualStyle, avoid: EDITORIAL_SEO_POLICY.visualAvoid};

const WORKFLOW: VisualEditorialResult["workflow"] = [
  { status: "prompt_ready", label: "Prompt revisado e pronto para chatgpt.com/images" },
  { status: "generated", label: "Imagem criada fora do admin" },
  { status: "uploaded", label: "Imagem enviada pela biblioteca atual" },
  { status: "inserted", label: "Imagem inserida no ponto indicado do artigo" },
  { status: "approved", label: "Alt, legenda e funcao editorial aprovados" },
];

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalize(value).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function kindFileSuffix(suggestion: VisualPlanSuggestion) {
  if (suggestion.kind === "hero") return "capa";
  if (suggestion.kind === "og") return "og";
  if (suggestion.visualRole === "table_visual") return "tabela-visual";
  if (suggestion.visualType.includes("checklist")) return "corpo-checklist";
  if (suggestion.visualType.includes("fluxo")) return "corpo-fluxo";
  return "respiro-visual";
}

function buildSuggestedFileName(args: VisualEditorialInput, suggestion: VisualPlanSuggestion) {
  const base = slugify(args.articlePlan?.slug || args.keyword || args.title || "artigo");
  return `${base}-${kindFileSuffix(suggestion)}.webp`;
}

function buildApprovalCriteria(
  args: VisualEditorialInput,
  profile: VisualEditorialNicheProfile,
  suggestion: VisualPlanSuggestion
) {
  const criteria = [
    `Usa a paleta do perfil (${Object.values(profile.palette).join(", ")}) sem virar decoracao.`,
    "Explica o argumento do trecho sem depender de texto pequeno ou ilegivel.",
    "Nao promete resultado medico, financeiro ou comercial garantido.",
    "Nao usa foto generica, paciente identificavel, antes/depois clinico ou cena manipulativa.",
    "Mantem a intencao unica do artigo e nao cria concorrencia com outro artigo do silo.",
  ];

  if (suggestion.kind === "hero") {
    criteria.push("Funciona como capa 16:9 em 1200x675 e tambem como miniatura crop-safe.");
  }
  if (suggestion.kind === "og") {
    criteria.push("Funciona em preview social, com contraste alto e composicao legivel em tamanho pequeno.");
  }
  if (suggestion.visualRole === "table_visual") {
    criteria.push("Complementa a tabela HTML sem substituir a leitura acessivel e indexavel.");
    criteria.push("Usa poucos textos grandes; nao copia a tabela inteira em letras pequenas.");
  } else if (suggestion.kind === "body") {
    criteria.push(`Reforca diretamente a secao "${suggestion.sectionHeading || suggestion.placement}".`);
  }
  if (args.links?.some((link) => link.type === "internal")) {
    criteria.push("Apoia a leitura do silo sem substituir os links internos esperados.");
  }

  return criteria;
}

function sourceSummary(profile: VisualEditorialNicheProfile) {
  if (!profile.supportFolder && !profile.supportSources?.length) {
    return "Sem base externa obrigatoria; use apenas as regras editoriais do perfil.";
  }

  const folder = profile.supportFolder
    ? `Base curada resumida: ${profile.supportFolder.name}. Use como referencia editorial compacta; o prompt principal deve ser autossuficiente.`
    : "Base de apoio editorial do perfil.";
  const sources = (profile.supportSources ?? [])
    .slice(0, 4)
    .map((source) => `- ${source.title}: ${source.guidance}`)
    .join("\n");

  return [folder, sources ? `Fontes prioritarias:\n${sources}` : ""].filter(Boolean).join("\n");
}

function articleContext(args: VisualEditorialInput) {
  const plan = args.articlePlan;
  const internalLinkCount = (args.links ?? []).filter((link) => link.type === "internal").length;

  return [
    `Titulo: ${args.title || plan?.title || "artigo sem titulo"}.`,
    `Keyword/intencao: ${args.keyword || plan?.primaryKeyword || "nao informada"}.`,
    plan ? `Silo: ${plan.siloName}; papel: ${plan.role}; intencao unica: ${plan.uniqueIntent}.` : "Silo: nao identificado.",
    `Links internos detectados: ${internalLinkCount}.`,
  ].join("\n");
}

function cleanImageTheme(args: VisualEditorialInput, suggestion: VisualPlanSuggestion) {
  if (suggestion.visualRole === "cover_thumbnail") {
    return [suggestion.coverVariable || suggestion.visualTheme, suggestion.coverDifferentiator]
      .filter(Boolean)
      .join(" - ");
  }
  if (suggestion.visualRole === "body_context") {
    return suggestion.visualTheme || suggestion.sectionHeading || "ideia local do trecho";
  }
  if (suggestion.visualRole === "table_visual") {
    return suggestion.visualTheme || "comparativo visual da tabela";
  }
  return suggestion.visualTheme || args.keyword || args.articlePlan?.primaryKeyword || args.title || "artigo do blog";
}

function cleanRoleLabel(suggestion: VisualPlanSuggestion) {
  if (suggestion.visualRole === "cover_thumbnail") return "capa/thumbnail editorial";
  if (suggestion.visualRole === "body_context") return "imagem de respiro contextual";
  if (suggestion.visualRole === "table_visual") return "tabela visual comparativa";
  if (suggestion.visualRole === "og") return "imagem social/OG";
  return "imagem editorial";
}

function cleanStyleLabel(profile: VisualEditorialNicheProfile, suggestion: VisualPlanSuggestion) {
  if (suggestion.visualRole === "cover_thumbnail") {
    return "edicao fotorealista sobre foto-base de banco, realidade aumentada editorial, UI abstrata sutil";
  }
  if (suggestion.visualRole === "body_context") {
    return "ilustracao editorial limpa, diagrama simples, interface abstrata minimalista, poucos elementos";
  }
  if (suggestion.visualRole === "table_visual") {
    return "comparativo editorial 5:4, tabela visual simplificada, hierarquia clara";
  }
  return profile.visualStyles.join(", ");
}

function geminiStyleLabel(suggestion: VisualPlanSuggestion) {
  if (suggestion.visualRole === "cover_thumbnail") {
    return "edicao fotorealista sobre foto-base, 3D editorial limpo, realidade aumentada, glassmorphism sutil, UI abstrata, degrade controlado, profundidade suave, sombras macias, acabamento premium";
  }
  if (suggestion.visualRole === "table_visual") {
    return "3D editorial comparativo, glassmorphism sutil, colunas limpas, degrade controlado, materiais translucidos, hierarquia clara";
  }
  return "3D editorial limpo, glassmorphism sutil, degrade controlado, profundidade suave, materiais translucidos, sombras macias, acabamento premium";
}

function limitWords(value: string | null | undefined, maxWords: number) {
  const words = String(value ?? "").replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

function completeSentence(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function promptLine(label: string, value: string | null | undefined) {
  const content = String(value ?? "").replace(/\s+/g, " ").trim();
  return content ? `${label}: ${completeSentence(content)}` : "";
}

function promptTextRule(mode: "gpt" | "gemini", suggestion?: VisualPlanSuggestion) {
  if (suggestion?.visualRole === "table_visual") {
    return "Texto na imagem: tabela visual pode usar texto em portugues do Brasil. Preserve todos os cabecalhos/criterios principais e resuma celulas sem omitir colunas; use palavras grandes, alinhadas e legiveis, sem microtexto e sem ingles.";
  }
  if (mode === "gemini") {
    return "Texto na imagem: preferir sem texto. Se for indispensavel, usar no maximo 1-2 palavras grandes em portugues do Brasil; nunca escrever ingles ou termos como Marketing Guide, Search, Guide, Results, Buy now, Lead, Ranking ou Growth. Troque qualquer texto duvidoso por icones, linhas simuladas ou palavras PT-BR como BUSCA, CONTEUDO, MAPA, REPUTACAO, AGENDA, SEO ou COSMETICOS.";
  }
  return "Texto na imagem: preferir sem texto; se for indispensavel, usar no maximo 1-2 palavras grandes, legiveis e em portugues do Brasil.";
}

function formatLineForMode(suggestion: VisualPlanSuggestion, mode: "gpt" | "gemini") {
  if (mode === "gemini") return "";
  return promptLine("Formato", suggestion.aspectRatio);
}

function googleInspiredLine(suggestion: VisualPlanSuggestion) {
  const items = suggestion.googleInspiredVisualSystem?.slice(0, 5).join(", ");
  return items
    ? promptLine(
        "Visual Google inspirado",
        `${items}; usar linguagem visual de busca atualizada sem copiar UI real. Preferir sem logotipo oficial; se for indispensavel pelo contexto editorial de SEO, usar apenas referencia textual neutra a Google, pequena e sem sugerir parceria, certificacao ou endosso`
      )
    : promptLine(
        "Visual Google inspirado",
        "caixa de busca inteligente, cards AR translucidos, pin/mapa abstrato e resposta AI em camada espacial; preferir sem logotipo oficial, sem copiar UI real e sem sugerir parceria"
      );
}

function arDirectionLine(suggestion: VisualPlanSuggestion) {
  return promptLine(
    "Realidade aumentada editorial",
    suggestion.augmentedRealityDirection ||
      "usar paineis flutuantes translucidos, rigidos e alinhados no espaco, com profundidade suave e interacao clara com o assunto"
  );
}

function stockPhotoEditLine(suggestion: VisualPlanSuggestion) {
  if (suggestion.coverSourceMode !== "stock_image_edit") return "";
  return promptLine(
    "Foto-base",
    suggestion.stockPhotoEditInstruction ||
      "use a foto-base fornecida de banco de imagem como pessoa principal; preserve rosto, pose, roupa, iluminacao, proporcoes, pele, cabelo, fundo e aparencia original; nao redesenhe a pessoa e nao invente outro modelo"
  );
}

function generatorDiscipline(mode: "gpt" | "gemini") {
  if (mode !== "gemini") return "";
  return "Elementos graficos: rigidos, firmes, alinhados, geometricos e claros; sem borracha, liquido, massinha, blobs organicos, formas derretidas, linhas tortas, elementos moles ou aparencia desenhada sem precisao. Composicao: nada de paineis aleatorios; todos os overlays precisam ter eixo visual, perspectiva e funcao clara.";
}

function commonRestrictions(suggestion: VisualPlanSuggestion) {
  if (suggestion.coverSourceMode === "stock_image_edit") {
    return "Restricoes: nao alterar a pessoa da foto-base, nao inventar outra pessoa, nao fechar olhos abertos, nao mudar olhar/expressao, sem sorriso artificial, sem paciente real, sem antes/depois clinico, sem promessa medica, financeira, ranking, agenda cheia ou captacao garantida; sem UI real copiada, texto pequeno, UI poluida ou elementos decorativos sem funcao. Nao usar logo oficial como selo, botao, certificacao ou parceria.";
  }
  return "Restricoes: sem paciente real, sem antes/depois clinico, sem promessa medica, financeira, ranking, agenda cheia ou captacao garantida; sem texto pequeno, UI real copiada, UI poluida ou elementos decorativos sem funcao. Nao usar logo oficial como selo, botao, certificacao ou parceria.";
}

function avoidText(profile: VisualEditorialNicheProfile, suggestion: VisualPlanSuggestion) {
  const items = profile.avoid.map((item) =>
    suggestion.coverSourceMode === "stock_image_edit" && normalize(item).includes("banco de imagem")
      ? "trocar a foto-base por outra imagem generica"
      : item
  );
  return items.join(", ");
}

function compositionHierarchyLine(suggestion: VisualPlanSuggestion) {
  if (suggestion.coverSourceMode === "stock_image_edit") {
    return promptLine(
      "Organizacao visual",
      "preservar a foto-base como camada principal; adicionar 1 painel AR principal maior e ate 2 secundarios menores apenas onde houver espaco livre; alinhar os paineis ao olhar, mao, tela, espelho, produto ou mesa sem forcar interacao; nao cobrir rosto, olhos, boca, pele, cabelo, produto principal ou gesto importante; manter margem limpa e leitura imediata"
    );
  }
  if (suggestion.visualRole === "table_visual") {
    return promptLine(
      "Organizacao visual",
      "hierarquia de comparativo com titulo visual curto opcional, cabecalhos preservados, colunas alinhadas e linhas resumidas; nao perder coluna/criterio importante, nao embaralhar dados, nao criar texto miudo"
    );
  }
  return promptLine(
    "Organizacao visual",
    "um unico foco principal, ate 2 apoios alinhados, 30-40% de respiro, sem cards soltos; cada painel AR deve apontar para a ideia do trecho e nao para decoracao; nao mostrar o artigo inteiro nem todos os canais do marketing"
  );
}

function bodyScopeLine(suggestion: VisualPlanSuggestion) {
  if (suggestion.visualRole !== "body_context") return "";
  const scope = [
    suggestion.visualTheme,
    suggestion.localVisualBrief,
    suggestion.strongSentence,
    suggestion.bodyArtDirection?.focalObject,
    suggestion.bodyArtDirection?.visualAction,
  ]
    .filter(Boolean)
    .join(" ");
  const allowsFunnel = /funil|filtro|filtrar|separar|orcamento|cac|custo/i.test(scope);
  return promptLine(
    "Escopo do respiro",
    allowsFunnel
      ? "represente somente este filtro/decisao do trecho; nao incluir busca local, reputacao, agenda, conteudo e contato juntos se nao forem o assunto central"
      : "representar somente a ideia local do trecho; proibido usar funil, pipeline, mapa completo de canais, ecossistema de marketing ou resumo do artigo inteiro"
  );
}

function buildCoverPromptCore(suggestion: VisualPlanSuggestion, mode: "gpt" | "gemini") {
  const art = suggestion.coverArtDirection;
  return [
    formatLineForMode(suggestion, mode),
    promptLine("Tema visual", cleanImageTheme({ title: "", keyword: "", text: "" }, suggestion)),
    promptLine("Tipo", cleanRoleLabel(suggestion)),
    promptLine("Estilo", mode === "gemini" ? geminiStyleLabel(suggestion) : cleanStyleLabel(DEFAULT_VISUAL_EDITORIAL_PROFILE, suggestion)),
    stockPhotoEditLine(suggestion),
    promptLine("Cena", `${suggestion.coverVariable || suggestion.visualTheme || "tema do artigo"} com ${suggestion.coverDifferentiator || "diferencial visual claro"}`),
    googleInspiredLine(suggestion),
    arDirectionLine(suggestion),
    compositionHierarchyLine(suggestion),
    art ? promptLine("Composicao", `${art.compositionVariant}; ${art.framing}`) : "",
    art ? promptLine("Camera e pessoa/foto-base", `${art.cameraAngle}; ${art.modelPose}`) : "",
    art ? promptLine("Acao e objeto", `${art.modelAction}; objeto principal: ${art.heroProp}`) : "",
    art ? promptLine("Fundo", `${art.backgroundMotif}; fundo hibrido claro/escuro com bordas Midnight, centro levemente claro, 40-50% de peso escuro e acentos Emerald/Cobalt`) : "",
    promptLine("Preservacao da pessoa", "preserve olhos, olhar e expressao da foto-base; se os olhos estiverem abertos, mantenha abertos; se a pessoa estiver apenas pensando ou olhando, nao force gesto nem interacao"),
    promptTextRule(mode, suggestion),
    generatorDiscipline(mode),
    art ? promptLine("Nao repetir", art.doNotRepeat.slice(0, 4).join(", ")) : "",
    commonRestrictions(suggestion),
  ].filter(Boolean).join("\n");
}

function buildBodyPromptCore(suggestion: VisualPlanSuggestion, mode: "gpt" | "gemini") {
  const art = suggestion.bodyArtDirection;
  const terms = suggestion.specificTerms?.slice(0, 4).join(", ");
  return [
    formatLineForMode(suggestion, mode),
    promptLine("Tema especifico", suggestion.visualTheme || suggestion.sectionHeading),
    promptLine("Tipo", cleanRoleLabel(suggestion)),
    promptLine("Estilo", mode === "gemini" ? geminiStyleLabel(suggestion) : "ilustracao editorial limpa, diagrama simples, interface abstrata minimalista, poucos elementos"),
    promptLine("Trecho a representar", limitWords(suggestion.strongSentence || suggestion.sourceTextUsed || suggestion.localVisualBrief, 28)),
    terms ? promptLine("Sinais concretos", terms) : "",
    googleInspiredLine(suggestion),
    arDirectionLine(suggestion),
    promptLine("Cena", suggestion.localVisualBrief),
    bodyScopeLine(suggestion),
    art ? promptLine("Metafora e acao", `${art.focalObject}; ${art.visualAction}`) : "",
    art ? promptLine("Composicao", `${art.layoutPattern}; ${art.markerVariant}; um foco principal, ate 2 elementos de apoio e 30-40% de area livre`) : "",
    compositionHierarchyLine(suggestion),
    art?.supportObjects?.length ? promptLine("Elementos de apoio", art.supportObjects.slice(0, 2).join(", ")) : "",
    promptLine("Fundo", "hibrido limpo, centro levemente claro, bordas e sombras Midnight, contraste medio-alto, 40-50% de peso escuro, acentos Emerald/Cobalt"),
    promptTextRule(mode, suggestion),
    generatorDiscipline(mode),
    art ? promptLine("Nao repetir", art.doNotRepeat.slice(0, 4).join(", ")) : "",
    commonRestrictions(suggestion),
  ].filter(Boolean).join("\n");
}

function buildTablePromptCore(suggestion: VisualPlanSuggestion, mode: "gpt" | "gemini") {
  return [
    formatLineForMode(suggestion, mode),
    promptLine("Tema visual", suggestion.visualTheme || "comparativo visual da tabela"),
    promptLine("Tipo", cleanRoleLabel(suggestion)),
    promptLine("Estilo", mode === "gemini" ? geminiStyleLabel(suggestion) : cleanStyleLabel(DEFAULT_VISUAL_EDITORIAL_PROFILE, suggestion)),
    promptLine("Comparativo", limitWords(suggestion.sourceTextUsed || suggestion.localVisualBrief || suggestion.contextAfter, 58)),
    googleInspiredLine(suggestion),
    arDirectionLine(suggestion),
    promptLine("Composicao", "visual comparativo editorial com colunas ou cards claros, hierarquia forte, cabecalhos preservados, linhas resumidas e texto grande o suficiente para leitura"),
    compositionHierarchyLine(suggestion),
    promptLine("Fundo", "hibrido limpo, centro levemente claro, bordas Midnight, 40-50% de peso escuro e acentos Emerald/Cobalt"),
    promptTextRule(mode, suggestion),
    generatorDiscipline(mode),
    commonRestrictions(suggestion),
  ].filter(Boolean).join("\n");
}

function ensureCompletePrompt(value: string) {
  const lines = value
    .split("\n")
    .map((line) => completeSentence(line))
    .filter(Boolean);
  return lines.join("\n");
}

function promptWarningsFor(prompt: string, recommendedLimit: number) {
  const warnings: string[] = [];
  if (prompt.length > recommendedLimit) {
    warnings.push(`Prompt com ${prompt.length} caracteres; revisar se o gerador usado tiver limite curto.`);
  }
  if (!/[.!?]$/.test(prompt.trim())) {
    warnings.push("Prompt nao termina com frase completa.");
  }
  return warnings;
}

function cleanDirectImagePrompt(
  args: VisualEditorialInput,
  profile: VisualEditorialNicheProfile,
  suggestion: VisualPlanSuggestion,
  mode: "gpt" | "gemini"
) {
  const palette = Object.entries(profile.palette)
    .map(([name, value]) => `${name} ${value}`)
    .join(", ");
  const core =
    suggestion.visualRole === "cover_thumbnail"
      ? buildCoverPromptCore(suggestion, mode)
      : suggestion.visualRole === "table_visual"
        ? buildTablePromptCore(suggestion, mode)
        : buildBodyPromptCore(suggestion, mode);

  return ensureCompletePrompt(
    [
      core,
      promptLine("Paleta", `${palette}; Emerald/Cobalt/Midnight com degrade controlado e sem textura poluida`),
      promptLine("Evitar", avoidText(profile, suggestion)),
    ].filter(Boolean).join("\n")
  );
}

function buildChatGptImagesPrompt(
  args: VisualEditorialInput,
  profile: VisualEditorialNicheProfile,
  suggestion: VisualPlanSuggestion,
  _approvalCriteria: string[]
) {
  return cleanDirectImagePrompt(args, profile, suggestion, "gpt");
}

function buildCustomGptPrompt(
  args: VisualEditorialInput,
  profile: VisualEditorialNicheProfile,
  suggestion: VisualPlanSuggestion,
  _approvalCriteria: string[]
) {
  return cleanDirectImagePrompt(args, profile, suggestion, "gpt");
}

function buildGeminiImagePrompt(
  args: VisualEditorialInput,
  profile: VisualEditorialNicheProfile,
  suggestion: VisualPlanSuggestion,
  _approvalCriteria: string[]
) {
  return cleanDirectImagePrompt(args, profile, suggestion, "gemini");
}

function buildTechnicalBrief(
  args: VisualEditorialInput,
  profile: VisualEditorialNicheProfile,
  suggestion: VisualPlanSuggestion,
  approvalCriteria: string[]
) {
  return [
    "Brief tecnico opcional do Agente Visual Editorial.",
    articleContext(args),
    `Posicao no artigo: ${suggestion.placement}.`,
    suggestion.sectionHeading ? `H2/H3 relacionado: ${suggestion.sectionHeading}.` : "",
    suggestion.markerSection ? `Secao detectada para a imagem: ${suggestion.markerSection}.` : "",
    suggestion.visualTheme ? `Tema visual usado no prompt: ${suggestion.visualTheme}.` : "",
    suggestion.strongSentence ? `Frase forte usada: ${suggestion.strongSentence}.` : "",
    suggestion.specificTerms?.length ? `Termos especificos usados: ${suggestion.specificTerms.join(", ")}.` : "",
    suggestion.localVisualBrief ? `Brief visual local: ${suggestion.localVisualBrief}.` : "",
    suggestion.sourceTextUsed ? `Trecho fonte usado: ${suggestion.sourceTextUsed}.` : "",
    suggestion.dedupeReason ? `Duplicidade visual: ${suggestion.dedupeReason}.` : "",
    suggestion.coverSourceMode ? `Modo de capa: ${suggestion.coverSourceMode}.` : "",
    suggestion.stockPhotoEditInstruction ? `Instrucao de foto-base: ${suggestion.stockPhotoEditInstruction}.` : "",
    suggestion.googleInspiredVisualSystem?.length
      ? `Sistema visual Google inspirado: ${suggestion.googleInspiredVisualSystem.join(", ")}.`
      : "",
    suggestion.augmentedRealityDirection ? `Direcao de realidade aumentada: ${suggestion.augmentedRealityDirection}.` : "",
    suggestion.coverDifferentiator ? `Diferenciador de capa: ${suggestion.coverDifferentiator}.` : "",
    suggestion.coverArtDirection
      ? `Direcao de arte da capa: ${suggestion.coverArtDirection.compositionVariant}; camera ${suggestion.coverArtDirection.cameraAngle}; pose ${suggestion.coverArtDirection.modelPose}; acao ${suggestion.coverArtDirection.modelAction}; objeto ${suggestion.coverArtDirection.heroProp}; nao repetir ${suggestion.coverArtDirection.doNotRepeat.join(", ")}.`
      : "",
    suggestion.bodyArtDirection
      ? `Direcao de arte do respiro: ${suggestion.bodyArtDirection.layoutPattern}; foco ${suggestion.bodyArtDirection.focalObject}; acao ${suggestion.bodyArtDirection.visualAction}; apoio ${suggestion.bodyArtDirection.supportObjects.join(", ")}; nao repetir ${suggestion.bodyArtDirection.doNotRepeat.join(", ")}.`
      : "",
    `Tipo visual: ${suggestion.visualType}.`,
    `Formato/aspect ratio: ${suggestion.aspectRatio}.`,
    `Objetivo editorial: ${suggestion.objective}.`,
    sourceSummary(profile),
    "Prompt base:",
    suggestion.prompt,
    "Criterios de aprovacao:",
    ...approvalCriteria.map((item) => `- ${item}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function isGenericAlt(value: string | null | undefined) {
  const normalized = normalize(value);
  return !normalized || /^(imagem|foto|banner|capa|ilustracao|decorativa|image|photo)$/.test(normalized);
}

function hasMedicalVisualPromise(value: string | null | undefined) {
  return /\b(antes e depois|resultado garantido|rejuvenescimento garantido|transformacao garantida)\b/.test(
    normalize(value)
  );
}

function buildAlerts(
  args: VisualEditorialInput,
  diagnostics: VisualPlanDiagnostics,
  suggestions: VisualEditorialSuggestion[]
): VisualEditorialAlert[] {
  const alerts: VisualEditorialAlert[] = [];
  const bodyLimit = Math.max(4, Math.ceil(diagnostics.wordCount / 450) + 1);
  const genericImages = (args.images ?? []).filter((image) => image?.url && isGenericAlt(image.alt));
  const medicalPromiseImages = (args.images ?? []).filter((image) => image?.url && hasMedicalVisualPromise(image.alt));

  if (diagnostics.missingHero) {
    alerts.push({
      id: "missing-cover",
      severity: "critical",
      code: "missing_cover",
      message: "Capa obrigatoria ausente.",
      action: "Gerar a capa antes de mover o artigo para revisao final ou publicacao.",
    });
  }
  if (diagnostics.missingHeroAlt) {
    alerts.push({
      id: "missing-cover-alt",
      severity: "warning",
      code: "missing_alt",
      message: "A capa existe, mas nao tem alt text.",
      action: "Adicionar alt text descritivo e especifico ao tema do artigo.",
    });
  }
  if (diagnostics.ogStatus === "missing") {
    alerts.push({
      id: "missing-og",
      severity: "warning",
      code: "missing_og",
      message: "Imagem OG ausente e sem capa para herdar.",
      action: "Criar imagem OG ou definir uma capa que possa ser herdada no preview social.",
    });
  }
  if (diagnostics.longArticleNeedsBodyImage) {
    alerts.push({
      id: "dense-without-visual",
      severity: "warning",
      code: "dense_section_without_visual",
      message: "Artigo longo sem imagem util no corpo.",
      action: "Inserir pelo menos uma imagem contextual depois de uma secao densa.",
    });
  }
  if (diagnostics.hasVisualPlaceholder) {
    alerts.push({
      id: "visual-placeholder",
      severity: "warning",
      code: "visual_placeholder",
      message: "Existe marcador de plano visual no texto.",
      action: "Substituir o marcador pela imagem real antes da aprovacao.",
    });
  }
  if (genericImages.length > 0) {
    alerts.push({
      id: "decorative-image",
      severity: "warning",
      code: "decorative_image",
      message: `${genericImages.length} imagem(ns) parecem decorativas ou sem alt especifico.`,
      action: "Trocar por visual com funcao editorial ou revisar alt/legenda.",
    });
  }
  if (medicalPromiseImages.length > 0) {
    alerts.push({
      id: "medical-visual-promise",
      severity: "critical",
      code: "medical_visual_promise",
      message: "Ha imagem ou alt com promessa visual sensivel.",
      action: "Remover promessa medica/resultado garantido e usar representacao abstrata ou educacional.",
    });
  }
  if (diagnostics.bodyImageCount > bodyLimit) {
    alerts.push({
      id: "too-many-images",
      severity: "info",
      code: "too_many_images",
      message: "O artigo pode ter imagens demais para o tamanho do texto.",
      action: "Manter apenas imagens que expliquem uma decisao, fluxo, checklist ou comparacao.",
    });
  }
  if (suggestions.some((suggestion) => !normalize(suggestion.prompt).includes(normalize(args.keyword || args.title).split(" ")[0] ?? ""))) {
    alerts.push({
      id: "generic-prompt",
      severity: "info",
      code: "generic_prompt",
      message: "Revise prompts muito genericos antes de gerar imagem.",
      action: "Inclua keyword, silo, secao e objetivo editorial no prompt final.",
    });
  }

  return alerts;
}

export function buildVisualEditorialAgentResult(args: VisualEditorialInput): VisualEditorialResult {
  const profile = args.profile ?? DEFAULT_VISUAL_EDITORIAL_PROFILE;
  const visualPlan = buildVisualPlanForArticle({
    articlePlan: args.articlePlan,
    title: args.title,
    keyword: args.keyword,
    text: args.text,
    html: args.html,
    outline: args.outline,
    images: args.images,
    heroImageUrl: args.heroImageUrl,
    heroImageAlt: args.heroImageAlt,
    ogImageUrl: args.ogImageUrl,
  });

  const suggestions = visualPlan.suggestions.map((suggestion) => {
    const approvalCriteria = buildApprovalCriteria(args, profile, suggestion);
    const prompt = buildChatGptImagesPrompt(args, profile, suggestion, approvalCriteria);
    const customGptPrompt = buildCustomGptPrompt(args, profile, suggestion, approvalCriteria);
    const geminiImagePrompt = buildGeminiImagePrompt(args, profile, suggestion, approvalCriteria);
    const promptWarnings = [
      ...promptWarningsFor(prompt, 1800),
      ...promptWarningsFor(geminiImagePrompt, 2200).map((warning) => `Gemini/Nano Banana: ${warning}`),
    ];
    const technicalBrief = buildTechnicalBrief(args, profile, suggestion, approvalCriteria);

    return {
      ...suggestion,
      prompt,
      chatgptImagesPrompt: prompt,
      geminiImagePrompt,
      customGptPrompt,
      promptMode: "multi_generator" as const,
      promptLength: {
        chatgptImages: prompt.length,
        geminiImage: geminiImagePrompt.length,
      },
      promptWarnings,
      technicalBrief,
      suggestedFileName: buildSuggestedFileName(args, suggestion),
      approvalCriteria,
      status: "prompt_ready" as const,
    };
  });

  return {
    agent: {
      id: "visual-editorial-agent",
      name: "Agente Visual Editorial",
      version: "1.0",
      mode: "prompt_review_manual",
    },
    profile,
    workflow: WORKFLOW,
    suggestions,
    diagnostics: {
      ...visualPlan.diagnostics,
      internalLinkCount: (args.links ?? []).filter((link) => link.type === "internal").length,
      supportSourceCount: profile.supportSources?.length ?? 0,
      suggestedImageCount: suggestions.length,
    },
    alerts: buildAlerts(args, visualPlan.diagnostics, suggestions),
  };
}

function toSupportSource(source: DriveSupportSource): VisualEditorialSupportSource {
  return {
    title: source.title,
    guidance: source.guidance,
    url: source.url,
  };
}

export function buildBrandVisualEditorialAgentResult(args: Omit<VisualEditorialInput, "profile">) {
  const driveSupport = buildDriveSupportPromptContext({
    slug: args.articlePlan?.slug,
    title: args.title,
    keyword: args.keyword,
    text: args.text,
    maxSources: 6,
  });

  return buildVisualEditorialAgentResult({
    ...args,
    profile: {
      ...BRAND_VISUAL_EDITORIAL_PROFILE,
      supportFolder: {
        name: driveSupport.folder.name,
        url: driveSupport.folder.url,
      },
      supportSources: driveSupport.sources.map(toSupportSource),
    },
  });
}
