import Link from "next/link";
import { connection } from "next/server";
import { wifiCampaigns } from "@/lib/telecom/campaigns.config";
import { currentCampaigns, formatCampaignDate, formatCampaignMoney, type PublicCampaign } from "@/lib/telecom/campaigns";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { CampaignExpiry } from "./CampaignExpiry";

export async function CampaignSlot({ placement }: { placement: "home" | "plans" }) {
  if (!wifiCampaigns.length) return null;
  // Once campaigns exist, validate dates on every request instead of caching an expired banner.
  await connection();
  const campaigns = currentCampaigns(wifiCampaigns).slice(0, placement === "home" ? 1 : 3);
  if (!campaigns.length) return null;
  return <section className="wifi-section wifi-container" aria-label="Campanhas vigentes">
    <h2>Campanhas com condições confirmadas</h2>
    {campaigns.map(campaign => <CampaignExpiry key={campaign.id} endsAt={campaign.endsAt}><CampaignDetails campaign={campaign} compact /></CampaignExpiry>)}
  </section>;
}
export function CampaignDetails({ campaign: c, compact = false }: { campaign: PublicCampaign; compact?: boolean }) {
  return <article className="wifi-campaign"><h2>{c.title}</h2><p><strong>{c.operator}</strong> · {c.composition}</p>
    {c.priceCents !== null ? <p className="wifi-campaign-price">{formatCampaignMoney(c.priceCents)}/mês{c.promotionalMonths !== null ? " por " + c.promotionalMonths + " meses" : ""}</p> : <p>Preço atual: consulte na conversa.</p>}
    {c.afterPromotionCents !== null ? <p>Depois do desconto: {formatCampaignMoney(c.afterPromotionCents)}/mês.</p> : null}
    <p>Válida de <time dateTime={c.startsAt}>{formatCampaignDate(c.startsAt)}</time> até <time dateTime={c.endsAt}>{formatCampaignDate(c.endsAt)}</time> (horário de São Paulo).</p>
    <dl><dt>Elegibilidade e cobertura</dt><dd>{c.eligibility}</dd><dt>Instalação e taxas</dt><dd>{c.installation}</dd><dt>Fidelidade</dt><dd>{c.fidelity}</dd><dt>Primeira cobrança</dt><dd>{c.firstInvoice}</dd></dl>
    <ul>{c.restrictions.map(note => <li key={note}>{note}</li>)}</ul>
    <WhatsAppCTA source="campaign" category={c.category} campaignId={c.id} interest={"Campanha " + c.id + ": " + c.title} label="Consultar esta campanha no WhatsApp" />
    {compact ? <Link prefetch={false} href={"/campanhas/" + c.slug} className="wifi-text-link">Ver detalhes da campanha</Link> : null}
  </article>;
}
