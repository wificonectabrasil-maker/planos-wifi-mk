import { ServiceLanding } from "@/components/telecom/ServiceLanding";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const dynamic = "force-dynamic";
export const metadata = telecomMetadata(
  "Internet residencial: compare planos para sua casa",
  "Compare velocidades e condições de internet residencial. Solicite a consulta de disponibilidade pelo endereço.",
  "/internet-residencial",
);
export default function Page() {
  return <ServiceLanding slug="internet-residencial" />;
}
