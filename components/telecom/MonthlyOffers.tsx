"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWhatsAppPhone } from "./WhatsAppCTA";
import { buildWhatsAppInquiry, buildWhatsAppUrl } from "@/lib/telecom/whatsapp";

const offers = [
  { image: "/images/claro-fibra_ internet-e-celular.webp", title: "Claro fibra, internet e celular", height: 600 },
  { image: "/images/tv-e-combo-completo-em-destaque.webp", title: "TV e combo completo", height: 600 },
  { image: "/images/super-oferta-claro_ 500-mega -mas-100gb.webp", title: "Claro 500 mega e 100 GB", height: 633 },
  { image: "/images/ofertas-claro_ internet-tv-e-celular.webp", title: "Claro internet, TV e celular", height: 600 },
];

export function MonthlyOffers() {
  const phone = useWhatsAppPhone();
  const track = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = section.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.visible = String(entry.isIntersecting);
    }, { rootMargin: "-15% 0px -15% 0px", threshold: 0 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function move(direction: number) {
    const item = track.current?.querySelector<HTMLElement>(".wifi-offer-slide");
    if (track.current && item) {
      const gap = parseFloat(getComputedStyle(track.current).columnGap) || 0;
      track.current.scrollBy({ left: direction * (item.offsetWidth + gap), behavior: "smooth" });
    }
  }

  return (
    <section ref={section} className="wifi-section wifi-container wifi-offers" aria-labelledby="monthly-offers-title">
      <div className="wifi-offers-heading">
        <div className="wifi-section-heading"><div><h2 id="monthly-offers-title">Ofertas do mês</h2><p>Escolha uma oferta para consultar disponibilidade e condições pelo WhatsApp.</p></div></div>
        <div className="wifi-offers-controls" aria-label="Navegação das ofertas">
          <button type="button" onClick={() => move(-1)} aria-label="Oferta anterior"><ChevronLeft size={21} aria-hidden="true" /></button>
          <button type="button" onClick={() => move(1)} aria-label="Próxima oferta"><ChevronRight size={21} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="wifi-offers-track" ref={track} role="region" aria-label="Carrossel de ofertas do mês" tabIndex={0}>
        {offers.map((offer) => {
          const url = buildWhatsAppUrl(phone, buildWhatsAppInquiry(offer.title));
          return <a className="wifi-offer-slide" key={offer.image} href={url || "/contato"} target={url ? "_blank" : undefined} rel={url ? "noopener noreferrer" : undefined} aria-label={`Consultar ${offer.title} pelo WhatsApp`}>
            <Image src={offer.image} alt={offer.title} width={480} height={offer.height} sizes="(max-width: 639px) 90vw, (max-width: 1023px) 30vw, 23vw" />
          </a>;
        })}
      </div>
    </section>
  );
}
