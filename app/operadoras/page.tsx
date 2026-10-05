import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { telecomMetadata } from "@/lib/telecom/metadata";
import { Breadcrumb, FinalCTA, RegionNotice } from "@/components/telecom/Shared";
export const metadata = telecomMetadata(
  "Serviços Claro: consulta de pacotes pelo WhatsApp",
  "Consulte opções de internet, celular e TV da Claro com a WifiConecta. Atendimento atual em São Paulo pelo WhatsApp.",
  "/operadoras",
);
export default function Page() {
  return (
    <>
      <div className="wifi-page-tint"><div className="wifi-container">
        <Breadcrumb items={[{ label: "Operadoras", href: "/operadoras" }]} />
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Serviços para a sua rotina</p>
          <h1>Conheça as opções na conversa.</h1>
          <p>No momento, nossas consultas são sobre serviços Claro em São Paulo. Os pacotes disponíveis, as vantagens e as condições para o seu bairro são confirmados pelo WhatsApp.</p>
        </div>
      </div></div>
      <section className="wifi-section wifi-container">
        <RegionNotice />
        <article className="wifi-operator-card">
          <h2>Claro</h2><p>Internet, celular e TV: conte o que procura e confira as opções atuais para você.</p>
          <Link href="/operadoras/claro" className="wifi-text-link">Consultar serviços Claro <ArrowRight size={16} /></Link>
        </article>
      </section>
      <FinalCTA />
    </>
  );
}
