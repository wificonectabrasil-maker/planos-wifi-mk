import { PackageInterests } from "@/components/telecom/PackageInterests";
import { Breadcrumb, ContractProcess, FinalCTA } from "@/components/telecom/Shared";
import { telecomMetadata } from "@/lib/telecom/metadata";
import { OperatorConsultations } from "@/components/telecom/OperatorConsultations";
export const metadata = telecomMetadata(
  "Pacotes e promoções: consulte pelo WhatsApp",
  "Consulte pacotes de internet, celular e TV com a WifiConecta. Atendimento em São Paulo e condições atuais apresentadas pelo WhatsApp.",
  "/planos",
);
export default function Page() {
  return (
    <>
      <div className="wifi-page-tint"><div className="wifi-container">
        <Breadcrumb items={[{ label: "Pacotes e promoções", href: "/planos" }]} />
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Sua rotina vem primeiro</p>
          <h1>Vamos encontrar um pacote que combine com você?</h1>
          <p>Veja as composições Claro que você pode consultar. As promoções mudam e as condições variam por bairro: os valores e os detalhes do pacote para o seu caso são confirmados no WhatsApp.</p>
        </div>
      </div></div>
      <PackageInterests />
      <OperatorConsultations />
      <ContractProcess />
      <FinalCTA />
    </>
  );
}
