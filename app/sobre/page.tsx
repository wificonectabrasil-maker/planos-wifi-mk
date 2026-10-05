import Link from "next/link";
import { Breadcrumb, RegionNotice } from "@/components/telecom/Shared";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const metadata = telecomMetadata("Sobre a WifiConecta", "A WifiConecta nasceu para facilitar o pedido de internet. Atendimento humano pelo WhatsApp, ajuda na escolha e encaminhamento do serviço em São Paulo.", "/sobre");
export default function Page() {
  return (<>
    <Breadcrumb items={[{ label: "Sobre a WifiConecta", href: "/sobre" }]} />
    <article className="wifi-prose">
      <div className="wifi-page-intro"><p className="wifi-eyebrow">Por que a WifiConecta existe</p><h1>Pedir internet pode ser mais simples.</h1><p>A WifiConecta nasceu para facilitar a vida de quem precisa contratar internet pra casa. Entre trabalho, família e os compromissos do dia, sobra pouco tempo pra entender pacotes e cuidar do pedido. É aí que a nossa equipe entra.</p></div>
      <RegionNotice />
      <h2>Uma pessoa atende você.</h2><p>No WhatsApp, você conversa com uma pessoa da equipe. Ela entende como você usa a internet, quais serviços procura e o que faz sentido pro seu orçamento. A partir daí, apresenta as opções disponíveis para sua residência e responde às suas dúvidas.</p>
      <h2>Da escolha ao pedido.</h2><p>Antes de decidir, você confere o que está incluído, os valores e as regras de cada benefício. Com a sua confirmação, a equipe encaminha o pedido do serviço escolhido e orienta os próximos passos com a operadora. A ideia é tirar a burocracia do seu caminho e deixar claro o que você está contratando.</p>
      <h2>Operadoras e provedores de bairro.</h2><p>Trabalhamos com Claro, Vivo, TIM e provedores de bairro. As opções dependem do endereço e das condições atuais de cada serviço. A WifiConecta ajuda na escolha e no pedido; a operadora ou o provedor é responsável pela conexão e pela instalação.</p>
      <h2>Instalação e primeira mensalidade, tudo explicado.</h2><p>A equipe também confere as condições de instalação e a data da primeira cobrança. Pergunte sobre instalação gratuita, quando vence a primeira mensalidade e quais benefícios entram no pacote. Esses detalhes são confirmados na conversa antes de encaminhar o pedido.</p>
      <h2>Conteúdo para entender a escolha.</h2><p>O blog foi preparado para receber guias sobre internet, Wi-Fi, uso e contratação. Os conteúdos ajudam a entender o assunto; pacotes, preços e vantagens comerciais são apresentados exclusivamente pelo WhatsApp.</p>
      <p>Será um prazer ajudar você a encontrar uma conexão que faça sentido pro seu dia.</p>
      <div className="wifi-page-actions"><WhatsAppCTA source="about" label="Conversar com a WifiConecta" /><Link href="/politica-editorial" className="wifi-text-link">Conhecer a política editorial</Link></div>
    </article>
  </>);
}
