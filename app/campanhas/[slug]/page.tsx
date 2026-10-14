import { notFound, permanentRedirect } from "next/navigation";
import { wifiCampaigns } from "@/lib/telecom/campaigns.config";
import { currentCampaigns } from "@/lib/telecom/campaigns";
import { CampaignDetails } from "@/components/telecom/CampaignSlot";
import { CampaignExpiry } from "@/components/telecom/CampaignExpiry";
import { Breadcrumb } from "@/components/telecom/Shared";
import { TransparencyNote } from "@/components/telecom/CommercialContent";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = currentCampaigns(wifiCampaigns).find(campaign => campaign.slug === slug);
  return { ...telecomMetadata(c?.title ?? "Campanha", c?.composition ?? "Consulte as opções atuais com a WifiConecta.", "/campanhas/" + slug), robots: { index: false, follow: true } };
}
export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const known = wifiCampaigns.find(campaign => campaign.slug === slug);
  if (!known) notFound();
  const campaign = currentCampaigns([known])[0];
  if (!campaign) permanentRedirect("/planos");
  return <div className="wifi-container"><Breadcrumb items={[{ label: "Pacotes", href: "/planos" }, { label: campaign.title, href: "/campanhas/" + slug }]} />
    <header className="wifi-page-intro"><p className="wifi-eyebrow">WifiConecta · atendimento humano em São Paulo</p><h1>{campaign.title}</h1><p>Confira a composição e as condições. A consulta confirma a elegibilidade para o seu endereço; o pedido só é encaminhado com sua autorização.</p></header>
    <CampaignExpiry endsAt={campaign.endsAt}><CampaignDetails campaign={campaign} /></CampaignExpiry>
    <section className="wifi-section"><h2>Da consulta à instalação</h2><p>Uma pessoa verifica a disponibilidade, explica a proposta e ajuda a encaminhar o pedido. Instalação, suporte e faturamento ficam com a prestadora contratada.</p><TransparencyNote /></section>
  </div>;
}
