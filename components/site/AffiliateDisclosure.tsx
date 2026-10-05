import { AMAZON_AFFILIATE_DISCLOSURE } from "@/lib/site";

export function AffiliateDisclosure() {
  return (
    <div className="brand-card rounded-xl p-4 text-xs text-(--muted)">
      <p className="font-medium text-(--ink)">Aviso de afiliados</p>
      <p className="mt-1">{AMAZON_AFFILIATE_DISCLOSURE}</p>
    </div>
  );
}

