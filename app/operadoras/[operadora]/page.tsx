import { notFound, permanentRedirect } from "next/navigation";
import { operators } from "@/lib/telecom/catalog";
import { telecomMetadata } from "@/lib/telecom/metadata";
import { Breadcrumb, FinalCTA, RegionNotice } from "@/components/telecom/Shared";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
export async function generateMetadata({ params }: { params: Promise<{ operadora: string }> }) {
  const { operadora } = await params;
  return operadora === "claro" ? telecomMetadata("Pacotes Claro: consulte as opções atuais", "Consulte serviços Claro pelo WhatsApp da WifiConecta. Pacotes, benefícios e condições apresentados no atendimento em São Paulo.", "/operadoras/claro") : { robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ operadora: string }> }) {
  const { operadora } = await params;
  if (!operators.some(operator => operator.slug === operadora)) notFound();
  if (operadora !== "claro") permanentRedirect("/operadoras");
  return (
    <>
      <div className="wifi-page-tint"><div className="wifi-container">
        <Breadcrumb items={[{ label: "Operadoras", href: "/operadoras" }, { label: "Claro", href: "/operadoras/claro" }]} />
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Serviços Claro</p>
          <h1>Internet, celular e TV. O que faz sentido pra você?</h1>
          <p>Converse sobre os serviços que procura e consulte as promoções atuais. A disponibilidade, os valores e os benefícios variam por bairro e são confirmados no atendimento.</p>
          <div className="wifi-page-actions"><WhatsAppCTA source="operator-page" interest="Serviços Claro" label="Consultar Claro no WhatsApp" /></div>
        </div>
      </div></div>
      <section className="wifi-section wifi-container">
        <RegionNotice />
        <div className="wifi-considerations">
          <div><h2>Internet e celular</h2><p>Conte sua rotina em casa e fora dela. Confira os serviços e as condições disponíveis para o seu perfil.</p></div>
          <div><h2>TV e streaming</h2><p>Pergunte quais canais e aplicativos estão incluídos na opção apresentada e por quanto tempo.</p></div>
          <div><h2>Empresa ou condomínio</h2><p>Informe se procura atendimento para um negócio ou condomínio e consulte as possibilidades para o local.</p></div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
