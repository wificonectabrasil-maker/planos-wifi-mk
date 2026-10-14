import { test, expect } from "@playwright/test";
import { load } from "cheerio";
import { staticPageCopy } from "../lib/telecom/static-page-copy";

test("static acquisition metadata reaches crawlers with distinct search and social calls to action", async ({ request }) => {
  for (const [path, copy] of Object.entries(staticPageCopy)) {
    const response = await request.get(path, { headers: { "user-agent": "Twitterbot/1.0" } });
    expect(response.status(), path).toBe(200);
    const $ = load(await response.text());
    expect($("title").text(), path).toBe(copy.title);
    expect(($("title").text().match(/WifiConecta/gi) ?? []).length).toBeLessThanOrEqual(1);
    expect($('meta[name="description"]').attr("content")).toBe(copy.description);
    expect($('meta[property="og:title"]').attr("content")).toBe(copy.socialTitle);
    expect($('meta[property="og:description"]').attr("content")).toBe(copy.socialDescription);
    expect($('meta[property="og:type"]').attr("content")).toBe("website");
    expect(new URL($('meta[property="og:url"]').attr("content")!).origin).toBe("https://wificonecta.com.br");
    expect(new URL($('link[rel="canonical"]').attr("href")!).pathname).toBe(path);
    const image = $('meta[property="og:image"]').attr("content")!;
    expect(image).toMatch(/^https:\/\/wificonecta.com.br\/social\//);
    expect($('meta[property="og:image:width"]').attr("content")).toBe("1200");
    expect($('meta[property="og:image:height"]').attr("content")).toBe("630");
    expect($('meta[property="og:image:alt"]').attr("content")?.length).toBeGreaterThan(10);
    expect($('meta[name="twitter:card"]').attr("content")).toBe("summary_large_image");
    expect($('meta[name="twitter:title"]').attr("content")).toBe(copy.twitterTitle);
    expect($('meta[name="twitter:description"]').attr("content")).toBe(copy.socialDescription);
    expect($('meta[name="twitter:image"]').attr("content")).toBe(image);
    expect($("h1")).toHaveLength(1);
    expect($("main").text()).toContain("São Paulo");
    expect($("main form, main input, main select")).toHaveLength(0);
  }
});

test("statewide contact, first-screen CTA and interest navigation work from compact mobile to desktop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const foldPaths = ["/", "/planos", "/internet-empresarial", "/internet-para-condominios", "/contato"];
  for (const viewport of [
    { width: 320, height: 844 }, { width: 360, height: 800 }, { width: 390, height: 844 },
    { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1440, height: 900 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of Object.keys(staticPageCopy)) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      const cta = page.locator('main a[href^="https://wa.me/"]').first();
      const box = await cta.boundingBox();
      expect(box!.height, path).toBeGreaterThanOrEqual(44);
      expect(box!.width, path).toBeGreaterThanOrEqual(44);
      if (foldPaths.includes(path) && viewport.height >= 800) {
        expect(box!.y + box!.height, path).toBeLessThanOrEqual(viewport.height);
        await expect(page.locator("main")).toContainText(/capital|CAPITAL/);
        await expect(page.locator("main")).toContainText(/estado|ESTADO|paulistas/);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/planos");
  const nav = page.getByRole("navigation", { name: "Escolha o tipo de pacote" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  for (const id of ["internet-residencial", "internet-celular", "tv-streaming", "internet-camera"]) {
    await nav.locator('a[href="#' + id + '"]').click();
    await expect(page).toHaveURL(new RegExp("#" + id + "$"));
    const card = page.locator("#" + id);
    await expect(card).toBeInViewport();
    expect((await card.boundingBox())!.width).toBeGreaterThan(300);
    await card.getByRole("link").scrollIntoViewIfNeeded();
    expect(await card.getByRole("link").evaluate(el => {
      const box = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  expect(errors).toEqual([]);
});
