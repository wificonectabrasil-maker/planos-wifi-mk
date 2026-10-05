import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { telecomMetadata } from "@/lib/telecom/metadata";
import { Breadcrumb, FinalCTA, RegionNotice } from "@/components/telecom/Shared";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { operators } from "@/lib/telecom/catalog";
export const metadata = telecomMetadata(
  "Claro, Vivo, TIM e provedores de bairro",
  "A WifiConecta trabalha com Claro, Vivo, TIM e provedores de bairro. Uma pessoa ajuda você a conferir as opções pro seu endereço em São Paulo pelo WhatsApp.",
  "/operadoras",
);
export default function Page() {
  return (
    <>
      <div className="wifi-page-tint"><div className="wifi-container">
        <Breadcrumb items={[{ label: "Operadoras", href: "/operadoras" }]} />
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Serviços para a sua rotina</p>
          <h1>Qual operadora faz sentido pro seu endereço?</h1>
          <p>Trabalhamos com Claro, Vivo, TIM e provedores de bairro. Uma pessoa da equipe confere as opções disponíveis onde você mora e ajuda a entender as condições de cada serviço.</p>
        </div>
      </div></div>
      <section className="wifi-section wifi-container">
        <RegionNotice />
        <div className="wifi-operator-grid">
          {operators.map(operator => (
            <article className="wifi-operator-card" key={operator.slug}>
              <h2>{operator.name}</h2><p>{operator.description}</p>
              <Link href={`/operadoras/${operator.slug}`} className="wifi-text-link">Consultar serviços {operator.name} <ArrowRight size={16} /></Link>
            </article>
          ))}
        </div>
        <article className="wifi-operator-card" id="provedores">
          <h2>Provedores de bairro</h2>
          <p>Também trabalhamos com provedores locais. Conte seu bairro em São Paulo para a equipe consultar as opções, explicar o que cada serviço inclui e ajudar no pedido.</p>
          <WhatsAppCTA source="local-providers" interest="Provedores de bairro para minha residência" label="Consultar provedores no WhatsApp" />
        </article>
      </section>
      <FinalCTA />
    </>
  );
}
