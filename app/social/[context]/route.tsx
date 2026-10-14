import { ImageResponse } from "next/og";
import { socialContexts } from "@/lib/telecom/social";
import { brandConfig } from "@/brand.config";
export const revalidate = 86400;
export function generateStaticParams() { return Object.keys(socialContexts).map(context => ({ context })); }
export async function GET(_request: Request, { params }: { params: Promise<{ context: string }> }) {
  const { context } = await params;
  if (!Object.hasOwn(socialContexts, context)) return new Response(null, { status: 404 });
  const copy = socialContexts[context];
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, color: "white", background: brandConfig.visualPalette.midnight, fontFamily: "sans-serif" }}>
    <div style={{ display: "flex", fontSize: 36, color: "#a9d0ff" }}>WifiConecta</div>
    <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{copy.title}</div>
    <div style={{ display: "flex", fontSize: 30, color: "#d5e8ff" }}>{copy.description}</div>
    <div style={{ display: "flex", fontSize: 24, color: "#70e8c8" }}>Atendimento humano em São Paulo · wificonecta.com.br</div>
  </div>, { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400" } });
}
