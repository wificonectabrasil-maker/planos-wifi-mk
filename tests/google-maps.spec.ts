import { test, expect } from "@playwright/test";
import { load } from "cheerio";

const mapsUrl = "https://www.google.com/maps?cid=4276303967527817866";
const organizationId = "https://wificonecta.com.br/#organization";

test("Maps identifies the existing organization without creating a physical business", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const $ = load(await response.text());
  const nodes = $('script[type="application/ld+json"]').toArray().flatMap(element => {
    const data = JSON.parse($(element).text());
    return data["@graph"] ?? (Array.isArray(data) ? data : [data]);
  });
  const organizations = nodes.filter(node => node["@type"] === "Organization");
  expect(organizations).toHaveLength(1);
  const organization = organizations[0];
  expect(organization).toMatchObject({
    "@id": organizationId,
    name: "WifiConecta",
    url: "https://wificonecta.com.br",
    areaServed: { "@type": "State", name: "São Paulo" },
  });
  expect(organization.sameAs).toContain(mapsUrl);
  expect(organization.sameAs).toContain("https://www.instagram.com/wifi_pedeaqui/");
  expect(new Set(organization.sameAs).size).toBe(organization.sameAs.length);
  for (const key of ["address", "geo", "hasMap", "openingHours", "openingHoursSpecification", "aggregateRating", "review"])
    expect(organization).not.toHaveProperty(key);
  expect(nodes.some(node => node["@type"] === "LocalBusiness")).toBe(false);
  expect(nodes.filter(node => node["@type"] === "WebSite")).toHaveLength(1);

  const about = load(await (await request.get("/sobre")).text());
  const person = about('script[type="application/ld+json"]').toArray()
    .map(element => JSON.parse(about(element).text())).find(node => node["@type"] === "Person");
  expect(person.worksFor["@id"]).toBe(organizationId);
  expect(person.name).toBe("Mike");
});

test("contact and footer expose accessible profile links and a regional map without a business pin", async ({ page }) => {
  await page.goto("/contato");
  const section = page.locator("#wifi-maps");
  const contactLink = section.getByRole("link", { name: "Ver nosso perfil no Google Maps (abre em nova aba)", exact: true });
  const footerLink = page.getByRole("contentinfo").getByRole("link", { name: "Ver no Google Maps (abre em nova aba)", exact: true });
  await expect(section.getByRole("heading", { name: "WifiConecta em São Paulo", exact: true })).toBeVisible();
  await expect(section).toContainText("Nosso atendimento é inteiramente pelo WhatsApp.");
  const map = page.getByRole("region", { name: "Área de atendimento da WifiConecta", exact: true }).locator("iframe");
  await expect(page.locator('iframe[src*="google"], iframe[src*="maps"]')).toHaveCount(1);
  await expect(map).toHaveAttribute("title", "Mapa da região de São Paulo — atendimento remoto da WifiConecta");
  await expect(map).toHaveAttribute("loading", "lazy");
  const mapUrl = new URL((await map.getAttribute("src"))!);
  expect(mapUrl.origin).toBe("https://www.google.com");
  expect(mapUrl.pathname).toBe("/maps/embed");
  expect(mapUrl.searchParams.get("pb")).not.toMatch(/4276303967527817866|0x3b587bcd3816d28a|WifiConecta/);
  for (const link of [contactLink, footerLink]) {
    await expect(link).toHaveAttribute("href", mapsUrl);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
  }
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const link of [contactLink, footerLink]) {
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await link.focus();
      await expect(link).toBeFocused();
      expect(await link.evaluate(element => getComputedStyle(element).outlineStyle)).toBe("solid");
    }
    await contactLink.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/maps-contact-${width}.png` });
    await footerLink.scrollIntoViewIfNeeded();
    expect((await map.boundingBox())!.width).toBeGreaterThanOrEqual(200);
    expect((await map.boundingBox())!.height).toBeGreaterThanOrEqual(200);
    await map.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/maps-footer-${width}.png` });
  }
  await page.goto("/sobre");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Ver no Google Maps (abre em nova aba)", exact: true })).toHaveAttribute("href", mapsUrl);
  await expect(page.getByRole("heading", { name: "Não somos a operadora de internet", exact: true })).toBeVisible();
});
