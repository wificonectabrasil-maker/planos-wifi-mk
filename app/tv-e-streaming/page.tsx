import { ServiceLanding } from "@/components/telecom/ServiceLanding";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const dynamic = "force-dynamic";
export const metadata = telecomMetadata(
  "TV e streaming: confira o que vem no pacote",
  "Compare TV, box, canais e serviços de streaming. Confira assinaturas, benefícios temporários e condições antes de contratar.",
  "/tv-e-streaming",
);
export default function Page() {
  return <ServiceLanding slug="tv-e-streaming" />;
}
