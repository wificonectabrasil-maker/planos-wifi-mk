import { getCanonicalSiloSlug } from "@/lib/silo-config";

function cleanSegment(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function normalizeSiloSegment(value: string | null | undefined): string {
  const cleaned = cleanSegment(value);
  if (!cleaned) return "";
  return cleanSegment(getCanonicalSiloSlug(cleaned));
}

export function normalizeCanonicalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  let raw = value.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      raw = new URL(raw).pathname || "/";
    } catch {
      return null;
    }
  }

  raw = raw.split("#")[0]?.split("?")[0]?.trim() ?? "";
  if (!raw) return null;
  if (!raw.startsWith("/")) raw = `/${raw}`;
  raw = raw.replace(/\/{2,}/g, "/");
  if (raw.length > 1) raw = raw.replace(/\/+$/, "");
  return raw || "/";
}

export function buildSiloCanonicalPath(siloSlug: string | null | undefined): string | null {
  const silo = normalizeSiloSegment(siloSlug);
  if (!silo) return null;
  return `/${silo}`;
}

export function buildPostCanonicalPath(
  siloSlug: string | null | undefined,
  postSlug: string | null | undefined
): string | null {
  const silo = normalizeSiloSegment(siloSlug);
  const slug = cleanSegment(postSlug);
  if (!silo || !slug) return null;
  return `/${silo}/${slug}`;
}

export function buildCanonicalUrl(siteUrl: string, canonicalPath: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const path = normalizeCanonicalPath(canonicalPath) ?? "/";
  return path === "/" ? `${base}/` : `${base}${path}`;
}
