import { test } from "node:test";
import assert from "node:assert/strict";
import { load } from "cheerio";
import { inferEditorLinkType, isAmazonUrl, isInternalSiteHref } from "../lib/links/classification";
import { importContentorHtml } from "../lib/editor/contentorImport";
import { extractLinksFromContent } from "../lib/seo/extractLinksFromContent";
import { renderEditorDocToHtml } from "../lib/editor/docRenderer";

const site = "https://wificonecta.com.br";
const internal = site + "/planos-de-internet/como-escolher-plano-internet-residencial";
const external = "https://www.gov.br/anatel/pt-br/consumidor/pesquisa";

test("Amazon detection checks the actual host instead of a.co substrings", () => {
  for (const href of ["https://amazon.com.br/dp/123", "https://www.amazon.com/dp/123", "https://smile.amazon.co.uk/item", "https://amzn.to/abc", "https://a.co/abc", "//www.amazon.de/item"]) assert.equal(isAmazonUrl(href), true, href);
  for (const href of [internal, external, "/amazon.com.br/item", "https://example.com/?url=https://a.co/abc", "https://a.co.evil.test/item", "https://amazon.com.br.evil.test/item", "https://notamazon.com/item", "https://amazon.com@evil.test/item", "mailto:test@amazon.com"]) assert.equal(isAmazonUrl(href), false, href);
});

test("canonical absolute links and relative links are internal while semantic external links stay external", () => {
  for (const href of [internal, "/planos", "#secao", "//www.wificonecta.com.br/planos", "https://www.wificonecta.com.br/planos"]) assert.equal(isInternalSiteHref(href, site), true, href);
  for (const href of [external, "//example.com/planos", "https://wificonecta.com.br.evil.test/planos", "mailto:contato@example.com", ""]) assert.equal(isInternalSiteHref(href, site), false, href);
  assert.equal(inferEditorLinkType({ "data-link-type": "affiliate", rel: "sponsored nofollow" }, internal, site), "internal");
  assert.equal(inferEditorLinkType({ "data-entity": "mention", rel: "mention" }, external, site), "mention");
  assert.equal(inferEditorLinkType({ "data-entity": "about", rel: "about" }, external, site), "about");
});

test("HTML import and rendering preserve external Mention while clearing false affiliation on site links", () => {
  const html = '<p>Veja <a href="' + internal + '" data-link-type="affiliate" target="_blank" rel="sponsored nofollow">necessidade e condições</a> e <a href="' + external + '" data-link-type="mention" data-entity="mention" data-entity-type="mention" rel="mention noopener noreferrer" target="_blank">pesquisa da Anatel</a>.</p>';
  const imported = importContentorHtml(html);
  const $ = load(renderEditorDocToHtml(imported.doc));
  const own = $('a').filter((_i, el) => $(el).attr('href') === internal);
  assert.equal(own.attr('data-link-type'), "internal");
  assert.equal(own.attr('rel'), undefined);
  assert.equal(own.attr('target'), undefined);
  const mention = $('a').filter((_i, el) => $(el).attr('href') === external);
  assert.equal(mention.attr('data-link-type'), "mention");
  assert.equal(mention.attr('data-entity'), "mention");
  assert.equal(mention.attr('rel'), "mention noopener noreferrer");
  assert.equal(mention.attr('target'), "_blank");
});

test("link audits separate external mentions from internal URLs without false Amazon flags", () => {
  const html = '<p><a href="' + internal + '">pilar</a> <a href="' + external + '" rel="mention">Anatel</a> <a href="//example.com/externo">externo relativo ao protocolo</a></p>';
  const links = extractLinksFromContent(html, { siteUrl: site, siloSlug: "planos-de-internet" });
  assert.deepEqual(links.map(link => [link.isInternal, link.isAmazon]), [[true, false], [false, false], [false, false]]);
  const jsonLinks = extractLinksFromContent(importContentorHtml(html).doc, { siteUrl: site });
  assert.deepEqual(jsonLinks.map(link => [link.isInternal, link.isAmazon]), [[true, false], [false, false], [false, false]]);
});
