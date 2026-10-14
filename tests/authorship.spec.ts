import { test, expect } from "@playwright/test";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { adminCreateDraftPost, adminPublishPost, adminDeletePosts } from "../lib/db";

const identityUrl = "https://wificonecta.com.br/sobre#mike";

test("about page presents Mike and his supplied contact channels on mobile and desktop", async ({ page, request }) => {
  await page.goto("/sobre");
  const card = page.getByRole("region", { name: "Perfil de Mike", exact: true });
  await expect(card.getByRole("heading", { name: "Mike", exact: true })).toBeVisible();
  await expect(card).toContainText("Gerente de vendas");
  await expect(card.getByRole("img")).toHaveAttribute("alt", "Mike, gerente de vendas da WifiConecta");
  const expected = ["https://www.instagram.com/mii_ke7/", "https://www.facebook.com/share/1DcqCCTa3n/", "https://wa.me/5511948844107"];
  for (const href of expected) {
    const link = card.locator('a[href="' + href + '"]');
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link.locator("svg")).toHaveCount(1);
  }
  const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(text => JSON.parse(text));
  const person = schemas.find(item => item["@type"] === "Person");
  expect(person).toMatchObject({ "@id": identityUrl, name: "Mike", jobTitle: "Gerente de vendas", url: identityUrl });
  expect(person.sameAs).toEqual(expected.slice(0, 2));
  const image = await request.get("/images/team/mike.webp");
  expect(image.status()).toBe(200);
  expect((await image.body()).length).toBeLessThan(20000);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await card.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => card.getByRole("img").evaluate(img => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0)).toBe(true);
    for (const link of await card.getByRole("link").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: "artifacts/mike-about-" + width + ".png" });
  }
});

test("new editorial drafts use Mike and publish a matching person identity and author card", async ({ page }) => {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  const slugs: string[] = [];
  const ids: string[] = [];
  try {
    const silo = await client.execute("SELECT id FROM silos WHERE slug='planos-de-internet'");
    const slug = "autoria-teste-" + randomUUID();
    const draft = await adminCreateDraftPost({ silo_id: String(silo.rows[0].id), title: "Autoria de teste isolado", slug, target_keyword: "autoria teste" });
    ids.push(draft.id); slugs.push(slug);
    expect(draft.author_name).toBe("Mike");
    expect(draft.expert_credentials || "").toBe("");
    expect(draft.reviewed_by || "").toBe("");
    await adminPublishPost({ id: draft.id, published: true });
    await page.goto("/planos-de-internet/" + slug);
    const card = page.getByRole("region", { name: "Perfil de Mike", exact: true });
    await expect(card).toContainText("Gerente de vendas");
    await expect(card.getByRole("link", { name: "Conhecer Mike e a equipe" })).toHaveAttribute("href", "/sobre#mike");
    await expect(card.getByRole("link")).toHaveCount(4);
    const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap(text => JSON.parse(text));
    const article = schemas.find(item => item["@type"] === "Article");
    expect(article.author).toMatchObject({ "@type": "Person", "@id": identityUrl, name: "Mike", jobTitle: "Gerente de vendas", url: identityUrl, image: "https://wificonecta.com.br/images/team/mike.webp" });
    expect(article.author.sameAs).toEqual(["https://www.instagram.com/mii_ke7/", "https://www.facebook.com/share/1DcqCCTa3n/"]);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await card.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } finally {
    if (ids.length) await adminDeletePosts(ids, { allowPublicUrlDeletion: true, confirmedSlugs: slugs });
    client.close();
  }
});
