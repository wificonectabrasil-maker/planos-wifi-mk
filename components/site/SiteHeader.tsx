"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, Wifi, X } from "lucide-react";
import { commercialLinks } from "@/lib/telecom/catalog";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
export type SiteHeaderLink = {
  href: string;
  label: string;
  submenu?: { label: string; items: { href: string; label: string }[] }[];
};
export function SiteHeader({ links }: { links?: SiteHeaderLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const first = commercialLinks.slice(0, 6);
  const second = [
    { href: "/", label: "Início" },
    { href: "/planos", label: "Pacotes e promoções" },
    ...commercialLinks.slice(6),
    { href: "/sobre", label: "Sobre a WifiConecta" },
    { href: "/contato", label: "Contato" },
  ];
  const publishedTopics = (links || []).filter(
    (l) => !["/", "/sobre", "/contato"].includes(l.href),
  );
  return (
    <header className="wifi-header">
      <div className="wifi-topbar">
        <div className="wifi-container">
          <span>Atendimento em São Paulo • Promoções pelo WhatsApp</span>
          <Link href="/#como-funciona">
            Como funciona <ArrowRight size={12} />
          </Link>
        </div>
      </div>
      <div className="wifi-header-main wifi-container">
        <Link href="/" className="wifi-logo" aria-label="WifiConecta — início">
          <span className="wifi-logo-symbol">
            <Wifi size={26} strokeWidth={2.7} />
          </span>
          <span>
            Wifi<span>Conecta</span>
            <small>Internet que faz sentido pra você</small>
          </span>
        </Link>
        <div className="wifi-header-tools">
          <span>
            Casa, celular e TV.
            <br />
            <strong>Vamos achar um pacote pra você.</strong>
          </span>
          <WhatsAppCTA
            source="header"
            label="Promoções no WhatsApp"
            className="wifi-whatsapp-small"
          />
        </div>
        <button
          className="wifi-mobile-toggle"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="wifi-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <nav
        id="wifi-navigation"
        aria-label="Navegação principal"
        className={`wifi-navigation ${open ? "is-open" : ""}`}
      >
        <div className="wifi-container">
          <div className="wifi-nav-row">
            {first.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="wifi-nav-row wifi-nav-secondary">
            {second.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {publishedTopics.length ? (
              <details className="wifi-topics-menu">
                <summary>Temas do blog</summary>
                <div>
                  {publishedTopics.map((l) => (
                    <Link
                      href={l.href}
                      key={l.href}
                      onClick={() => setOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}
