import { SITE_URL } from "@/lib/site";

const DEFAULT_SITE_URL = SITE_URL;

function normalizeSiteUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  let raw = value.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  try {
    const parsed = new URL(raw);

    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function resolveSiteUrl(): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    DEFAULT_SITE_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeSiteUrl(candidate);
    if (normalized) return normalized;
  }

  return DEFAULT_SITE_URL;
}
