type PostCoverSource = {
  title?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  cover_image?: string | null;
  og_image_url?: string | null;
};

function normalizeText(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export function resolvePostCoverUrl(post: PostCoverSource): string | null {
  const candidates = [post.hero_image_url, post.cover_image, post.og_image_url];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized) return normalized;
  }

  return null;
}

export function resolvePostCoverAlt(post: Pick<PostCoverSource, "hero_image_alt" | "title">): string {
  return normalizeText(post.hero_image_alt) ?? normalizeText(post.title) ?? "Imagem de capa";
}
