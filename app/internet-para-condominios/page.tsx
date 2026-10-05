import { ServiceLanding } from "@/components/telecom/ServiceLanding";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const dynamic = "force-dynamic";
export const metadata = telecomMetadata(
  "Internet para condomínios: consulta e infraestrutura",
  "Solicite uma avaliação para seu condomínio ou apartamento. Entenda disponibilidade, infraestrutura e contratação.",
  "/internet-para-condominios",
);
export default function Page() {
  return <ServiceLanding slug="internet-para-condominios" />;
}
