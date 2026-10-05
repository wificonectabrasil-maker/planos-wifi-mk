export type SiloGroupKey = string;

export type SiloGroupDefinition = {
  key: SiloGroupKey;
  label: string;
  keywords: string[];
  menu_order?: number;
};

const DEFAULT_SILO_GROUP_DEFINITIONS: readonly SiloGroupDefinition[] = [
  {
    key: "preco_oportunidade",
    label: "Preço / oportunidade",
    keywords: ["preco", "barato", "economico", "oferta", "promocao", "custo", "beneficio", "desconto"],
    menu_order: 10,
  },
  {
    key: "decisao_escolha",
    label: "Decisão / escolha",
    keywords: ["melhor", "escolher", "guia", "comparativo", "qual", "vale a pena", "como escolher"],
    menu_order: 20,
  },
  {
    key: "tipos",
    label: "Tipos",
    keywords: ["tipos", "modelo", "textura", "serum", "creme", "gel", "espuma"],
    menu_order: 30,
  },
  {
    key: "uso_como_fazer",
    label: "Uso / como fazer",
    keywords: ["como usar", "passo a passo", "rotina", "ordem", "frequencia", "aplicacao"],
    menu_order: 40,
  },
  {
    key: "marcas_produtos",
    label: "Marcas / produtos",
    keywords: ["marca", "produto", "linha", "review", "resenha", "comparativo de marcas"],
    menu_order: 50,
  },
  {
    key: "resultados_tempo",
    label: "Resultados / tempo",
    keywords: ["resultado", "tempo", "quando comeca", "prazo", "evolucao", "antes e depois"],
    menu_order: 60,
  },
] as const;

export const SILO_GROUP_DEFINITIONS: readonly SiloGroupDefinition[] = DEFAULT_SILO_GROUP_DEFINITIONS;
export const SILO_GROUP_VALUES = SILO_GROUP_DEFINITIONS.map((item) => item.key);

export function getDefaultSiloGroupDefinitions(): SiloGroupDefinition[] {
  return DEFAULT_SILO_GROUP_DEFINITIONS.map((item) => ({ ...item, keywords: [...item.keywords] }));
}

export function normalizeSiloGroup(value: unknown): SiloGroupKey | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isSiloGroupKey(value: unknown): value is SiloGroupKey {
  return normalizeSiloGroup(value) !== null;
}

export function normalizeSiloGroupLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSiloGroupKey(value: unknown): SiloGroupKey | null {
  const label = normalizeSiloGroupLabel(value);
  if (!label) return null;

  const normalized = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);

  return normalized.length > 0 ? normalized : null;
}

export function humanizeSiloGroupKey(value: unknown): string {
  const key = normalizeSiloGroup(value);
  if (!key) return "Sem grupo";
  const text = key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Sem grupo";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getSiloGroupLabel(group: unknown, groups: readonly SiloGroupDefinition[] = SILO_GROUP_DEFINITIONS): string {
  const key = normalizeSiloGroup(group);
  if (!key) return "Sem grupo";
  return groups.find((item) => item.key === key)?.label ?? humanizeSiloGroupKey(key);
}

function normalizeKeyword(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function extractTokens(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/gi)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export function buildSiloGroupKeywords(group: Pick<SiloGroupDefinition, "key" | "label" | "keywords">): string[] {
  const explicit = Array.isArray(group.keywords) ? group.keywords.map(normalizeKeyword).filter(Boolean) : [];
  const keyTokens = extractTokens(normalizeKeyword(group.key));
  const labelTokens = extractTokens(normalizeKeyword(group.label));
  return Array.from(new Set([...explicit, ...keyTokens, ...labelTokens]));
}

export function getSiloGroupKeywords(group: unknown, groups: readonly SiloGroupDefinition[] = SILO_GROUP_DEFINITIONS): string[] {
  const key = normalizeSiloGroup(group);
  if (!key) return [];
  const found = groups.find((item) => item.key === key);
  if (!found) return extractTokens(normalizeKeyword(key));
  return buildSiloGroupKeywords(found);
}
