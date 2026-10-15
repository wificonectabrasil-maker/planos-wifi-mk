import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPublicSitemap } from "../lib/seo/sitemap";
import { metadata as collaboratorsMetadata } from "../app/colaboradores/page";
import { metadata as affiliatesMetadata } from "../app/afiliados/page";

const siteUrl = "https://wificonecta.com.br";

test("sitemap omits empty hubs and never invents a modification date", () => {
  const input = {
    siteUrl,
    staticPaths: ["/", "/contato", "/contato/"],
    silos: [{ slug: "planos-de-internet" }, { slug: "wifi-e-fibra" }],
    posts: [{ silo: "planos-de-internet", slug: "guia", lastModified: null }],
  };
  const entries = buildPublicSitemap(input);
  assert.deepEqual(entries.map(entry => entry.url), [
    `${siteUrl}/`, `${siteUrl}/contato`, `${siteUrl}/planos-de-internet/guia`, `${siteUrl}/planos-de-internet`,
  ]);
  assert.ok(entries.every(entry => !("lastModified" in entry)));
  assert.deepEqual(buildPublicSitemap(input), entries);
});

test("sitemap uses real article dates, deduplicates canonicals and excludes nonpublic silos", () => {
  const entries = buildPublicSitemap({
    siteUrl: `${siteUrl}/`,
    staticPaths: ["/"],
    silos: [{ slug: "planos-de-internet" }],
    posts: [
      { silo: "planos-de-internet", slug: "guia", lastModified: "2026-10-13T10:00:00Z" },
      { silo: "/planos-de-internet/", slug: "/guia/", lastModified: "2026-10-14T10:00:00Z" },
      { silo: "planos-de-internet", slug: "outro-guia", lastModified: "invalid" },
      { silo: "silo-inativo", slug: "oculto", lastModified: "2026-10-15T10:00:00Z" },
    ],
  });
  assert.equal(entries.length, 4);
  const article = entries.find(entry => entry.url === `${siteUrl}/planos-de-internet/guia`)!;
  const hub = entries.find(entry => entry.url === `${siteUrl}/planos-de-internet`)!;
  assert.equal(new Date(article.lastModified!).toISOString(), "2026-10-14T10:00:00.000Z");
  assert.deepEqual(hub.lastModified, article.lastModified);
  assert.ok(!("lastModified" in entries.find(entry => entry.url.endsWith("/outro-guia"))!));
  assert.ok(entries.every(entry => new URL(entry.url).origin === siteUrl));
});

test("collaborators metadata has its own canonical and social URL", () => {
  assert.deepEqual(collaboratorsMetadata.alternates, { canonical: "/colaboradores" });
  assert.equal(collaboratorsMetadata.openGraph?.url, "/colaboradores");
  assert.ok(collaboratorsMetadata.description);
  assert.ok(collaboratorsMetadata.twitter);
});

test("affiliates metadata retains a social image when overriding the layout Open Graph metadata", () => {
  assert.deepEqual(affiliatesMetadata.alternates, { canonical: "/afiliados" });
  assert.equal(affiliatesMetadata.openGraph?.url, "/afiliados");
  const images = affiliatesMetadata.openGraph?.images;
  assert.ok(Array.isArray(images) && images.length > 0);
  assert.ok(typeof images[0] === "object" && "url" in images[0]);
  assert.equal(String(images[0].url), `${siteUrl}/opengraph-image`);
  assert.ok(affiliatesMetadata.twitter?.images);
});
