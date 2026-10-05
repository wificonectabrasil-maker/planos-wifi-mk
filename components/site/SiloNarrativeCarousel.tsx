"use client";

import Link from "next/link";

type Segment = {
  text: string;
  href?: string;
  highlighted?: boolean;
};

type NarrativeCard = {
  title: string;
  segments: Segment[];
};

const NARRATIVE_CARDS: NarrativeCard[] = [
  {
    title: "Preco",
    segments: [
      {
        text: "Organizamos os comparativos por faixa de investimento para facilitar a escolha entre economia, equilibrio e performance.",
      },
      { text: "Ver guias de preco", href: "/#posts-mais-novos" },
    ],
  },
  {
    title: "Decisao",
    segments: [
      {
        text: "Mostramos quando vale investir mais e quais criterios realmente impactam a rotina de passeio com bebe.",
      },
      { text: "Criterios de decisao", href: "/#posts-mais-novos" },
    ],
  },
  {
    title: "Tipos",
    segments: [
      {
        text: "Compacto, travel system ou versao robusta: explicamos para quem cada modelo funciona melhor.",
      },
      { text: "Comparar tipos", href: "/#posts-mais-novos" },
    ],
  },
  {
    title: "Viagem",
    segments: [
      {
        text: "Para deslocamentos frequentes, peso, fechamento e praticidade fazem diferenca. Reunimos os principais pontos.",
      },
      { text: "Guia para viagem", href: "/#posts-mais-novos" },
    ],
  },
  {
    title: "Peso e Idade",
    segments: [
      {
        text: "Cada fase do bebe pede recursos diferentes. Avaliamos limite de peso, reclinacao e conforto para cada etapa.",
      },
      { text: "Peso e idade", href: "/#posts-mais-novos" },
    ],
  },
  {
    title: "Recursos",
    segments: [
      {
        text: "Capota, cinto, amortecimento e cesto inferior: destacamos o que realmente importa em seguranca e usabilidade.",
      },
      { text: "Recursos importantes", href: "/#posts-mais-novos" },
    ],
  },
];

export function SiloNarrativeCarousel() {
  return (
    <div
      className="stagger-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Cards de navegação por tema"
    >
      {NARRATIVE_CARDS.map((card) => (
        <article
          key={card.title}
          className="brand-card rounded-3xl p-5"
        >
          <h3 className="text-xl font-semibold text-(--ink)">{card.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-(--muted)">
            {card.segments.map((segment, segmentIndex) =>
              segment.href ? (
                <Link
                  key={`${card.title}-${segmentIndex}`}
                  href={segment.href}
                  className="font-semibold text-(--brand-hot) underline"
                >
                  {segment.text}
                </Link>
              ) : (
                <span
                  key={`${card.title}-${segmentIndex}`}
                  className={segment.highlighted ? "font-semibold text-(--brand-hot)" : undefined}
                >
                  {segment.text}
                </span>
              )
            )}
          </p>
        </article>
      ))}
    </div>
  );
}

