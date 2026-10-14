import { brandConfig } from "@/brand.config";

export function publicIndexingAllowed() {
  if (process.env.VERCEL_ENV === "preview") return false;
  // Launch must be explicit for this brand while its final domain is being prepared.
  if ((brandConfig as { useBrandCanonicalOrigin?: boolean }).useBrandCanonicalOrigin)
    return process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false";
}
