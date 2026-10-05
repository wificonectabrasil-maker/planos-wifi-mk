import { permanentRedirect } from "next/navigation";

export const revalidate = 3600;

export default async function LegacySiloHubRedirect({ params }: { params: Promise<{ silo: string }> }) {
  const { silo } = await params;
  permanentRedirect(`/${encodeURIComponent(silo)}`);
}
