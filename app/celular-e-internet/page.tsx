import { ServiceLanding } from "@/components/telecom/ServiceLanding";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const dynamic = "force-dynamic";
export const metadata = telecomMetadata(
  "Internet + celular: compare combos e condições",
  "Veja o que conferir ao juntar internet de casa e celular: franquia de GB, preço total, cobertura e condições.",
  "/celular-e-internet",
);
export default function Page() {
  return <ServiceLanding slug="celular-e-internet" />;
}
