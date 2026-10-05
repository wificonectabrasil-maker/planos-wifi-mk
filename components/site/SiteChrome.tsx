"use client";
import type { ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { SiteHeader, type SiteHeaderLink } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ConversionObserver } from "@/components/telecom/ConversionObserver";
import {
  WhatsAppProvider,
  WhatsAppCTA,
} from "@/components/telecom/WhatsAppCTA";
export function SiteChrome({
  children,
  headerLinks,
  whatsappPhone = null,
}: {
  children: ReactNode;
  headerLinks?: SiteHeaderLink[];
  whatsappPhone?: string | null;
}) {
  const segments = useSelectedLayoutSegments();
  if (segments[0] === "admin" && segments[1] !== "preview")
    return <>{children}</>;
  const isHome = segments.length === 0;
  const fullWidth =
    isHome ||
    [
      "planos",
      "operadoras",
      "comparar",
      "consultar",
      "blog",
      "internet-residencial",
      "internet-empresarial",
      "internet-para-condominios",
      "tv-e-streaming",
      "celular-e-internet",
    ].includes(segments[0]);
  return (
    <WhatsAppProvider phone={whatsappPhone}>
      <div className={isHome ? "wifi-site wifi-home" : "wifi-site"}>
        <ConversionObserver />
        <a href="#conteudo" className="wifi-skip-link">
          Pular para o conteúdo
        </a>
        <SiteHeader links={headerLinks} />
        <main
          id="conteudo"
          className={
            fullWidth ? "wifi-main" : "wifi-container wifi-legacy-page"
          }
        >
          {children}
        </main>
        <SiteFooter />
          <aside aria-label="Atendimento da WifiConecta">
            <WhatsAppCTA
              source="floating"
              variant="floating"
              label="Vamos conversar no WhatsApp"
              fallbackLabel="Atendimento pelo WhatsApp"
            />
          </aside>
      </div>
    </WhatsAppProvider>
  );
}
