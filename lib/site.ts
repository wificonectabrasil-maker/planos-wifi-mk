import { brandConfig } from "@/brand.config";
export const SITE_NAME = brandConfig.name;
export const SITE_URL = brandConfig.url;
export const SITE_DOMAIN = new URL(SITE_URL).hostname;
export const SITE_DESCRIPTION = brandConfig.description;
export const SITE_LOCALE = brandConfig.locale;
export const SITE_BRAND_TAGLINE = brandConfig.tagline;
export const SITE_CONTACT_EMAIL = brandConfig.contactEmail;
export const AMAZON_AFFILIATE_DISCLOSURE = brandConfig.affiliateDisclosure;

function normalizeComparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isStandardAffiliateDisclosure(value: string | null | undefined) {
  if (!value || !value.trim()) return false;
  const normalized = normalizeComparableText(value);
  const standard = normalizeComparableText(AMAZON_AFFILIATE_DISCLOSURE);
  if (!normalized || !standard) return false;
  if (normalized === standard) return true;
  const coreTerms = ["associado da amazon", "compras qualificadas", "links de afiliado"];
  return coreTerms.every((term) => normalized.includes(term));
}
