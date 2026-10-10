import { test, expect } from "@playwright/test";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { offerSchema } from "../lib/telecom/catalog";

test("public site uses WhatsApp only, redirects retired pages and supports mobile navigation", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const paths = ["/", "/sobre", "/planos", "/comparar", "/internet-residencial", "/internet-empresarial", "/internet-para-condominios", "/tv-e-streaming", "/celular-e-internet", "/operadoras", "/operadoras/claro", "/operadoras/vivo", "/operadoras/tim", "/contato"];
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator("main form, main input, main select, main table")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/CEP|R\$/);
    const links = await page.locator('a[href^="https://wa.me/"]').evaluateAll(nodes => nodes.map(node => (node as HTMLAnchorElement).href));
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(new URL(href).pathname).toBe("/5511000000000");
  }
  await page.goto("/consultar?cep=01310100");
  await expect(page).toHaveURL(/\/contato$/);
  await page.goto("/planos/500-mega");
  await expect(page).toHaveURL(/\/planos-de-internet$/);
  for (const [slug, name] of [["claro", "Claro"], ["vivo", "Vivo"], ["tim", "TIM"]]) {
    await page.goto(`/operadoras/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/planos#operadora-${slug}$`));
    const destination = new URL((await page.getByRole("link", { name: `Consultar ${name} no WhatsApp`, exact: true }).getAttribute("href"))!);
    expect(destination.searchParams.get("text")).toContain(`Serviços ${name}`);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toMatch(/\/consultar|\/planos\/500-mega|\/planos\/600-mega|\/planos\/1-giga/);
  expect(sitemap).not.toContain("/operadoras/");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Pra sua empresa" }).click();
  await expect(page).toHaveURL(/internet-empresarial/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("retired capture API rejects submissions without storing personal data", async ({ request }) => {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    const before = await client.execute("SELECT COUNT(*) AS total FROM telecom_leads");
    const response = await request.post("/api/telecom/leads", { data: { name: "Do not store", phone: "11999999999", cep: "01310100", consent: true } });
    expect(response.status()).toBe(410);
    expect(await response.json()).toEqual({ error: "O atendimento da WifiConecta é exclusivamente pelo WhatsApp. Consulte o canal na página de contato." });
    expect((await request.get("/api/telecom/leads")).status()).toBe(410);
    const after = await client.execute("SELECT COUNT(*) AS total FROM telecom_leads");
    expect(after.rows[0].total).toBe(before.rows[0].total);
  } finally { client.close(); }
});

test("WhatsApp opens the chosen subject and records a click without personal data", async ({ page, context }) => {
  await context.route("https://wa.me/**", route => route.fulfill({ contentType: "text/html", body: "<html><body>Destino interceptado no teste.</body></html>" }));
  await page.goto("/");
  const hero = page.getByRole("link", { name: "Ver promoções no WhatsApp", exact: true });
  const destination = new URL((await hero.getAttribute("href"))!);
  expect(destination.hostname).toBe("wa.me");
  expect(destination.pathname).toBe("/5511000000000");
  expect(destination.searchParams.get("text")).toContain("promoções, vantagens e pacotes");
  expect(destination.searchParams.get("text")).toContain("São Paulo");
  await page.evaluate(() => {
    window.addEventListener("wificonecta:conversion", event => {
      document.documentElement.dataset.lastConversion = JSON.stringify((event as CustomEvent).detail);
    });
  });
  const popupPromise = page.waitForEvent("popup");
  await hero.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(destination.toString());
  expect(await page.evaluate(() => JSON.parse(document.documentElement.dataset.lastConversion!))).toEqual({ event: "whatsapp_clicked", source: "hero" });
  await popup.close();
  const packageCards = page.locator("#pacotes .wifi-package-card");
  await expect(packageCards).toHaveCount(4);
  for (const [title, interest] of [
    ["Claro Multi", "500 Mega + 60 GB, Globoplay"],
    ["Claro com TV e streaming", "TV Box com 120 canais"],
    ["Claro Empresas", "600 Mega + McAfee"],
    ["Claro tv+ Box", "Claro tv+ Box para condomínio"],
  ]) {
    const card = packageCards.filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    const url = new URL((await card.getByRole("link").getAttribute("href"))!);
    expect(url.pathname).toBe("/5511000000000");
    expect(url.searchParams.get("text")).toContain(interest);
    expect(url.searchParams.get("text")).toContain("São Paulo");
  }
  await page.goto("/internet-empresarial");
  expect(new URL((await page.locator(".wifi-whatsapp-floating").getAttribute("href"))!).searchParams.get("text")).toContain("Internet para minha empresa");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".wifi-whatsapp-floating")).toBeVisible();
});

test("commercial admin explains the current operation without a fixed-plan registration", async ({ page }) => {
  await page.goto("/admin/comercial");
  await expect(page).toHaveURL(/admin\/login/);
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByLabel("Senha", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await expect(page).toHaveURL(/\/admin\/comercial$/);
  await expect(page.getByText("Os pacotes, preços e benefícios são apresentados exclusivamente na conversa pelo WhatsApp.")).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Abrir canal de atendimento" })).toHaveAttribute("href", /https:\/\/wa.me\/5511000000000\?/);
});

test("even a valid legacy offer cannot leak prices or fixed benefits into public pages", async ({ request }) => {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  const id = randomUUID();
  const title = "LEGACY OFFER MUST STAY PRIVATE";
  try {
    const offer = offerSchema.parse({ id, slug: `test-${id}`, title, operator: "claro", category: "residential", downloadMbps: 500, regularPrice: 129.9, benefits: ["LEGACY PRIVATE BENEFIT"], status: "active", source: "Isolated test", verifiedAt: new Date(Date.now() - 60000).toISOString(), validUntil: new Date(Date.now() + 86400000).toISOString() });
    await client.execute({ sql: "INSERT INTO telecom_offers(id,slug,payload) VALUES(?,?,?)", args: [id, offer.slug, JSON.stringify(offer)] });
    for (const path of ["/", "/planos", "/comparar", "/internet-residencial", "/operadoras/claro", "/tv-e-streaming"]) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).not.toContain(title);
      expect(html).not.toContain("LEGACY PRIVATE BENEFIT");
      expect(html).not.toContain("129,90");
      expect(html).not.toContain('"@type":"Offer"');
    }
    expect((await client.execute({ sql: "SELECT id FROM telecom_offers WHERE id=?", args: [id] })).rows).toHaveLength(1);
  } finally {
    await client.execute({ sql: "DELETE FROM telecom_offers WHERE id=?", args: [id] });
    client.close();
  }
});
