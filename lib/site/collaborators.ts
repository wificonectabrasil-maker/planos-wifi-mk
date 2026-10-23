import { brandConfig } from "@/brand.config";
export type CollaboratorLink = {
  label: string;
  href: string;
  platform?: "instagram" | "facebook" | "whatsapp";
};

export type CollaboratorProfile = {
  id: string;
  name: string;
  professionalName?: string;
  siteRole: string;
  shortBio: string;
  fullBio: string[];
  specialties: string[];
  location: string;
  experienceSince: number;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  links: CollaboratorLink[];
  reviewedByShort: string;
  expertBoxShort: string;
  aliases?: string[];
  profilePath?: string;
};

export const DEFAULT_AUTHOR_PROFILE: CollaboratorProfile = brandConfig.collaborators.find(
  (person) => person.name === brandConfig.defaultAuthor,
) ?? {
  id: "editorial",
  name: brandConfig.defaultAuthor,
  siteRole: "Equipe editorial",
  shortBio: "",
  fullBio: [],
  specialties: [],
  location: "",
  experienceSince: 0,
  image: {
    src: brandConfig.logo,
    alt: brandConfig.defaultAuthor,
    width: 260,
    height: 84,
  },
  links: [],
  reviewedByShort: "",
  expertBoxShort: "",
  aliases: [],
};
export const COLLABORATORS: CollaboratorProfile[] = brandConfig.collaborators;
export const USE_DEFAULT_ARTICLE_AUTHOR =
  (brandConfig as { useDefaultAuthorForArticles?: boolean }).useDefaultAuthorForArticles === true;
function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findCollaboratorByName(name: string | null | undefined) {
  if (!name || !name.trim()) return null;
  const target = normalizeName(name);
  for (const collaborator of COLLABORATORS) {
    const candidates = [
      collaborator.name,
      collaborator.professionalName,
      ...(collaborator.aliases ?? []),
    ]
      .filter(Boolean)
      .map((item) => normalizeName(item as string));
    if (candidates.includes(target)) return collaborator;
  }
  return null;
}

export const EDITOR_AUTHOR_OPTIONS = Array.from(
  new Set([
    brandConfig.defaultAuthor,
    ...COLLABORATORS.map((person) => person.name),
  ]),
);

/** Brands can assign their articles to the configured author, including legacy posts. */
export function resolveArticleAuthorProfile(name: string | null | undefined) {
  if (USE_DEFAULT_ARTICLE_AUTHOR || !name?.trim()) return DEFAULT_AUTHOR_PROFILE;
  return findCollaboratorByName(name);
}
