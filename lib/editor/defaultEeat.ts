import { SITE_URL } from "@/lib/site";
import { DEFAULT_AUTHOR_PROFILE } from "@/lib/site/collaborators";

export const DEFAULT_EEAT_AUTHOR = {
  authorName: DEFAULT_AUTHOR_PROFILE.name,
  expertName: "",
  expertRole: "",
  expertBio: "",
  expertCredentials: "",
  reviewedBy: "",
  authorLinks: [
    ...DEFAULT_AUTHOR_PROFILE.links.map((link) => link.href),
    `${SITE_URL}/sobre`,
  ],
} as const;

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed;
}

function normalizeLinks(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export function resolveDefaultEeat(input: {
  authorName?: string | null;
  expertName?: string | null;
  expertRole?: string | null;
  expertBio?: string | null;
  expertCredentials?: string | null;
  reviewedBy?: string | null;
  authorLinks?: string[] | null;
}) {
  const authorName =
    normalizeText(input.authorName) || DEFAULT_EEAT_AUTHOR.authorName;
  const expertName =
    normalizeText(input.expertName) || DEFAULT_EEAT_AUTHOR.expertName;
  const expertRole =
    normalizeText(input.expertRole) || DEFAULT_EEAT_AUTHOR.expertRole;
  const expertBio =
    normalizeText(input.expertBio) || DEFAULT_EEAT_AUTHOR.expertBio;
  const expertCredentials =
    normalizeText(input.expertCredentials) ||
    DEFAULT_EEAT_AUTHOR.expertCredentials;
  const reviewedBy =
    normalizeText(input.reviewedBy) || DEFAULT_EEAT_AUTHOR.reviewedBy;
  const authorLinks = normalizeLinks(input.authorLinks);

  return {
    authorName,
    expertName,
    expertRole,
    expertBio,
    expertCredentials,
    reviewedBy,
    authorLinks: authorLinks.length
      ? authorLinks
      : [...DEFAULT_EEAT_AUTHOR.authorLinks],
  };
}
