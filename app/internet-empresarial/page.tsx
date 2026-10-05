import { ServiceLanding } from "@/components/telecom/ServiceLanding";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const dynamic = "force-dynamic";
export const metadata = telecomMetadata(
  "Internet empresarial: uma proposta para sua operação",
  "Informe as necessidades da sua empresa e solicite a verificação de internet, suporte e condições comerciais no endereço.",
  "/internet-empresarial",
);
export default function Page() {
  return <ServiceLanding slug="internet-empresarial" />;
}
