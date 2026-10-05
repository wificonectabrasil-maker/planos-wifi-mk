import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { migrate } from "../lib/database/migrate";
import { isCurrentOffer, offerSchema } from "../lib/telecom/catalog";
import { leadSchema, whatsappMessage } from "../lib/telecom/leads";
const base = {
  id: "test-offer",
  slug: "test-offer",
  operator: "claro",
  category: "residential",
  title: "Oferta para teste",
  status: "active",
  regularPrice: 129.9,
  source: "Documento comercial verificado",
  verifiedAt: "2026-10-04T12:00:00.000Z",
  validFrom: "2026-10-01T00:00:00.000Z",
  validUntil: "2026-10-31T23:59:59.000Z",
};
test("only verified, active offers within their window are public", () => {
  const now = new Date("2026-10-04T15:00:00.000Z");
  const offer = offerSchema.parse(base);
  assert.equal(isCurrentOffer(offer, now), true);
  assert.equal(isCurrentOffer({ ...offer, status: "paused" }, now), false);
  assert.equal(isCurrentOffer({ ...offer, status: "draft" }, now), false);
  assert.equal(
    isCurrentOffer({ ...offer, validUntil: now.toISOString() }, now),
    false,
  );
  assert.equal(
    isCurrentOffer({ ...offer, validFrom: "2026-11-01T00:00:00.000Z" }, now),
    false,
  );
  assert.equal(isCurrentOffer({ ...offer, source: "" }, now), false);
  assert.equal(
    isCurrentOffer({ ...offer, verifiedAt: "2026-10-05T00:00:00.000Z" }, now),
    false,
  );
  assert.equal(offerSchema.safeParse({ ...base, source: "" }).success, false);
  assert.equal(
    offerSchema.safeParse({ ...base, validUntil: null }).success,
    false,
  );
  assert.equal(
    offerSchema.safeParse({ ...base, promotionalPrice: 99.9 }).success,
    false,
  );
  assert.equal(
    offerSchema.safeParse({
      ...base,
      promotionalPrice: 99.9,
      promotionalMonths: 3,
    }).success,
    true,
  );
  for (const change of [
    { promotionalPrice: 99.9, promotionalMonths: 0 },
    { promotionalPrice: 99.9, promotionalMonths: 1.5 },
    { promotionalPrice: 149.9, promotionalMonths: 3 },
  ])
    assert.equal(offerSchema.safeParse({ ...base, ...change }).success, false);
});
test("lead validation requires consent and normalizes Brazilian contact data", () => {
  const input = {
    name: "Pessoa de teste",
    phone: "+55 (11) 99999-9999",
    cep: "01310-100",
    service: "residential",
    consent: true,
    sourcePath: "/planos/500-mega",
  };
  const lead = leadSchema.parse(input);
  assert.equal(lead.phone, "11999999999");
  assert.equal(lead.cep, "01310100");
  for (const change of [
    { consent: false },
    { cep: "123" },
    { phone: "999" },
    { website: "spam" },
    { sourcePath: "//external.example" },
  ])
    assert.equal(leadSchema.safeParse({ ...input, ...change }).success, false);
  const message = whatsappMessage(lead, "WC-TEST");
  assert.match(message, /01310-100/);
  assert.match(message, /WC-TEST/);
  assert.ok(!message.includes(lead.phone));
});
test("commercial migration is idempotent and keeps requests private from Core public queries", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await migrate(client);
    await migrate(client);
    const tables = await client.execute(
      "SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE 'telecom_%'",
    );
    assert.equal(tables.rows.length, 3);
    await assert.rejects(
      client.execute(
        "INSERT INTO telecom_leads(id,protocol,name,phone,cep,service,source_path,consent_at,privacy_version,status) VALUES('1','WC-TEST','Teste','11999999999','01310100','residential','/','2026-10-04','2026-10-04','invalid')",
      ),
    );
    const { createDatabase } = await import("../lib/database/query");
    const pub = createDatabase(client, "public");
    await assert.rejects(async () => {
      await pub.from("telecom_leads" as never).select();
    });
  } finally {
    client.close();
  }
});
