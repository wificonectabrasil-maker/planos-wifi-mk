import { notFound, permanentRedirect } from "next/navigation";
import { operators } from "@/lib/telecom/catalog";
export default async function Page({ params }: { params: Promise<{ operadora: string }> }) {
  const { operadora } = await params;
  if (!operators.some(operator => operator.slug === operadora)) notFound();
  permanentRedirect(`/planos#operadora-${operadora}`);
}
