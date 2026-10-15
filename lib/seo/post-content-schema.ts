import { load, type CheerioAPI } from "cheerio";

type JsonLd = Record<string, unknown>;
type FaqItem = { question: string; answer: string };
type HowToStep = { name?: string; text: string };

type ContentSchemaSource = {
  title: string;
  faq_json?: unknown;
  howto_json?: unknown;
  schema_type?: string | null;
};

function normalizeText(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function plainText(value: unknown): string {
  return typeof value === "string" ? normalizeText(load(value, {}, false).text()) : "";
}

function visibleContent(html: string) {
  const $ = load(html, {}, false);
  $("script, style, template, noscript, [hidden], [aria-hidden='true'], [inert]").remove();
  $("[style]").each((_, node) => {
    if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important\s*)?(?:;|$)/i.test($(node).attr("style") ?? "")) {
      $(node).remove();
    }
  });
  $('[data-visible-desktop="false"][data-visible-tablet="false"][data-visible-mobile="false"]').remove();
  return $;
}

function contentText($: CheerioAPI) {
  // Separate block contents without splitting words wrapped in inline markup.
  $("p, h1, h2, h3, h4, h5, h6, li, div, article, section, summary, br").append(" ");
  return normalizeText($.root().text());
}

function visibleFaq($: CheerioAPI, text: string, source: unknown, allowAutomatic: boolean): FaqItem[] {
  const supplied = Array.isArray(source) ? source : [];
  const candidates: FaqItem[] = supplied.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const question = plainText(item.question);
    const answer = plainText(item.answer);
    return question && answer ? [{ question, answer }] : [];
  });

  if (!supplied.length && allowAutomatic) {
    $("h2, .faq-block__q").each((_, node) => {
      const question = normalizeText($(node).text());
      const next = $(node).next();
      const answer = next.is("p, .faq-block__a") ? normalizeText(next.text()) : "";
      if (question.endsWith("?") && answer) candidates.push({ question, answer });
    });
  }

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = `${item.question} ${item.answer}`;
    if (!text.includes(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function visibleHowTo(text: string, source: unknown): HowToStep[] {
  if (!Array.isArray(source) || !source.length) return [];
  const steps: HowToStep[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") return [];
    const name = plainText(item.name);
    const description = plainText(item.text);
    if (!description || !text.includes(name ? `${name} ${description}` : description)) return [];
    steps.push({ ...(name ? { name } : {}), text: description });
  }
  return steps;
}

function httpUrl(value: string | undefined, base: string) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function brlPrice(value: string) {
  const amount = value.trim().replace(/^R\$\s*/i, "");
  const normalized = /^(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}$/.test(amount)
    ? amount.replace(/\./g, "").replace(",", ".")
    : /^\d+(?:\.\d{1,2})?$/.test(amount)
      ? amount
      : "";
  return normalized && Number(normalized) > 0 ? normalized : undefined;
}

function visibleProductOffers($: CheerioAPI, canonical: string): JsonLd[] {
  const products: JsonLd[] = [];
  $('[data-type="affiliate-product"]').each((_, node) => {
    const card = $(node);
    const title = normalizeText(card.attr("data-title") ?? "");
    const priceLabel = normalizeText(card.attr("data-price") ?? "");
    const text = normalizeText(card.text());
    const price = brlPrice(priceLabel);
    const url = httpUrl(card.attr("data-url"), canonical);
    const hasLink = url && card.find("a[href]").toArray().some((link) => httpUrl($(link).attr("href"), canonical) === url);
    if (!title || !text.includes(title) || !priceLabel || !text.includes(priceLabel) || !price || !hasLink) return;

    const image = httpUrl(card.find("img[src]").first().attr("src"), canonical);
    products.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: title,
      ...(image ? { image: [image] } : {}),
      offers: { "@type": "Offer", url, priceCurrency: "BRL", price },
    });
  });
  return products;
}

/** Emit supplementary entities only when their source is present in the rendered article. */
export function buildPostContentJsonLd(
  post: ContentSchemaSource,
  html: string,
  canonical: string,
  { allowAutomaticFaq = true }: { allowAutomaticFaq?: boolean } = {},
): JsonLd[] {
  const $ = visibleContent(html);
  const text = contentText($);
  const blocks = visibleProductOffers($, canonical);
  const faq = visibleFaq($, text, post.faq_json, allowAutomaticFaq);
  if (faq.length) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      url: canonical,
      mainEntity: faq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    });
  }
  const steps = post.schema_type === "howto" ? visibleHowTo(text, post.howto_json) : [];
  if (steps.length) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: post.title,
      url: canonical,
      step: steps.map((step) => ({ "@type": "HowToStep", ...step })),
    });
  }
  // A list title, affiliate score or embedded video cannot establish a ranking,
  // an editorial Review or the video's actual uploadDate. Those need explicit data.
  return blocks;
}
