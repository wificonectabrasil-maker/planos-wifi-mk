"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type SiloCard = {
  silo: string;
  href: string;
  color: string;
  textContent: React.ReactNode;
};

const CARD_COLORS = [
  { bg: "#F0E1D3", border: "rgba(0,0,0,0.1)", text: "#1a1c19", iconText: "Guias" },
  { bg: "#E2977B", border: "rgba(255,255,255,0.3)", text: "#ffffff", iconText: "Rotina Base" },
  { bg: "#317A6D", border: "rgba(255,255,255,0.2)", text: "#ffffff", iconText: "Proteção" },
  { bg: "#F3BEA2", border: "rgba(0,0,0,0.1)", text: "#1a1c19", iconText: "Hábitos" },
  // Fallbacks:
  { bg: "#F0E1D3", border: "rgba(0,0,0,0.1)", text: "#1a1c19", iconText: "Avançado" },
  { bg: "#E2977B", border: "rgba(255,255,255,0.3)", text: "#ffffff", iconText: "Básico" },
  { bg: "#317A6D", border: "rgba(255,255,255,0.2)", text: "#ffffff", iconText: "Corpo" },
  { bg: "#F3BEA2", border: "rgba(0,0,0,0.1)", text: "#1a1c19", iconText: "Temas" },
] as const;

export function HomeSliderCards({ cards }: { cards: SiloCard[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(".silo-slide-card")?.offsetWidth ?? 320;
    const gap = 16;
    el.scrollBy({
      left: direction === "left" ? -(cardWidth + gap) : cardWidth + gap,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group/slider">
      {/* Setas */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Card anterior"
          className="absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 p-3 shadow-md backdrop-blur transition hover:bg-white hover:scale-110 md:flex"
        >
          <ChevronLeft size={20} className="text-[#1a1c19]" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Próximo card"
          className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 p-3 shadow-md backdrop-blur transition hover:bg-white hover:scale-110 md:flex"
        >
          <ChevronRight size={20} className="text-[#1a1c19]" />
        </button>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className="silo-slider-track flex snap-x snap-mandatory gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-hide px-4 md:px-0"
        style={{ scrollPaddingLeft: "0px" }}
      >
        {cards.map((card, index) => {
          const styleConfig = CARD_COLORS[index % CARD_COLORS.length];
          return (
            <article
              key={card.silo}
              className="silo-slide-card flex w-[85vw] flex-none snap-start flex-col justify-between rounded-xl overflow-hidden shadow-sm transition-transform duration-300 hover:-translate-y-1 sm:w-[320px] md:w-[calc(25%-18px)] aspect-[4/5] sm:aspect-square relative"
              style={{
                background: styleConfig.bg,
                color: styleConfig.text,
              }}
            >
              {/* Box interno tracejado imitando o design do Stitch */}
              <div 
                className="absolute inset-[10px] rounded-lg border border-dashed flex flex-col justify-between p-4"
                style={{ borderColor: styleConfig.border }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    {styleConfig.iconText}
                  </span>
                  <div className="h-6 w-6 rounded-full bg-black/5 flex items-center justify-center backdrop-blur-sm">
                    <ChevronRight size={14} className="opacity-70" />
                  </div>
                </div>
                
                <p className="font-['Milchella'] text-2xl leading-tight opacity-95">
                  {card.textContent}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
