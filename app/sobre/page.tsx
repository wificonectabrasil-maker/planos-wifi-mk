import Link from "next/link";
import { Breadcrumb, RegionNotice } from "@/components/telecom/Shared";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { staticPageMetadata } from "@/lib/telecom/metadata";
import { mikeProfile } from "@/lib/telecom/team";
import { AuthorCard } from "@/components/site/AuthorCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveSiteUrl } from "@/lib/site/url";
export const metadata = staticPageMetadata("/sobre");
export default function Page() {
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "Person", "@id": `${resolveSiteUrl()}/sobre#mike`, name: mikeProfile.name, jobTitle: mikeProfile.siteRole, description: mikeProfile.shortBio, url: `${resolveSiteUrl()}/sobre#mike`, image: `${resolveSiteUrl()}${mikeProfile.image.src}`, sameAs: mikeProfile.links.filter(link => link.platform !== "whatsapp").map(link => link.href), worksFor: { "@type": "Organization", "@id": `${resolveSiteUrl()}/#organization`, name: "WifiConecta", url: resolveSiteUrl() } }} /><Breadcrumb items={[{ label: "Sobre a WifiConecta", href: "/sobre" }]} /><article className="wifi-prose">
    <div className="wifi-page-intro"><p className="wifi-eyebrow">Por que a WifiConecta existe</p><h1>A gente tira o trabalho chato do pedido de internet.</h1><p>Trabalho, família, compromisso e uma lista de coisas para resolver. Você não deveria precisar virar especialista em operadoras e letras miúdas para colocar internet em casa.</p></div>
    <RegionNotice />
    <h2>Uma pessoa atende você</h2><p>A WifiConecta nasceu para facilitar esse pedido. No WhatsApp, uma pessoa entende sua rotina, consulta as opções comercializadas para seu endereço e explica as condições. Não colocamos um chatbot no lugar do atendimento comercial.</p>
    <h2>Conheça quem faz parte do time</h2>
    <AuthorCard profile={mikeProfile} id="mike" team />
    <h2>Da escolha ao encaminhamento</h2><p>A ideia é ajudar você a conferir o que está incluído, o valor e as regras de cada benefício — inclusive quando a promoção que viu não atende seu endereço. Depois de sua confirmação, a equipe auxilia no encaminhamento do pedido.</p>
    <h2>Não somos a operadora de internet</h2><p>Trabalhamos com opções de Claro, Vivo, TIM e provedores de bairro, conforme disponibilidade. A operadora ou o provedor contratado é responsável pela conexão, instalação, manutenção e faturamento. Citar uma marca não significa ser seu site oficial ou representante autorizado.</p>
    <h2>A oferta de hoje pode mudar amanhã</h2><p>Pacotes variam por endereço, perfil e vigência. As condições atuais são conferidas na conversa. Campanhas publicadas precisam ter revisão, validade e restrições claras; exemplos antigos não viram promessas de menor preço, instalação sempre gratuita ou teste sem custo.</p>
    <h2>Entender antes de contratar também faz parte</h2><p>Os guias estão organizados nos temas <Link prefetch={false} href="/planos-de-internet">Planos e contratação</Link> e <Link prefetch={false} href="/wifi-e-fibra">Wi-Fi e fibra óptica</Link>. Eles explicam dúvidas; a <Link prefetch={false} href="/planos">página de pacotes</Link> apresenta a consulta comercial.</p>
    <div className="wifi-page-actions"><WhatsAppCTA source="about" label="Conversar com uma pessoa da WifiConecta" /><Link prefetch={false} href="/contato" className="wifi-text-link">Ver o canal de contato</Link></div>
    <p><Link prefetch={false} href="/politica-editorial">Política editorial</Link> · <Link prefetch={false} href="/politica-de-afiliados">Transparência comercial</Link> · <Link prefetch={false} href="/politica-de-privacidade">Privacidade</Link></p>
  </article></>;
}
