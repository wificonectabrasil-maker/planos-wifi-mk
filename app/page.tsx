import { ArrowRight, Camera, House, MonitorPlay, Smartphone } from "lucide-react";
import Link from "next/link";
import { EditorialSiloCards } from "@/components/telecom/EditorialSiloCards";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { HeroVideoBackground } from "@/components/telecom/HeroVideoBackground";
import { ContractProcess, FinalCTA, TrustStrip } from "@/components/telecom/Shared";
import { ContentSection, EditorialResources, TransparencyNote } from "@/components/telecom/CommercialContent";
import { CampaignSlot } from "@/components/telecom/CampaignSlot";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveSiteUrl } from "@/lib/site/url";
import { staticPageMetadata } from "@/lib/telecom/metadata";
export const revalidate = 3600;
export const metadata = staticPageMetadata("/");
const categories = [
  { icon: House, title: "Só internet pra casa", text: "Conectar a casa sem juntar serviços que você não usa.", href: "/planos#internet-residencial" },
  { icon: Smartphone, title: "Internet + celular", text: "Confira se juntar a conexão de casa e os dados da rua compensa.", href: "/planos#internet-celular" },
  { icon: MonitorPlay, title: "Internet + TV e streaming", text: "Converse sobre o que sua família gosta de assistir.", href: "/planos#tv-streaming" },
  { icon: Camera, title: "Internet + câmera", text: "Consulte opções para acompanhar a casa pelo celular.", href: "/planos#internet-camera" },
];
export default function Home() {
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@graph": [
      { "@type": "Organization", "@id": resolveSiteUrl() + "/#organization", name: "WifiConecta", url: resolveSiteUrl(), logo: resolveSiteUrl() + "/brand-logo.svg", areaServed: { "@type": "State", name: "São Paulo" } },
      { "@type": "WebSite", name: "WifiConecta", url: resolveSiteUrl(), inLanguage: "pt-BR" },
    ] }} />
    <link rel="preload" as="image" href="/images/hero-claro-poster.webp" fetchPriority="high" />
    <section className="wifi-hero wifi-hero-with-video">
      <HeroVideoBackground />
      <div className="wifi-container wifi-hero-grid wifi-hero-video-layout"><div className="wifi-hero-copy">
        <p className="wifi-eyebrow"><span className="wifi-eyebrow-dot" /> SÃO PAULO CAPITAL E ESTADO</p>
        <h1>Internet pra sua casa.<br /><em>Sem virar uma novela.</em></h1>
        <p className="wifi-hero-description">Quer instalar internet ou mudar de operadora? Consulte pacotes e promoções para seu endereço com a ajuda de uma pessoa.</p>
        <div className="wifi-hero-actions">
          <WhatsAppCTA source="hero" interest="Internet para minha casa" category="internet" className="wifi-hero-whatsapp" label="Consultar promoções no WhatsApp" fallbackLabel="Atendimento pelo WhatsApp" />
          <p className="wifi-whatsapp-note">Atendimento humano. Consulta sem compromisso.</p>
          <p className="wifi-hero-operators">Claro, Vivo, TIM e provedores regionais, conforme disponibilidade.</p>
          <Link prefetch={false} href="/#como-funciona" className="wifi-text-link">Veja como funciona <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div></div>
    </section>
    <TrustStrip />
    <section className="wifi-categories wifi-container">
      <div className="wifi-section-heading"><div><p className="wifi-eyebrow">Sua rotina vem primeiro</p><h2>O que você quer conectar?</h2><p>O pacote depende do que você usa e do que está disponível onde mora.</p></div></div>
      <div className="wifi-category-grid">{categories.map(c => <Link prefetch={false} href={c.href} key={c.href} className="wifi-category-card"><span><c.icon size={25} aria-hidden="true" /></span><div><h3>{c.title}</h3><p>{c.text}</p></div><ArrowRight size={17} aria-hidden="true" /></Link>)}</div>
      <div className="wifi-home-business"><Link prefetch={false} href="/internet-empresarial">Internet para sua empresa <ArrowRight size={16} aria-hidden="true" /></Link><Link prefetch={false} href="/internet-para-condominios">Atendimento para condomínios <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </section>
    <ContentSection title="A gente não escolhe só pelo número de Mega"><p>São tantos anúncios, preços diferentes e letras miúdas que pedir internet vira mais uma tarefa na agenda. A WifiConecta começa pela sua necessidade e pela disponibilidade do endereço.</p><p>Trabalhamos com opções de Claro, Vivo, TIM e provedores de bairro, conforme disponibilidade. Uma pessoa ajuda a conferir mensalidade, benefícios e regras entre as opções comercializadas. Você decide com as informações em mãos.</p><Link prefetch={false} href="/planos" className="wifi-text-link">Conhecer as modalidades e consultar pacotes <ArrowRight size={16} aria-hidden="true" /></Link></ContentSection>
    <CampaignSlot placement="home" />
    <ContractProcess />
    <ContentSection title="As promoções mudam. A explicação vem antes do pedido."><p>O benefício dura quanto tempo? Tem taxa de instalação? Quando chega a primeira cobrança? Essas respostas fazem parte da conversa, antes de solicitar o serviço.</p><p>Algumas ofertas elegíveis podem ter instalação gratuita e cobrança inicial aproximadamente um mês após a instalação. A equipe confirma a regra da proposta e do contrato para o seu caso.</p><TransparencyNote /></ContentSection>
    <section className="wifi-section wifi-container"><div className="wifi-section-heading"><div><p className="wifi-eyebrow">Prefere entender primeiro?</p><h2>Escolha o assunto. Siga no seu ritmo.</h2><p>Guias sobre contratação e qualidade da conexão, organizados por tema.</p></div></div><EditorialSiloCards /></section>
    <EditorialResources slugs={["como-escolher-plano-internet-residencial", "operadoras-internet-no-meu-cep", "fibra-optica-cabo-internet-sem-fio"]} />
    <FinalCTA />
  </>;
}
