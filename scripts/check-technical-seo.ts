import { load } from "cheerio";
import { brandConfig } from "../brand.config";

const target = new URL(process.argv[2] || brandConfig.url);
const canonicalOrigin = new URL(brandConfig.url).origin;
if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
  throw new Error("Use uma URL pública HTTP/HTTPS, sem credenciais.");
}
const errors: string[] = [];
const summaries: Array<{ path: string; status: number; title: string }> = [];
const titlePaths = new Map<string, string>();
const descriptionPaths = new Map<string, string>();
const request = (path: string) => fetch(new URL(path, target.origin), {
  redirect: "manual",
  signal: AbortSignal.timeout(30_000),
  headers: { "user-agent": "WifiConecta-Technical-SEO-Check/1.0" },
});
function check(condition: unknown, detail: string) {
  if (!condition) errors.push(detail);
}
const noindex = (value: string | null | undefined) => /\bnoindex\b|\bnone\b/i.test(value || "");
const normalizeUrl = (value: string) => {
  const url = new URL(value, canonicalOrigin);
  return url.origin + (url.pathname.replace(/\/$/, "") || "/");
};

const robotsResponse = await request("/robots.txt");
const robots = await robotsResponse.text();
check(robotsResponse.status === 200, "robots.txt deve responder 200.");
check(!/^\s*Disallow:\s*\/\s*$/im.test(robots), "robots.txt bloqueia todo o site.");
check(robots.includes(`${canonicalOrigin}/sitemap.xml`), "robots.txt não informa o sitemap canônico.");

const sitemapResponse = await request("/sitemap.xml");
check(sitemapResponse.status === 200, "sitemap.xml deve responder 200.");
const xml = load(await sitemapResponse.text(), { xmlMode: true });
const sitemapUrls = xml("url > loc").map((_, element) => xml(element).text().trim()).get();
check(sitemapUrls.length > 0 && sitemapUrls.length <= 500, "Sitemap vazio ou acima do limite de 500 URLs desta verificação.");
check(new Set(sitemapUrls.map(normalizeUrl)).size === sitemapUrls.length, "Sitemap contém URLs duplicadas.");

for (const address of sitemapUrls.slice(0, 500)) {
  const url = new URL(address);
  const path = url.pathname;
  check(url.origin === canonicalOrigin && !url.search && !url.hash, `${address}: origem ou parâmetros indevidos no sitemap.`);
  check(!/^\/(admin|api|wp-json)(\/|$)/.test(path), `${path}: rota privada no sitemap.`);
  const response = await request(path);
  const html = load(await response.text());
  const title = html("title").first().text().trim();
  const description = html('meta[name="description"]').attr("content")?.trim() || "";
  const canonical = html('link[rel="canonical"]').attr("href");
  check(response.status === 200, `${path}: HTTP ${response.status}, esperado 200 sem redirecionamento.`);
  check(!noindex(response.headers.get("x-robots-tag")), `${path}: X-Robots-Tag impede indexação.`);
  for (const tag of html('meta[name="robots"], meta[name="googlebot"]').toArray()) {
    check(!noindex(html(tag).attr("content")), `${path}: meta robots impede indexação.`);
  }
  check(title.length > 0, `${path}: título ausente.`);
  check(description.length > 0, `${path}: descrição ausente.`);
  check(!titlePaths.has(title), `${path}: título duplicado com ${titlePaths.get(title)}.`);
  check(!descriptionPaths.has(description), `${path}: descrição duplicada com ${descriptionPaths.get(description)}.`);
  titlePaths.set(title, path);
  descriptionPaths.set(description, path);
  check(canonical && normalizeUrl(canonical) === normalizeUrl(address), `${path}: canonical incorreta ou ausente (${canonical || "vazia"}).`);
  check(html("h1").length === 1, `${path}: deve ter um H1 principal.`);
  check(html("html").attr("lang") === "pt-BR", `${path}: idioma da página incorreto.`);
  check(Boolean(html('meta[name="viewport"]').attr("content")), `${path}: viewport ausente.`);
  check(Boolean(html('meta[property="og:image"]').attr("content")), `${path}: imagem Open Graph ausente.`);
  for (const image of html("img").toArray()) {
    check(html(image).attr("alt") !== undefined, `${path}: imagem sem atributo alt.`);
  }
  for (const element of html('script[type="application/ld+json"]').toArray()) {
    try { JSON.parse(html(element).text()); }
    catch { errors.push(`${path}: JSON-LD inválido.`); }
  }
  summaries.push({ path, status: response.status, title });
}

const loginResponse = await request("/admin/login");
check(noindex(loginResponse.headers.get("x-robots-tag")), "Login administrativo sem proteção HTTP noindex.");
const missingResponse = await request("/verificacao-seo-pagina-inexistente");
check(missingResponse.status === 404, `Página inexistente respondeu ${missingResponse.status}, esperado 404.`);
const missingHtml = load(await missingResponse.text());
check(noindex(missingResponse.headers.get("x-robots-tag")) || noindex(missingHtml('meta[name="robots"]').attr("content")), "Página inexistente sem noindex.");

console.log(JSON.stringify({ target: target.origin, canonicalOrigin, pages: summaries, errors }, null, 2));
if (errors.length) process.exitCode = 1;
