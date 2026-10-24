export type EditorLinkType = "internal" | "external" | "affiliate" | "about" | "mention";

const amazonDomains = [
  "amazon.com", "amazon.com.br", "amazon.ca", "amazon.com.mx", "amazon.co.uk",
  "amazon.de", "amazon.fr", "amazon.it", "amazon.es", "amazon.nl", "amazon.se",
  "amazon.pl", "amazon.com.be", "amazon.ie", "amazon.com.au", "amazon.in",
  "amazon.co.jp", "amazon.sg", "amazon.com.tr", "amazon.ae", "amazon.sa",
  "amazon.eg", "amazon.co.za", "amzn.to", "a.co",
];

function webUrl(href: string, base?: string): URL | null {
  try {
    const url = new URL(href.trim().startsWith("//") ? `https:${href.trim()}` : href.trim(), base);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

export function isAmazonUrl(href: string): boolean {
  const host = webUrl(href)?.hostname.toLowerCase().replace(/\.$/, "");
  return Boolean(host && amazonDomains.some(domain => host === domain || host.endsWith(`.${domain}`)));
}

export function isInternalSiteHref(href: string, siteUrl: string): boolean {
  if (!href.trim()) return false;
  const site = webUrl(siteUrl);
  const target = webUrl(href, siteUrl);
  const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  return Boolean(site && target && host(site) === host(target) && site.port === target.port);
}

export function inferEditorLinkType(attrs: Record<string, unknown>, href: string, siteUrl: string): EditorLinkType {
  if (isAmazonUrl(href)) return "affiliate";
  // The destination takes precedence over stale affiliate metadata from older imports.
  if (isInternalSiteHref(href, siteUrl)) return "internal";
  const rel = String(attrs.rel ?? "").toLowerCase().split(/\s+/);
  const entity = attrs["data-entity-type"] || attrs["data-entity"];
  if (entity === "about" || rel.includes("about")) return "about";
  if (entity === "mention" || rel.includes("mention")) return "mention";
  const explicit = attrs["data-link-type"];
  if (["external", "affiliate", "about", "mention"].includes(String(explicit))) return explicit as EditorLinkType;
  return rel.includes("sponsored") ? "affiliate" : "external";
}
