"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { buildWhatsAppInquiry, buildWhatsAppUrl } from "@/lib/telecom/whatsapp";
import { trackConversion } from "@/lib/telecom/analytics";

const WhatsAppContext = createContext<string | null>(null);

export function WhatsAppProvider({
  phone,
  children,
}: {
  phone: string | null;
  children: ReactNode;
}) {
  return (
    <WhatsAppContext.Provider value={phone}>
      {children}
    </WhatsAppContext.Provider>
  );
}

const pageInterests: Record<string, string> = {
  "/internet-residencial": "Internet residencial",
  "/internet-empresarial": "Internet para minha empresa",
  "/internet-para-condominios": "Internet para meu condomínio",
  "/tv-e-streaming": "TV e serviços de streaming",
  "/celular-e-internet": "Pacote de internet e celular",
  "/comparar": "Ajuda para escolher entre os pacotes atuais",
  "/planos": "Promoções e pacotes disponíveis no momento",
  "/operadoras/claro": "Planos e pacotes da Claro",
  "/operadoras/vivo": "Planos e pacotes da Vivo",
  "/operadoras/tim": "Planos e pacotes da TIM",
};

export function WhatsAppCTA({
  source,
  interest,
  label = "Consultar promoções no WhatsApp",
  fallbackLabel = "Atendimento pelo WhatsApp",
  className = "",
  variant = "button",
  hideWhenUnavailable = false,
}: {
  source: string;
  interest?: string;
  label?: string;
  fallbackLabel?: string;
  className?: string;
  variant?: "button" | "link" | "floating";
  hideWhenUnavailable?: boolean;
}) {
  const phone = useContext(WhatsAppContext);
  const pathname = usePathname();
  const context =
    interest || pageInterests[pathname] || "Internet, celular, TV ou combos";
  const url = buildWhatsAppUrl(phone, buildWhatsAppInquiry(context));
  if (!url && hideWhenUnavailable)
    return null;
  const classes = `wifi-whatsapp-${variant} ${className}`.trim();
  const content = (
    <>
      <MessageCircle
        size={variant === "floating" ? 23 : 18}
        aria-hidden="true"
      />
      <span>{url ? label : fallbackLabel}</span>
      {variant === "button" ? (
        <ArrowUpRight size={16} aria-hidden="true" />
      ) : null}
    </>
  );
  if (!url)
    return (
      <Link
        href="/contato"
        className={classes}
        aria-label={fallbackLabel}
      >
        {content}
      </Link>
    );
  return (
    <a
      href={url}
      className={classes}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={() => trackConversion("whatsapp_clicked", { source })}
    >
      {content}
    </a>
  );
}
