"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ClipboardList, Menu, Router, Wifi, X } from "lucide-react";
import { commercialLinks } from "@/lib/telecom/navigation";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
export type SiteHeaderLink = {
  href: string;
  label: string;
  submenu?: { label: string; items: { href: string; label: string }[] }[];
};
export function SiteHeader({ links }: { links?: SiteHeaderLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const site = header?.closest<HTMLElement>(".wifi-home");
    if (pathname !== "/" || !header || !site) return;

    // Keep one continuous video behind the header, including the expanded mobile menu.
    const syncHeight = () => {
      site.style.setProperty(
        "--wifi-home-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(header);
    return () => {
      observer.disconnect();
      site.style.removeProperty("--wifi-home-header-height");
    };
  }, [pathname]);
  const first = commercialLinks.slice(0, 6);
  const second: { href: string; label: string; icon?: typeof Wifi }[] = [
    { href: "/", label: "Início" },
    { href: "/planos-de-internet", label: "Planos e contratação", icon: ClipboardList },
    { href: "/wifi-e-fibra", label: "Wi-Fi e fibra óptica", icon: Router },
    { href: "/sobre", label: "Sobre a WifiConecta" },
    { href: "/contato", label: "Contato" },
  ];
  const publishedTopics = (links || []).filter(
    (l) => !["/", "/sobre", "/contato", "/planos-de-internet", "/wifi-e-fibra"].includes(l.href),
  );
  return (
    <header ref={headerRef} className="wifi-header">
      <div className="wifi-topbar">
        <div className="wifi-container">
          <span>Atendimento humano em São Paulo • WhatsApp</span>
          <Link prefetch={false} href="/#como-funciona">
            Como funciona <ArrowRight size={12} />
          </Link>
        </div>
      </div>
      <div className="wifi-header-main wifi-container">
        <Link prefetch={false} href="/" className="wifi-logo" aria-label="WifiConecta — início">
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
            <strong>Uma pessoa te ajuda a escolher.</strong>
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
              <Link prefetch={false}
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
              <Link prefetch={false}
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {l.icon ? <l.icon size={14} aria-hidden="true" /> : null}
                {l.label}
              </Link>
            ))}
            {publishedTopics.length ? (
              <details className="wifi-topics-menu">
                <summary>Mais assuntos</summary>
                <div>
                  {publishedTopics.map((l) => (
                    <Link prefetch={false}
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
