import assert from "node:assert/strict";
import { EDITORIAL_CONTENT_PLAN } from "../lib/editorial/content-plan";
const slugs = new Set<string>();
for (const silo of EDITORIAL_CONTENT_PLAN)
  for (const article of silo.articles) {
    assert(!slugs.has(article.slug), "Slug duplicado: " + article.slug);
    slugs.add(article.slug);
  }
console.log("Plano editorial válido:", slugs.size, "artigos configurados.");
