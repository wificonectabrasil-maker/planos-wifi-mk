import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { createDatabase } from "../lib/database/query";
import { adminCreateDraftPost, adminDeletePosts, adminPublishPost, listLatestPublicPosts } from "../lib/db";

const title = "Planos de internet residencial: como escolher sem cair em oferta ruim";
const description = "Promoção bonita não paga a conta. Compare planos de internet residencial por cobertura, custo total, velocidade e condições antes de assinar.";

test("published cards share cover, metadata and canonical links across home, silo, commercial pages and recovery", async ({ page }) => {
  // Keep the user's clipboard untouched while checking exactly what would be copied.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async (text: string) => { Reflect.set(window, "copiedArticleUrl", text); },
    } });
  });
  if (process.env.TURSO_DATABASE_URL !== "file:.cache-tests/e2e.db") throw new Error("Card fixtures require the isolated database.");
  const client = createClient({ url: process.env.TURSO_DATABASE_URL });
  const db = createDatabase(client);
  const silo = await client.execute("SELECT id FROM silos WHERE slug='planos-de-internet'");
  const slug = "como-escolher-plano-internet-residencial";
  const draftSlug = `card-private-${randomUUID()}`;
  const posts = [];
  try {
    const post = await adminCreateDraftPost({ title, slug, target_keyword: "planos de internet residencial", silo_id: String(silo.rows[0].id) });
    posts.push(post);
    const privatePost = await adminCreateDraftPost({ title: "Rascunho não deve aparecer nos cards", slug: draftSlug, target_keyword: "teste privado", silo_id: String(silo.rows[0].id) });
    posts.push(privatePost);
    await db.from("posts").update({
      hero_image_url: "/images/hero-claro-poster.webp", hero_image_alt: "Capa editorial de teste",
      cover_image: "/images/team/mike.webp", meta_description: description,
      excerpt: "Resumo antigo que não deve substituir a metadescrição.",
      silo_role: "PILLAR",
    }).eq("id", post.id);
    await adminPublishPost({ id: post.id, published: true });
    const homePosts = await listLatestPublicPosts();
    expect(homePosts.find(item => item.id === post.id)).toMatchObject({ meta_description: description, author_name: "Mike", hero_image_alt: "Capa editorial de teste" });
    expect(homePosts.find(item => item.id === post.id)?.published_at).toBeTruthy();

    for (const colorScheme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme });
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const path of ["/", "/planos-de-internet", "/planos", "/pagina-nao-encontrada?from=/planos-de-internet/antigo"]) {
          expect((await page.goto(path))?.status()).toBe(200);
          const card = page.getByRole("article", { name: title, exact: true });
          await expect(card).toHaveCount(1);
          await card.scrollIntoViewIfNeeded();
          await expect(card.getByRole("heading", { name: title, exact: true })).toBeVisible();
          await expect(card.locator(".system-post-card-description")).toHaveText(description);
          await expect(card.locator(".system-post-card-meta")).toContainText("Por Mike");
          await expect(card.locator(".system-post-card-meta time")).toHaveAttribute("datetime", /\d{4}-\d\d-\d\dT/);
          await expect(card.getByRole("link")).toHaveCount(1);
          await expect(card.getByRole("link")).toHaveAttribute("href", `/planos-de-internet/${slug}`);
          const currentUrl = page.url();
          const share = card.getByRole("button", { name: "Compartilhar", exact: true });
          await expect(share).toHaveAttribute("aria-expanded", "false");
          await share.click();
          await expect(share).toHaveAttribute("aria-expanded", "true");
          const canonical = `https://wificonecta.com.br/planos-de-internet/${slug}`;
          const networks = card.getByRole("navigation", { name: `Redes sociais para compartilhar: ${title}`, exact: true });
          await expect(networks.getByRole("link")).toHaveCount(4);
          for (const network of ["WhatsApp", "Facebook", "X", "LinkedIn"]) {
            const link = networks.getByRole("link", { name: `Compartilhar no ${network} (abre em nova aba)`, exact: true });
            await expect(link).toHaveAttribute("target", "_blank");
            await expect(link).toHaveAttribute("rel", /noopener noreferrer/);
            const url = new URL((await link.getAttribute("href"))!);
            if (network === "WhatsApp") expect(url.searchParams.get("text")).toBe(`${title}\n${canonical}`);
            else expect(url.searchParams.get(network === "Facebook" ? "u" : "url")).toBe(canonical);
            expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          }
          await card.getByRole("button", { name: `Copiar link do artigo: ${title}`, exact: true }).click();
          await expect(card.getByRole("status")).toHaveText("Link copiado!");
          expect(await page.evaluate(() => Reflect.get(window, "copiedArticleUrl"))).toBe(canonical);
          expect(page.url()).toBe(currentUrl);
          const image = card.getByRole("img", { name: "Capa editorial de teste" });
          await expect.poll(() => image.evaluate(el => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0)).toBe(true);
          expect(await image.getAttribute("src")).toContain("hero-claro-poster");
          await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)");
          await expect(card.locator(".system-post-card-title")).toHaveCSS("color", "rgb(20, 41, 67)");
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          expect((await card.boundingBox())!.width).toBeLessThanOrEqual(width);
          await expect(page.getByRole("article", { name: privatePost.title, exact: true })).toHaveCount(0);
          if (colorScheme === "light") await card.screenshot({ path: `artifacts/article-card-${path === "/" ? "home" : path.split(/[/?]/)[1]}-${width}.png` });
        }
      }
    }

    // The excerpt and legacy cover are used only when the primary metadata is absent.
    await db.from("posts").update({ hero_image_url: " ", hero_image_alt: null, meta_description: " ", excerpt: "Resumo alternativo cadastrado." }).eq("id", post.id);
    await page.goto("/planos-de-internet");
    const fallbackCard = page.getByRole("article", { name: title, exact: true });
    await expect(fallbackCard.locator(".system-post-card-description")).toHaveText("Resumo alternativo cadastrado.");
    await expect(fallbackCard.getByRole("img")).toHaveAttribute("alt", title);
    expect(await fallbackCard.getByRole("img").getAttribute("src")).toContain("mike.webp");
    await db.from("posts").update({ cover_image: null, og_image_url: null }).eq("id", post.id);
    await page.reload();
    await expect(fallbackCard.getByRole("img")).toHaveCount(0);
    await expect(fallbackCard).toContainText("Artigo sem imagem de capa");
    // If browser permission is denied, provide the real link for manual copying.
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new DOMException("Denied", "NotAllowedError"); } } }));
    await fallbackCard.getByRole("button", { name: `Copiar link do artigo: ${title}`, exact: true }).click();
    await expect(fallbackCard.getByRole("status")).toContainText("Não foi possível copiar automaticamente");
    await expect(fallbackCard.getByRole("textbox", { name: "Link do artigo para copiar manualmente" })).toHaveValue(`https://wificonecta.com.br/planos-de-internet/${slug}`);
    const fallbackShare = fallbackCard.getByRole("button", { name: "Compartilhar", exact: true });
    await fallbackShare.focus();
    await page.keyboard.press("Enter");
    await expect(fallbackShare).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(fallbackShare).toHaveAttribute("aria-expanded", "false");
  } finally {
    if (posts.length) await adminDeletePosts(posts.map(post => post.id), { allowPublicUrlDeletion: true, confirmedSlugs: posts.map(post => post.slug) });
    client.close();
  }
});
