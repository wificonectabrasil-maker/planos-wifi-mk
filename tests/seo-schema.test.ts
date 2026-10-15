import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { JsonLd } from "../components/seo/JsonLd";
import { buildPostContentJsonLd } from "../lib/seo/post-content-schema";

const canonical = "https://wificonecta.com.br/wifi-e-fibra/guia";

test("CMS strings cannot close the JSON-LD script or add executable markup", () => {
  const data = { "@type": "Article", headline: '</script><script>alert("xss")</script><div id="injected">', description: "Fibra < Wi-Fi & internet" };
  const html = renderToStaticMarkup(createElement(JsonLd, { data }));
  const $ = load(html);
  assert.equal($("script").length, 1);
  assert.equal($("#injected").length, 0);
  assert.deepEqual(JSON.parse($("script").html()!), data);
});

test("an ordinary article does not invent reviews, video dates or ranked lists from its title", () => {
  const source = {
    title: "Como melhorar o Wi-Fi: melhores dicas",
    schema_type: "review",
    amazon_products: [{ title: "Produto não publicado", rating: 4.8 }],
  };
  const html = '<p>Confira as dicas.</p><ul><li>Reinicie o roteador</li><li>Confira os cabos</li></ul><iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>';
  assert.deepEqual(buildPostContentJsonLd(source, html, canonical), []);
});

test("FAQ markup contains only complete answers that readers can find in the article", () => {
  const source = {
    title: "Fibra e Wi-Fi",
    faq_json: [
      { question: "Fibra & Wi-Fi?", answer: "São conexões diferentes." },
      { question: "Qual o preço?", answer: "R$ 10 por mês." },
      { question: "Dado privado?", answer: "Não deve aparecer." },
      { question: "Campo inválido?", answer: 123 },
    ],
  };
  const html = '<h2>Fibra &amp; <strong>Wi-Fi</strong>?</h2><p>São conexões diferentes.</p><section hidden><h2>Dado privado?</h2><p>Não deve aparecer.</p></section>';
  const [faq] = buildPostContentJsonLd(source, html, canonical, { allowAutomaticFaq: false });
  assert.equal(faq["@type"], "FAQPage");
  assert.deepEqual(faq.mainEntity, [{ "@type": "Question", name: "Fibra & Wi-Fi?", acceptedAnswer: { "@type": "Answer", text: "São conexões diferentes." } }]);
});

test("automatic FAQ extraction honors the brand option and excludes nonvisible content", () => {
  const html = '<h2>Como conectar?</h2><p>Use o cabo.</p><div style="display: none !important"><h2>Oculto?</h2><p>Resposta oculta.</p></div>';
  assert.deepEqual(buildPostContentJsonLd({ title: "Guia" }, html, canonical, { allowAutomaticFaq: false }), []);
  const [faq] = buildPostContentJsonLd({ title: "Guia" }, html, canonical);
  assert.equal((faq.mainEntity as unknown[]).length, 1);
  assert.equal(JSON.stringify(faq).includes("Oculto"), false);
});

test("HowTo requires every stored step to match the displayed instructions", () => {
  const source = {
    title: "Como conectar",
    schema_type: "howto",
    howto_json: [{ name: "Conecte o cabo", text: "Ligue o cabo à porta LAN." }, { name: "Confira a conexão", text: "Abra uma página." }],
  };
  const firstStep = "<h2>Conecte o cabo</h2><p>Ligue o cabo à porta LAN.</p>";
  assert.deepEqual(buildPostContentJsonLd(source, firstStep, canonical), []);
  const [howTo] = buildPostContentJsonLd(source, firstStep + "<h2>Confira a conexão</h2><p>Abra uma página.</p>", canonical);
  assert.equal(howTo["@type"], "HowTo");
  assert.equal((howTo.step as unknown[]).length, 2);
});

test("only visible product cards with a real price and link produce offers without invented ratings", () => {
  const html = `<div data-type="affiliate-product" data-title="Roteador" data-price="R$ 1.299,90" data-url="https://example.com/roteador" data-rating="4.8">
    <img src="/media/roteador.webp" alt="Roteador"><h3>Roteador</h3><p>R$ 1.299,90</p><p>Rating 4.8</p><a href="https://example.com/roteador">Ver preço</a>
    </div>
    <div data-type="affiliate-product" data-title="Indisponível" data-price="R$ --" data-url="https://example.com/outro"><h3>Indisponível</h3><p>R$ --</p><a href="https://example.com/outro">Ver preço</a></div>
    <div data-type="affiliate-product" data-title="Não exibido" data-price="R$ 1,00" data-url="https://example.com/invisivel" hidden><h3>Não exibido</h3><p>R$ 1,00</p><a href="https://example.com/invisivel">Ver preço</a></div>`;
  const [product, ...others] = buildPostContentJsonLd({ title: "Roteadores", schema_type: "review" }, html, canonical);
  assert.equal(others.length, 0);
  assert.equal(product["@type"], "Product");
  assert.deepEqual(product.offers, { "@type": "Offer", url: "https://example.com/roteador", priceCurrency: "BRL", price: "1299.90" });
  assert.deepEqual(product.image, ["https://wificonecta.com.br/media/roteador.webp"]);
  assert.equal("aggregateRating" in product, false);
  assert.equal("review" in product, false);
});
