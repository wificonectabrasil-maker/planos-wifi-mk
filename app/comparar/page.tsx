import { Breadcrumb, FinalCTA, RegionNotice } from "@/components/telecom/Shared";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const metadata = telecomMetadata(
  "Ajuda para escolher seu pacote de internet",
  "Conte sua rotina no WhatsApp e consulte os pacotes atuais em São Paulo. Confira os serviços, benefícios e condições antes de escolher.",
  "/comparar",
);
export default function Page() {
  return (
    <>
      <div className="wifi-page-tint"><div className="wifi-container">
        <Breadcrumb items={[{ label: "Ajuda pra escolher", href: "/comparar" }]} />
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Uma escolha que começa com você</p>
          <h1>Conte sua rotina. A gente ajuda a escolher.</h1>
          <p>Você conta como usa a internet e uma pessoa da equipe ajuda a entender as opções pro seu endereço. Confira o que vem no pacote, tire suas dúvidas e só então decida o que quer contratar.</p>
          <div className="wifi-page-actions"><WhatsAppCTA source="choose-package" label="Quero ajuda pelo WhatsApp" /></div>
        </div>
      </div></div>
      <section className="wifi-section wifi-container">
        <RegionNotice />
        <div className="wifi-considerations">
          <div><h2>Como você usa a conexão?</h2><p>Reuniões, estudos, jogos, vídeos e aparelhos conectados ao mesmo tempo. Conte quais atividades fazem parte do seu dia.</p></div>
          <div><h2>O que quer reunir no pacote?</h2><p>Internet de casa, celular e TV podem entrar na conversa. Informe os serviços que procura e os que já utiliza.</p></div>
          <div><h2>Quais condições precisa conferir?</h2><p>A equipe explica valores, duração da promoção, fidelidade, instalação, benefícios e quando vence a primeira mensalidade. Com a sua escolha confirmada, ajuda a encaminhar o pedido.</p></div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
