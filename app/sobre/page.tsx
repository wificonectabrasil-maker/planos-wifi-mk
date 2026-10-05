import Link from "next/link";
import { Breadcrumb, RegionNotice } from "@/components/telecom/Shared";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const metadata = telecomMetadata("Sobre a WifiConecta", "Conheça a WifiConecta: consulta de pacotes de internet, celular e TV pelo WhatsApp, com atendimento atual em São Paulo.", "/sobre");
export default function Page() {
  return (<>
    <Breadcrumb items={[{ label: "Sobre a WifiConecta", href: "/sobre" }]} />
    <article className="wifi-prose">
      <div className="wifi-page-intro"><p className="wifi-eyebrow">Quem está por aqui</p><h1>A sua rotina é o começo da escolha.</h1><p>A WifiConecta ajuda você a consultar pacotes de internet, celular e TV. O atendimento acontece pelo WhatsApp, onde as opções atuais são apresentadas conforme o seu bairro e o que você precisa.</p></div>
      <RegionNotice />
      <h2>Como funciona a consulta.</h2><p>Você inicia uma conversa, conta o que procura e tira suas dúvidas. A disponibilidade, os valores, os benefícios e as condições de contratação são conferidos no atendimento. As promoções têm duração limitada e podem variar de um bairro para outro.</p>
      <h2>WifiConecta e operadoras.</h2><p>A WifiConecta tem identidade própria. No momento, nossas consultas são sobre serviços Claro. As marcas e os serviços citados pertencem aos respectivos titulares; a menção no site não comprova vínculo oficial ou disponibilidade no seu endereço.</p>
      <h2>Conteúdo para entender a escolha.</h2><p>O blog foi preparado para receber guias sobre internet, Wi-Fi, uso e contratação. Os conteúdos ajudam a entender o assunto; pacotes, preços e vantagens comerciais são apresentados exclusivamente pelo WhatsApp.</p>
      <div className="wifi-page-actions"><WhatsAppCTA source="about" label="Conversar com a WifiConecta" /><Link href="/politica-editorial" className="wifi-text-link">Conhecer a política editorial</Link></div>
    </article>
  </>);
}
