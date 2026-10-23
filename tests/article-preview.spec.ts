import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { createDatabase } from "../lib/database/query";
import { adminCreateDraftPost, adminDeletePosts, adminPublishPost } from "../lib/db";

const title = "Planos de internet residencial: como escolher sem cair em oferta ruim";
const intro = "Confira a disponibilidade para o endereço e compare as condições antes de escolher um plano de internet residencial.";
const body = `<p>${intro}</p><h2>O que conferir antes de assinar?</h2>${`<p>${intro}</p>`.repeat(12)}<h3>Cobertura e condições</h3><p>O endereço completo precisa de confirmação.</p><h2>Como comparar as opções?</h2>${`<p>${intro}</p>`.repeat(12)}`;

async function createArticle() {
  if (process.env.TURSO_DATABASE_URL !== "file:.cache-tests/e2e.db") throw new Error("Article fixtures require the isolated database.");
  const client = createClient({ url: process.env.TURSO_DATABASE_URL });
  const db = createDatabase(client);
  const silo = await client.execute("SELECT id FROM silos WHERE slug='planos-de-internet'");
  const slug = `preview-style-${randomUUID()}`;
  const post = await adminCreateDraftPost({ silo_id: String(silo.rows[0].id), title, slug, target_keyword: "internet residencial" });
  const saved = await db.from("posts").update({
    content_html: body, content_json: null,
    hero_image_url: "/images/hero-claro-poster.webp", hero_image_alt: "Capa de teste do artigo",
    meta_description: "Descrição editorial preservada no teste de apresentação.",
    sources: [{ label: "Fonte de teste", url: "https://example.com/fonte" }],
    reviewed_by: "Revisor de teste", disclaimer: "Aviso editorial de teste.",
    author_name: "Autor do template antigo", expert_name: "Equipe antiga",
    expert_role: "Cargo antigo", expert_bio: "Biografia antiga", expert_credentials: "Credencial antiga",
  }).eq("id", post.id);
  expect(saved.error).toBeNull();
  return { client, post, slug, path: `/planos-de-internet/${slug}` };
}

async function assertPublicPresentation(page: Page, preview: boolean) {
  await expect(page.locator(".wifi-header")).toHaveCount(1);
  await expect(page.locator(".wifi-footer")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("#wifi-navigation")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toHaveCount(1);
  await expect(page.locator(".system-post-article")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".system-post-title")).toHaveCSS("color", "rgb(20, 41, 67)");
  await expect(page.locator(".system-post-content p").first()).toHaveCSS("color", "rgb(20, 41, 67)");
  expect(await page.locator(".system-post-title").evaluate(el => getComputedStyle(el).fontFamily)).toContain("Arial");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".system-post-content")).toContainText(intro);
  await expect(page.getByRole("region", { name: "Perfil de Mike", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Perfil de Mike", exact: true })).toHaveCount(1);
  await expect(page.locator(".system-post-meta")).toContainText("Por Mike");
  await expect(page.locator(".system-post-main > section").last()).toHaveAttribute("aria-label", "Perfil de Mike");
  expect(await page.locator(".system-post-content").evaluate(el => Math.abs(el.getBoundingClientRect().right - document.querySelector(".system-post-cover")!.getBoundingClientRect().right))).toBeLessThan(2);
  await expect(page.getByRole("region", { name: "Fontes do artigo", exact: true }).getByRole("link", { name: "Fonte de teste", exact: true })).toHaveAttribute("href", "https://example.com/fonte");
  await expect(page.locator(".system-preview-banner")).toHaveCount(preview ? 1 : 0);
  expect(await page.locator(".system-post-container").evaluate(el => Math.abs(el.getBoundingClientRect().width - document.querySelector(".wifi-header-main")!.getBoundingClientRect().width))).toBeLessThan(2);
}

test("authenticated draft preview uses one public brand shell in both system color schemes", async ({ page, request }) => {
  const fixture = await createArticle();
  try {
    const path = `/admin/preview/${fixture.post.id}`;
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login/);
    expect((await request.get(fixture.path)).status()).toBe(404);
    expect((await page.request.post("/api/admin/login", { form: { email: "admin@example.com", password: process.env.ADMIN_PASSWORD! } })).status()).toBe(200);

    for (const colorScheme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme });
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(path);
        expect(response?.headers()["x-robots-tag"]).toContain("noindex");
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
        await assertPublicPresentation(page, true);
        await expect(page.locator(".system-preview-banner")).toContainText("Rascunho");
        await expect(page.getByRole("link", { name: "Voltar ao editor", exact: true })).toHaveAttribute("href", `/admin/editor/${fixture.post.id}`);
        if (width < 768) {
          await page.getByRole("button", { name: "Abrir Índice", exact: true }).click();
          await expect(page.locator(".system-post-toc-mobile")).toHaveCSS("--ink", "#142943");
          await page.getByRole("button", { name: "Fechar índice", exact: true }).click();
        } else {
          await expect(page.locator(".system-post-toc-card")).toHaveCSS("background-color", "rgb(245, 248, 255)");
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `artifacts/article-preview-${colorScheme}-${width}.png` });
      }
    }
    const unchanged = await fixture.client.execute({ sql: "SELECT published, status, content_html FROM posts WHERE id=?", args: [fixture.post.id] });
    expect(Number(unchanged.rows[0].published)).toBe(0);
    expect(unchanged.rows[0].status).toBe("draft");
    expect(unchanged.rows[0].content_html).toBe(body);
  } finally {
    await adminDeletePosts([fixture.post.id], { allowPublicUrlDeletion: true, confirmedSlugs: [fixture.slug] });
    fixture.client.close();
  }
});

