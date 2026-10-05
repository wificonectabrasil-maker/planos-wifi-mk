export type SiloIntent = "Informacional" | "Investigacao";
export type SiloContentType = "Artigo Informativo";

export type SiloConfig = {
  slug: string;
  title: string;
  description: string;
  targetKeyword: string;
  intent: SiloIntent;
  contentType: SiloContentType;
  legacySlugs: string[];
};

export const SILOS: SiloConfig[] = [];

const SILO_REDIRECTS = new Map(
  SILOS.flatMap((silo) => silo.legacySlugs.map((legacySlug) => [legacySlug, silo.slug] as const))
);

export const EDITORIAL_GROUPS = [
  "Preco / oportunidade",
  "Decisao / escolha",
  "Tipos",
  "Uso / como fazer",
  "Marcas / produtos",
  "Resultados / tempo",
] as const;

export function getCanonicalSiloSlug(slug: string): string {
  return SILO_REDIRECTS.get(slug) ?? slug;
}

export function getLegacySiloRedirect(slug: string): string | null {
  return SILO_REDIRECTS.get(slug) ?? null;
}

export function getSiloQueryCandidates(slug: string): string[] {
  const canonicalSlug = getCanonicalSiloSlug(slug);
  const silo = SILOS.find((item) => item.slug === canonicalSlug);
  return Array.from(new Set([slug, canonicalSlug, ...(silo?.legacySlugs ?? [])].filter(Boolean)));
}

export function getSilo(slug: string): SiloConfig | undefined {
  const canonicalSlug = getCanonicalSiloSlug(slug);
  return SILOS.find((silo) => silo.slug === canonicalSlug);
}

export function getSiloOrThrow(slug: string): SiloConfig {
  const silo = getSilo(slug);
  if (!silo) {
    throw new Error(`Configuracao de silo nao encontrada: ${slug}`);
  }
  return silo;
}
