function readText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const raw = (value as any).raw;
  if (typeof raw === "string") return raw.trim();
  const rendered = (value as any).rendered;
  if (typeof rendered === "string") return rendered.trim();
  return "";
}

function pickFirst(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export type ContentorMeta = {
  seoTitle?: string;
  metaDescription?: string;
  slugSuggested?: string;
  focusKeyword?: string;
};

export type ContentorCta = {
  label?: string;
  url?: string;
  href?: string;
  preset?: string;
  variant?: string;
  size?: string;
  align?: string;
  tracking?: string;
  note?: string;
};

export function extractContentorMeta(payload: any): ContentorMeta {
  if (!payload || typeof payload !== "object") return {};

  const seoTitle = pickFirst(
    readText(payload.seo_title),
    readText(payload.seoTitle),
    readText(payload.meta_title),
    readText(payload.metaTitle),
    readText(payload?.meta?._yoast_wpseo_title),
    readText(payload?.meta?.rank_math_title),
    readText(payload?.seo?.title),
    readText(payload?.yoast_head_json?.title)
  );

  const metaDescription = pickFirst(
    readText(payload.meta_description),
    readText(payload.metaDescription),
    readText(payload.seo_description),
    readText(payload.seoDescription),
    readText(payload?.meta?._yoast_wpseo_metadesc),
    readText(payload?.meta?.rank_math_description),
    readText(payload?.meta?.description),
    readText(payload?.seo?.description),
    readText(payload?.yoast_head_json?.description)
  );

  const slugSuggested = pickFirst(
    readText(payload.slug_suggested),
    readText(payload.slugSuggested),
    readText(payload.suggested_slug),
    readText(payload.suggestedSlug),
    readText(payload.slug)
  );

  const focusKeyword = pickFirst(
    readText(payload.focus_keyword),
    readText(payload.focusKeyword),
    readText(payload.target_keyword),
    readText(payload.targetKeyword),
    readText(payload.keyword),
    readText(payload?.seo?.focus_keyword),
    readText(payload?.seo?.keyword)
  );

  const meta: ContentorMeta = {};
  if (seoTitle) meta.seoTitle = seoTitle;
  if (metaDescription) meta.metaDescription = metaDescription;
  if (slugSuggested) meta.slugSuggested = slugSuggested;
  if (focusKeyword) meta.focusKeyword = focusKeyword;

  return meta;
}

function normalizeCtaItem(item: any): ContentorCta | null {
  if (!item || typeof item !== "object") return null;
  const label = pickFirst(
    readText(item.label),
    readText(item.text),
    readText(item.title),
    readText(item.buttonText),
    readText(item.cta_text),
    readText(item.cta_label)
  );
  const url = pickFirst(
    readText(item.url),
    readText(item.href),
    readText(item.link),
    readText(item.target),
    readText(item.buttonUrl),
    readText(item.cta_url)
  );

  if (!label || !url) return null;

  return {
    label,
    url,
    href: url,
    preset: pickFirst(readText(item.preset), readText(item.vendor), readText(item.type)),
    variant: pickFirst(readText(item.variant), readText(item.style)),
    size: pickFirst(readText(item.size)),
    align: pickFirst(readText(item.align), readText(item.alignment)),
    tracking: pickFirst(readText(item.tracking), readText(item.utm), readText(item.campaign)),
    note: pickFirst(readText(item.note), readText(item.context)),
  };
}

export function extractContentorCtas(payload: any): ContentorCta[] {
  if (!payload || typeof payload !== "object") return [];

  const sources = [
    (payload as any).ctas,
    (payload as any).cta_blocks,
    (payload as any).ctaBlocks,
    (payload as any)?.contentor?.ctas,
    (payload as any)?.contentor?.cta_blocks,
    (payload as any)?.contentor?.ctaBlocks,
    (payload as any)?.meta?.ctas,
    (payload as any)?.meta?.cta_blocks,
  ];

  const items = sources.flatMap((source) => (Array.isArray(source) ? source : []));
  const normalized = items.map(normalizeCtaItem).filter(Boolean) as ContentorCta[];
  return normalized;
}


