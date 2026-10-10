import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { migrate } from "../lib/database/migrate";
import { setupWifiEditorialSilos, retiredEditorialSlugs } from "../lib/telecom/editorial-setup";
import { wifiEditorialPlan } from "../lib/telecom/editorial-plan";
import { buildCanonicalUrl, buildPostCanonicalPath, buildSiloCanonicalPath } from "../lib/seo/canonical";
import { resolveSiteUrl } from "../lib/site/url";
import { extractLinksFromContent } from "../lib/seo/extractLinksFromContent";

test("editorial setup is idempotent and preserves previous silos and drafts without creating articles", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await migrate(client);
    for (const slug of retiredEditorialSlugs) await client.execute({ sql: "INSERT INTO silos(name,slug) VALUES(?,?)", args: [slug, slug] });
    await client.execute("INSERT INTO posts(title,slug) VALUES('Rascunho preservado','rascunho-preservado')");
    await setupWifiEditorialSilos(client);
    const before = await client.execute("SELECT id,slug,is_active,show_in_navigation FROM silos ORDER BY slug");
    await setupWifiEditorialSilos(client);
    assert.deepEqual((await client.execute("SELECT id,slug,is_active,show_in_navigation FROM silos ORDER BY slug")).rows, before.rows);
    assert.equal(before.rows.filter(row => row.is_active === 1).length, 2);
    assert.equal(before.rows.filter(row => row.is_active === 0).length, 5);
    assert.equal((await client.execute("SELECT COUNT(*) AS n FROM posts")).rows[0].n, 1);
    assert.equal((await client.execute("SELECT published FROM posts WHERE slug='rascunho-preservado'")).rows[0].published, 0);
  } finally { client.close(); }
});

test("editorial migration refuses to hide a legacy silo with posts and rolls back", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await migrate(client);
    await client.execute("INSERT INTO silos(id,name,slug) VALUES('legacy','Contratação','contratacao')");
    await client.execute("INSERT INTO posts(title,slug,silo_id) VALUES('Conteúdo útil','conteudo-util','legacy')");
    await assert.rejects(setupWifiEditorialSilos(client), /Há posts vinculados/);
    assert.equal((await client.execute("SELECT COUNT(*) AS n FROM silos")).rows[0].n, 1);
    assert.equal((await client.execute("SELECT is_active FROM silos WHERE id='legacy'")).rows[0].is_active, 1);
  } finally { client.close(); }
});

test("15 briefs have distinct keywords and resolve to the chosen hierarchy in SEO and link auditing", () => {
  assert.deepEqual(wifiEditorialPlan.map(silo => silo.articles.length), [8, 7]);
  const articles = wifiEditorialPlan.flatMap(silo => silo.articles);
  assert.equal(new Set(articles.map(article => article.slug)).size, 15);
  assert.equal(new Set(articles.map(article => article.primaryKeyword)).size, 15);
  for (const silo of wifiEditorialPlan) {
    assert.equal(silo.articles.filter(article => article.role === "PILLAR").length, 1);
    for (const article of silo.articles) {
      for (const link of article.expectedLinks) assert(silo.articles.some(target => target.slug === link.targetSlug));
    }
  }
  assert.equal(buildSiloCanonicalPath("planos-de-internet"), "/planos-de-internet");
  assert.equal(buildPostCanonicalPath("planos-de-internet", "guia"), "/planos-de-internet/guia");
  assert.equal(buildPostCanonicalPath("wifi-e-fibra", "guia"), "/wifi-e-fibra/guia");
  assert.equal(buildPostCanonicalPath("outro-tema", "guia"), "/outro-tema/guia");
  const links = extractLinksFromContent('<p><a href="/planos-de-internet/guia">Comparar condições</a><a href="/planos-de-internet-outro/guia">Outro</a></p>', { siloSlug: "planos-de-internet" });
  assert.equal(links[0].isSiloInternal, true);
  assert.equal(links[1].isSiloInternal, false);
});

test("canonical domain stays on WifiConecta despite local, preview and environment origins", () => {
  const keys = ["SITE_URL", "NEXT_PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;
  const previous = keys.map(key => process.env[key]);
  try {
    process.env.SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SITE_URL = "https://outro-dominio.example";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "planos-wifi-mk.vercel.app";
    process.env.VERCEL_URL = "deploy-preview.vercel.app";
    assert.equal(resolveSiteUrl(), "https://wificonecta.com.br");
    assert.equal(buildCanonicalUrl(resolveSiteUrl(), buildPostCanonicalPath("planos-de-internet", "guia")!), "https://wificonecta.com.br/planos-de-internet/guia");
    assert.equal(buildCanonicalUrl(resolveSiteUrl(), "/wifi-e-fibra/guia?utm_source=teste#secao"), "https://wificonecta.com.br/wifi-e-fibra/guia");
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
