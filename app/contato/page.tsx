import { Breadcrumb, ContractProcess, RegionNotice } from "@/components/telecom/Shared";
import { telecomMetadata } from "@/lib/telecom/metadata";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
export const metadata = telecomMetadata(
  "Contato: consulte pacotes pelo WhatsApp",
  "Fale com a WifiConecta pelo WhatsApp (11) 99271-4748. Consulte promoções, vantagens e pacotes para seu perfil em São Paulo.",
  "/contato",
);
export default function Page() {
  return (
    <>
      <div className="wifi-page-tint"><div className="wifi-container">
        <Breadcrumb items={[{ label: "Contato", href: "/contato" }]} />
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Atendimento pelo WhatsApp</p>
          <h1>Seu próximo pacote começa com uma conversa.</h1>
          <p>Conte seu bairro em São Paulo e o que procura: internet, celular, TV ou serviços para sua empresa ou condomínio. As opções, valores e vantagens atuais são apresentados no atendimento.</p>
          <div className="wifi-page-actions"><WhatsAppCTA source="contact" label="Falar pelo WhatsApp" /></div>
          <p className="wifi-contact-number">Nosso WhatsApp: <strong>(11) 99271-4748</strong></p>
        </div>
      </div></div>
      <section className="wifi-section wifi-container">
        <RegionNotice />
        <div className="wifi-prose">
          <h2>Antes de decidir, confira as condições.</h2>
          <p>Promoções são temporárias e podem variar conforme o bairro e o perfil do cliente. Na conversa, você confirma disponibilidade, serviços incluídos, mensalidade, validade dos benefícios e próximos passos.</p>
          <h2>Dúvidas sobre conteúdo ou dados pessoais?</h2>
          <p>Use o mesmo WhatsApp para pedir uma correção de conteúdo ou tratar dos dados compartilhados no atendimento.</p>
        </div>
      </section>
      <ContractProcess />
    </>
  );
}
