import { brandConfig } from "@/brand.config";
export type CollaboratorLink = {
  label: string;
  href: string;
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
};

export const DEFAULT_AUTHOR_PROFILE: CollaboratorProfile = {
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
