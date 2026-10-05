import { notFound } from "next/navigation";
import { operators } from "@/lib/telecom/catalog";
import { telecomMetadata } from "@/lib/telecom/metadata";
import { Breadcrumb, FinalCTA, RegionNotice } from "@/components/telecom/Shared";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
export async function generateMetadata({ params }: { params: Promise<{ operadora: string }> }) {
  const { operadora } = await params;
  const operator = operators.find(item => item.slug === operadora);
  return operator ? telecomMetadata(`Serviços ${operator.name}: consulte as opções atuais`, `Converse com uma pessoa da WifiConecta sobre serviços ${operator.name}. Pacotes, benefícios e condições confirmados pelo WhatsApp em São Paulo.`, `/operadoras/${operator.slug}`) : { robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ operadora: string }> }) {
  const { operadora } = await params;
  const operator = operators.find(item => item.slug === operadora);
  if (!operator) notFound();
  return (
    <>
      <div className="wifi-page-tint"><div className="wifi-container">
        <Breadcrumb items={[{ label: "Operadoras", href: "/operadoras" }, { label: operator.name, href: `/operadoras/${operator.slug}` }]} />
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Serviços {operator.name}</p>
          <h1>Conheça os serviços da {operator.name}.</h1>
          <p>Uma pessoa da equipe entende o que você procura e confere as opções da {operator.name} para o seu endereço. Valores, benefícios e condições são explicados na conversa, antes de encaminhar o pedido.</p>
          <div className="wifi-page-actions"><WhatsAppCTA source="operator-page" interest={`Serviços ${operator.name}`} label={`Consultar ${operator.name} no WhatsApp`} /></div>
        </div>
      </div></div>
      <section className="wifi-section wifi-container">
        <RegionNotice />
        <div className="wifi-considerations">
          <div><h2>Sua rotina e o endereço</h2><p>Conte como usa a internet e onde precisa do serviço. A equipe verifica quais opções podem atender você.</p></div>
          <div><h2>Pacote e benefícios</h2><p>Entenda o que está incluído, a mensalidade e a duração das vantagens na opção apresentada.</p></div>
          <div><h2>Pedido e instalação</h2><p>Confira as condições de instalação e da primeira cobrança. Com a sua confirmação, a equipe ajuda a encaminhar o pedido.</p></div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
