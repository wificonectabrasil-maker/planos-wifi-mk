import { test, expect } from "@playwright/test";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { wifiEditorialRedirects } from "../lib/telecom/redirects";
import { wifiEditorialSilos } from "../lib/telecom/editorial-plan";
import { buildPostCanonicalPath } from "../lib/seo/canonical";
import { adminPublishPost, adminDeletePosts } from "../lib/db";
const canonicalOrigin = "https://wificonecta.com.br";

test("two short hubs have icons, correct canonicals and no indexable placeholder articles", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("main .wifi-editorial-grid > a")).toHaveCount(2);
  await expect(page.locator('a[href="/blog"]')).toHaveCount(0);
  await page.goto("/blog");
  await expect(page).toHaveURL(/\/planos-de-internet$/);
  for (const silo of wifiEditorialSilos) {
    await page.goto(silo.path);
    await expect(page.getByRole("heading", { level: 1, name: silo.name })).toBeVisible();
    await expect(page.locator(".wifi-editorial-symbol svg")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Os primeiros artigos estão em preparação." })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${canonicalOrigin}${silo.path}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("main article")).toHaveCount(0);
    await expect(page.locator('a[href="/blog"], main form, main input')).toHaveCount(0);
    const html = await page.locator("main").innerText();
    for (const [title] of silo.articles) expect(html).not.toContain(title);
    await expect(page.locator('a[href^="https://wa.me/"]').first()).toHaveAttribute("href", /wa\.me\/5511000000000\?/);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain(`${canonicalOrigin}/blog</loc>`);
  expect(sitemap).not.toContain("/planos-de-internet");
  expect(sitemap).not.toContain("/wifi-e-fibra");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Abrir menu" });
    expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await toggle.click();
    const navigation = page.getByRole("navigation", { name: "Navegação principal" });
    const heights = await navigation.locator('a').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    expect(heights.every(height => height >= 44)).toBe(true);
    await navigation.getByRole("link", { name: "Wi-Fi e fibra óptica", exact: true }).click();
    await expect(page).toHaveURL(/\/wifi-e-fibra$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("retired routes return permanent redirects and internal navigation skips them", async ({ page, request }) => {
  for (const rule of wifiEditorialRedirects.filter(rule => !rule.source.includes(":"))) {
    const response = await request.get(rule.source, { maxRedirects: 0 });
    expect(response.status(), rule.source).toBe(308);
    expect(new URL(response.headers().location, test.info().project.use.baseURL).pathname + new URL(response.headers().location, test.info().project.use.baseURL).hash).toBe(rule.destination);
    expect((await request.get(rule.destination.split("#")[0])).status()).toBe(200);
  }
  for (const path of ["/", ...wifiEditorialSilos.map(silo => silo.path), "/planos", "/sobre", "/contato", "/internet-empresarial", "/internet-para-condominios"]) {
    await page.goto(path);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("href")!.split("#")[0]));
    for (const rule of wifiEditorialRedirects.filter(rule => !rule.source.includes(":"))) expect(hrefs, path).not.toContain(rule.source);
  }
});

test("published pillars and supports stay inside their silo with contextual links and canonical URLs", async ({ page, request }) => {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  const ids: string[] = [];
  const slugs: string[] = [];
  try {
    for (const silo of wifiEditorialSilos) {
      const pillarId = randomUUID();
      const supportId = randomUUID();
      const pillarSlug = `pilar-de-teste-${pillarId}`;
      const supportSlug = `suporte-de-teste-${supportId}`;
      const pillarPath = buildPostCanonicalPath(silo.slug, pillarSlug)!;
      const supportPath = buildPostCanonicalPath(silo.slug, supportSlug)!;
      const fixtures = [
        { id: pillarId, slug: pillarSlug, path: pillarPath, title: `Guia principal de teste: ${silo.name}`, role: "PILLAR", content: `<p>Confira os detalhes em <a href="${supportPath}">condições e critérios deste assunto</a>.</p>` },
        { id: supportId, slug: supportSlug, path: supportPath, title: `Guia complementar de teste: ${silo.name}`, role: "SUPPORT", content: `<p>Entenda o contexto no <a href="${pillarPath}">guia principal deste assunto</a>.</p>` },
      ];
      const row = await client.execute({ sql: "SELECT id FROM silos WHERE slug=?", args: [silo.slug] });
      for (const fixture of fixtures) {
        await client.execute({
          sql: "INSERT INTO posts(id,silo_id,title,slug,canonical_path,content_html,meta_description,silo_role) VALUES(?,?,?,?,?,?,?,?)",
          args: [fixture.id, row.rows[0].id, fixture.title, fixture.slug, fixture.path, fixture.content, "Descrição do artigo de teste.", fixture.role],
        });
        ids.push(fixture.id);
        slugs.push(fixture.slug);
      }
      await page.goto(silo.path);
      for (const fixture of fixtures) await expect(page.locator(`main a[href="${fixture.path}"]`)).toHaveCount(0);
      for (const fixture of fixtures) await adminPublishPost({ id: fixture.id, published: true });
      await page.reload();
      await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
      const pillarSection = page.getByRole("region", { name: "Comece pelo guia principal" });
      const supportSection = page.getByRole("region", { name: "Aprofunde por assunto" });
      await expect(pillarSection.getByRole("link", { name: fixtures[0].title, exact: true })).toHaveAttribute("href", pillarPath);
      await expect(supportSection.getByRole("link", { name: fixtures[1].title, exact: true })).toHaveAttribute("href", supportPath);
      await expect(pillarSection.locator(`a[href="${supportPath}"]`)).toHaveCount(0);
      await expect(supportSection.locator(`a[href="${pillarPath}"]`)).toHaveCount(0);
      await expect(page.locator('a[href="/blog"]')).toHaveCount(0);
      for (const fixture of fixtures) {
        await page.goto(fixture.path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(fixture.title);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${canonicalOrigin}${fixture.path}`);
        await expect(page.getByRole("link", { name: `Voltar para ${silo.name}`, exact: true })).toHaveAttribute("href", silo.path);
        const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
        expect(schema.join(" ")).toContain(`${canonicalOrigin}${fixture.path}`);
        await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `${canonicalOrigin}${fixture.path}`);
        await expect(page.locator('a[href^="/blog"]')).toHaveCount(0);
        await page.setViewportSize({ width: 320, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.goto(pillarPath);
      await page.locator(`.content a[href="${supportPath}"]`).click();
      await expect(page).toHaveURL(supportPath);
      await page.locator(`.content a[href="${pillarPath}"]`).click();
      await expect(page).toHaveURL(pillarPath);
      const sitemap = await (await request.get("/sitemap.xml")).text();
      expect(sitemap).toContain(`${canonicalOrigin}${pillarPath}</loc>`);
      expect(sitemap).toContain(`${canonicalOrigin}${supportPath}</loc>`);
      expect(sitemap).toContain(`${canonicalOrigin}${silo.path}</loc>`);
      expect(sitemap).not.toContain("localhost");
      expect(sitemap).not.toContain("/blog");
      if (silo.slug === "planos-de-internet") {
        const legacy = await request.get(`/blog/planos-de-internet/${pillarSlug}`, { maxRedirects: 0 });
        expect(legacy.status()).toBe(308);
        expect(legacy.headers().location).toBe(pillarPath);
      }
    }
  } finally {
    if (ids.length) await adminDeletePosts(ids, { allowPublicUrlDeletion: true, confirmedSlugs: slugs });
    client.close();
  }
});
