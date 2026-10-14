import { test, expect } from "@playwright/test";
const paths = ["/", "/planos", "/internet-empresarial", "/internet-para-condominios", "/planos-de-internet", "/wifi-e-fibra", "/sobre", "/contato"];
test("commercial intent, server HTML and canonical URLs are unique across the eight revised pages", async ({ page, request }) => {
  const titles = new Set<string>();
  const headings = new Set<string>();
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain("wa.me/5511000000000");
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    headings.add((await page.locator("h1").textContent())!);
    titles.add(await page.title());
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://wificonecta.com.br" + (path === "/" ? "" : path));
    await expect(page.locator("main form, main input, main select")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/R\$|119,90|229,90|6 streamings inclusos|120 canais/);
    await expect(page.getByRole("region", { name: "Campanhas vigentes" })).toHaveCount(0);
    expect(html).toContain((await page.locator("h1").innerText()).replace(/\n/g, "<br/>").split("<br/>")[0]);
  }
  expect(titles.size).toBe(paths.length);
  expect(headings.size).toBe(paths.length);
  await page.goto("/");
  await expect(page.locator("#pacotes .wifi-package-card")).toHaveCount(0);
  await page.goto("/planos");
  await expect(page.locator("#pacotes .wifi-package-card")).toHaveCount(4);
  await page.getByText("Preciso informar meu CEP?", { exact: true }).click();
  await expect(page.getByText(/Você informa esses dados voluntariamente/)).toBeVisible();
  const preview = await request.get("/planos", { headers: { host: "preview-example.vercel.app" } });
  expect(preview.headers()["x-robots-tag"]).toContain("noindex");
  expect((await request.get("/campanhas/nao-publicada")).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/campanhas/");
});
test("mobile pages preserve reading width, usable CTAs and distinct resident and manager inquiries", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of paths) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      const cta = page.locator('main a[href^="https://wa.me/"]').first();
      expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.goto("/internet-para-condominios");
  const messages = [];
  for (const label of ["Sou morador e preciso de internet", "Sou síndico ou administrador"]) {
    const href = (await page.getByRole("link", { name: label, exact: true }).getAttribute("href"))!;
    messages.push(new URL(href).searchParams.get("text"));
  }
  expect(messages[0]).toContain("Sou morador");
  expect(messages[1]).toContain("Sou síndico");
  await page.goto("/contato");
  await expect(page.locator(".wifi-contact-interests a")).toHaveCount(6);
});
