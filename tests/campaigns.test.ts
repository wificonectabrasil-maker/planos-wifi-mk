import assert from "node:assert/strict";
import { test } from "node:test";
import { currentCampaigns } from "../lib/telecom/campaigns";
import { safeAttribution } from "../lib/telecom/attribution";
import { publicIndexingAllowed } from "../lib/site/indexing";
const now = new Date("2026-10-14T15:00:00.000Z");
const campaign = {
  id: "isolated-test", slug: "isolated-test", status: "active", title: "Campanha de teste isolado",
  operator: "Operadora teste", category: "internet_celular", composition: "Conexão e celular",
  eligibility: "Endereços elegíveis em São Paulo", installation: "Taxas descritas na proposta",
  fidelity: "Permanência descrita no contrato", firstInvoice: "Conforme ciclo da prestadora",
  restrictions: ["Benefícios sujeitos às modalidades descritas na proposta"],
  priceCents: 10000, afterPromotionCents: 12000, promotionalMonths: 3,
  startsAt: "2026-10-13T00:00:00-03:00", endsAt: "2026-10-15T00:00:00-03:00",
  reviewedAt: "2026-10-14T10:00:00-03:00", evidenceId: "PRIVATE-DOCUMENT", reviewedBy: "PRIVATE-REVIEWER",
  commercialIdentityConfirmed: true, verified: true,
};
test("only documented, reviewed active campaigns inside their time window become public", () => {
  assert.equal(currentCampaigns([campaign], now).length, 1);
  for (const changes of [
    { status: "draft" }, { status: "verified" }, { status: "paused" }, { status: "expired" },
    { verified: false }, { commercialIdentityConfirmed: false }, { evidenceId: "" },
    { reviewedBy: "" }, { reviewedAt: "2026-10-15T12:00:00Z" }, { reviewedAt: "2026-08-01T12:00:00Z" },
    { startsAt: "2026-10-15T00:00:00Z" }, { endsAt: now.toISOString() },
    { eligibility: "" }, { installation: "" }, { fidelity: "" }, { firstInvoice: "" }, { restrictions: [] },
    { afterPromotionCents: null }, { promotionalMonths: null }, { priceCents: -10 }, { priceCents: "100" },
  ]) assert.deepEqual(currentCampaigns([{ ...campaign, ...changes }], now), [], JSON.stringify(changes));
  assert.deepEqual(currentCampaigns([null, {}, "untrusted"], now), []);
});
test("price is optional and public campaign data excludes internal evidence", () => {
  const result = currentCampaigns([{ ...campaign, priceCents: null, afterPromotionCents: null, promotionalMonths: null }], now)[0];
  assert.equal(result.priceCents, null);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|evidenceId|reviewedBy/);
  assert.deepEqual(currentCampaigns([campaign], new Date(campaign.endsAt)), []);
});
test("click attribution accepts reviewed identifiers and discards arbitrary or personal parameters", () => {
  assert.deepEqual(safeAttribution("?utm_source=google&utm_medium=cpc&utm_campaign=approved-id&email=private%40example.com&cep=01310100&phone=11999999999", "approved-id"), {
    utm_source: "google", utm_medium: "cpc", utm_campaign: "approved-id",
  });
  assert.deepEqual(safeAttribution("?utm_source=private%40example.com&utm_campaign=11999999999&utm_term=meu-endereco&utm_content=texto-livre"), {});
});
test("preview and an unconfirmed launch stay noindex, while explicit production launch can index", () => {
  const previous = [process.env.VERCEL_ENV, process.env.NEXT_PUBLIC_ALLOW_INDEXING];
  try {
    delete process.env.VERCEL_ENV; delete process.env.NEXT_PUBLIC_ALLOW_INDEXING;
    assert.equal(publicIndexingAllowed(), false);
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "true";
    assert.equal(publicIndexingAllowed(), true);
    process.env.VERCEL_ENV = "preview";
    assert.equal(publicIndexingAllowed(), false);
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "false";
    assert.equal(publicIndexingAllowed(), false);
  } finally {
    ["VERCEL_ENV", "NEXT_PUBLIC_ALLOW_INDEXING"].forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i];
    });
  }
});
