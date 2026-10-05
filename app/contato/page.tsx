import { Breadcrumb, ContractProcess, RegionNotice } from "@/components/telecom/Shared";
import { telecomMetadata } from "@/lib/telecom/metadata";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
export const metadata = telecomMetadata(
  "Contato: consulte pacotes pelo WhatsApp",
  "Converse com uma pessoa da WifiConecta pelo WhatsApp (11) 94884-4107. Ajuda para escolher seu pacote e encaminhar o pedido em São Paulo.",
  "/contato",
);
export default function Page() {
  return (
    <>
      <div className="wifi-page-tint"><div className="wifi-container">
        <Breadcrumb items={[{ label: "Contato", href: "/contato" }]} />
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Uma pessoa atende você</p>
          <h1>Conta pra gente o que você precisa.</h1>
          <p>Chame no WhatsApp, conte seu bairro em São Paulo e como usa a internet. Uma pessoa da equipe apresenta as opções, explica as condições e ajuda a encaminhar o pedido do pacote que você escolher.</p>
          <div className="wifi-page-actions"><WhatsAppCTA source="contact" label="Falar pelo WhatsApp" /></div>
          <p className="wifi-contact-number">Nosso WhatsApp: <strong>(11) 94884-4107</strong></p>
        </div>
      </div></div>
      <section className="wifi-section wifi-container">
        <RegionNotice />
        <div className="wifi-prose">
          <h2>Antes de decidir, confira as condições.</h2>
          <p>Promoções são temporárias e podem variar conforme o bairro e o perfil do cliente. Na conversa, você confirma disponibilidade, serviços incluídos, mensalidade, validade dos benefícios, instalação e data da primeira cobrança. O pedido é encaminhado depois da sua confirmação.</p>
          <h2>Dúvidas sobre conteúdo ou dados pessoais?</h2>
          <p>Use o mesmo WhatsApp para pedir uma correção de conteúdo ou tratar dos dados compartilhados no atendimento.</p>
        </div>
      </section>
      <ContractProcess />
    </>
  );
}
