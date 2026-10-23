import { SITE_URL } from "@/lib/site";
import { DEFAULT_AUTHOR_PROFILE, USE_DEFAULT_ARTICLE_AUTHOR } from "@/lib/site/collaborators";

export const DEFAULT_EEAT_AUTHOR = {
  authorName: DEFAULT_AUTHOR_PROFILE.name,
  expertName: USE_DEFAULT_ARTICLE_AUTHOR ? DEFAULT_AUTHOR_PROFILE.name : "",
  expertRole: USE_DEFAULT_ARTICLE_AUTHOR ? DEFAULT_AUTHOR_PROFILE.siteRole : "",
  expertBio: USE_DEFAULT_ARTICLE_AUTHOR ? DEFAULT_AUTHOR_PROFILE.shortBio : "",
  expertCredentials: "",
  reviewedBy: "",
  authorLinks: [
    ...DEFAULT_AUTHOR_PROFILE.links.filter((link) => link.platform !== "whatsapp").map((link) => link.href),
    new URL(DEFAULT_AUTHOR_PROFILE.profilePath ?? "/sobre", SITE_URL).href,
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
  if (USE_DEFAULT_ARTICLE_AUTHOR) {
    return {
      ...DEFAULT_EEAT_AUTHOR,
      reviewedBy: normalizeText(input.reviewedBy),
      authorLinks: [...DEFAULT_EEAT_AUTHOR.authorLinks],
    };
  }
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