test("published fixture shares the preview presentation and retains article SEO", async ({ page }) => {
  const fixture = await createArticle();
  try {
    await adminPublishPost({ id: fixture.post.id, published: true });
    for (const colorScheme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(fixture.path);
        await assertPublicPresentation(page, false);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://wificonecta.com.br${fixture.path}`);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Descrição editorial preservada no teste de apresentação.");
        const schema = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap(text => JSON.parse(text));
        expect(schema.find(node => node["@type"] === "Article").headline).toBe(title);
        expect(schema.find(node => node["@type"] === "Article").author).toMatchObject({ name: "Mike", jobTitle: "Gerente de vendas", "@id": "https://wificonecta.com.br/sobre#mike" });
        expect(schema.find(node => node["@type"] === "Article").author.honorificSuffix).toBeUndefined();
        expect(schema.filter(node => node["@type"] === "Article")).toHaveLength(1);
        await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `artifacts/article-public-${colorScheme}-${width}.png` });
      }
    }
  } finally {
    await adminDeletePosts([fixture.post.id], { allowPublicUrlDeletion: true, confirmedSlugs: [fixture.slug] });
    fixture.client.close();
  }
});

test("editor prefills Mike's profile and shows the automatic CTA and author card without inserting them into content", async ({ page }) => {
  const fixture = await createArticle();
  try {
    await page.setViewportSize({ width: 1920, height: 1080 });
    expect((await page.request.post("/api/admin/login", { form: { email: "admin@example.com", password: process.env.ADMIN_PASSWORD! } })).status()).toBe(200);
    await page.goto(`/admin/editor/${fixture.post.id}`);
    await expect(page.locator(".tiptap")).toContainText(intro);
    await page.getByRole("button", { name: "E-E-A-T", exact: true }).click();
    const data = page.getByRole("region", { name: "Dados do autor", exact: true });
    await expect(data).toContainText("Mike");
    await expect(data).toContainText("Gerente de vendas");
    await expect(data).toContainText("assina os conteúdos do site");
    await expect(data.getByRole("img")).toHaveAttribute("alt", "Mike, gerente de vendas da WifiConecta");
    const links = page.locator('textarea[readonly]');
    await expect(links).toHaveValue("https://www.instagram.com/mii_ke7/\nhttps://www.facebook.com/share/1DcqCCTa3n/\nhttps://wificonecta.com.br/sobre#mike");
    await expect(page.getByRole("region", { name: "CTA padrão do artigo", exact: true })).toContainText("Já sabe o que sua conexão precisa?");
    const footer = page.getByLabel("Encerramento automático do artigo");
    await expect(footer.locator(".site-author-card")).toHaveCount(1);
    await expect(footer.locator(".system-article-next-step")).toHaveCount(1);
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByRole("region", { name: "Perfil de Mike", exact: true })).toBeVisible();
    await expect(footer.locator(".site-author-card")).toHaveCSS("background-color", "rgb(245, 248, 255)");
    await page.screenshot({ path: "artifacts/article-editor-mike.png" });
    await page.getByRole("button", { name: "Salvar", exact: true }).first().click();
    await expect.poll(async () => {
      const saved = await fixture.client.execute({ sql: "SELECT author_name, expert_name, expert_role, expert_bio, expert_credentials, content_html, content_json, status FROM posts WHERE id=?", args: [fixture.post.id] });
      const row = saved.rows[0];
      if (row.author_name !== "Mike" || row.expert_role !== "Gerente de vendas") return false;
      expect(row.expert_name).toBe("Mike");
      expect(row.expert_bio).toContain("assina os conteúdos do site");
      expect(row.expert_credentials || "").toBe("");
      expect(row.status).toBe("draft");
      expect(String(row.content_html)).not.toContain("site-author-card");
      expect(String(row.content_html)).not.toContain("Já sabe o que sua conexão precisa?");
      expect(JSON.parse(String(row.content_json)).meta.authorLinks).toContain("https://wificonecta.com.br/sobre#mike");
      return true;
    }).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "E-E-A-T", exact: true }).click();
    await expect(links).toHaveValue(/sobre#mike/);
    for (const path of ["/admin", "/admin/silos", "/admin/silos/planos-de-internet"]) {
      expect((await page.goto(path))?.status()).toBe(200);
      await expect(page.locator(".admin-app")).toBeVisible();
    }
  } finally {
    await adminDeletePosts([fixture.post.id], { allowPublicUrlDeletion: true, confirmedSlugs: [fixture.slug] });
    fixture.client.close();
  }
});
