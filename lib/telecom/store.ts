import "server-only";
import { getTursoClient } from "@/lib/database/client";
import { isCurrentOffer, offerSchema, type InternetOffer } from "./catalog";
export async function listOffers(publicOnly = true): Promise<InternetOffer[]> {
  const result = await getTursoClient().execute(
    "SELECT payload FROM telecom_offers ORDER BY updated_at DESC",
  );
  const parsed = result.rows.flatMap((row) => {
    try {
      const offer = offerSchema.safeParse(JSON.parse(String(row.payload)));
      return offer.success ? [offer.data] : [];
    } catch {
      return [];
    }
  });
  return publicOnly ? parsed.filter((offer) => isCurrentOffer(offer)) : parsed;
}
export async function saveOffer(input: InternetOffer) {
  const offer = offerSchema.parse(input);
  await getTursoClient().execute({
    sql: "INSERT INTO telecom_offers(id, slug, payload) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, payload=excluded.payload, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')",
    args: [offer.id, offer.slug, JSON.stringify(offer)],
  });
}
