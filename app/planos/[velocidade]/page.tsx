import { notFound, permanentRedirect } from "next/navigation";
import { speedProfiles } from "@/lib/telecom/catalog";
export default async function Page({ params }: { params: Promise<{ velocidade: string }> }) {
  const { velocidade } = await params;
  if (!speedProfiles.some(profile => profile.slug === velocidade)) notFound();
  permanentRedirect("/planos");
}
