import type { EditorialSiloPlan } from "@/lib/editorial/content-plan";
const clusters = [
  {
    name: "Contratação",
    slug: "contratacao",
    articles: [
      [
        "Como contratar internet residencial sem complicação",
        "como-contratar-internet-residencial",
        "Entender documentos, consulta de endereço e etapas até a instalação.",
      ],
      [
        "Como saber qual internet atende seu endereço",
        "internet-disponivel-no-meu-endereco",
        "Distinguir uma solicitação comercial de uma confirmação técnica de cobertura.",
      ],
      [
        "Como trocar de internet sem ficar no escuro",
        "como-trocar-de-internet",
        "Planejar a troca sem presumir prazos, cancelamento ou instalação.",
      ],
    ],
  },
  {
    name: "Velocidades",
    slug: "velocidades",
    articles: [
      [
        "Quantos Mega sua casa realmente precisa?",
        "quantos-mega-preciso",
        "Relacionar usos simultâneos, aparelhos, upload, Wi-Fi e orçamento.",
      ],
      [
        "500 Mega é suficiente para a sua casa?",
        "500-mega-e-bom",
        "Explicar o que 500 Mbps representa sem prometer um número fixo de aparelhos.",
      ],
      [
        "500 Mega, 600 Mega ou 1 Giga: o que muda?",
        "500-mega-600-mega-ou-1-giga",
        "Comparar capacidade, limitações dos equipamentos e custo real.",
      ],
    ],
  },
  {
    name: "Wi-Fi e uso",
    slug: "wifi-e-uso",
    articles: [
      [
        "Como melhorar o Wi-Fi dentro de casa",
        "como-melhorar-o-wifi",
        "Diferenciar problema de sinal interno de capacidade da conexão.",
      ],
      [
        "Internet para home office: o que conferir",
        "internet-para-home-office",
        "Analisar upload, estabilidade e rede local em chamadas e envio de arquivos.",
      ],
      [
        "Internet para jogos: mais Mega resolve tudo?",
        "internet-para-jogos",
        "Explicar latência, cabo, Wi-Fi e download sem ranking inventado.",
      ],
    ],
  },
  {
    name: "Operadoras",
    slug: "guias-de-operadoras",
    articles: [
      [
        "Internet Claro: o que conferir antes de contratar",
        "internet-claro-como-contratar",
        "Verificar tecnologia, endereço e condições usando fontes atuais da operadora.",
      ],
      [
        "Vivo Fibra: como consultar planos e condições",
        "vivo-fibra-planos-e-condicoes",
        "Reunir critérios para uma consulta de disponibilidade da Vivo.",
      ],
      [
        "Internet TIM: como avaliar as opções para casa",
        "internet-tim-para-casa",
        "Orientar a consulta de serviço residencial da TIM sem garantir cobertura.",
      ],
    ],
  },
  {
    name: "Comparações e combos",
    slug: "comparacoes-e-combos",
    articles: [
      [
        "Como comparar planos de internet sem cair na pegadinha",
        "como-comparar-planos-de-internet",
        "Comparar preço total, promoção, fidelidade, upload e benefícios.",
      ],
      [
        "Internet e celular juntos: o combo compensa?",
        "internet-e-celular-combo",
        "Confrontar pacote e contratação separada com dados reais.",
      ],
      [
        "Internet com TV e streaming: o que vem no pacote?",
        "internet-tv-e-streaming",
        "Separar equipamento, assinatura, canais e benefícios temporários.",
      ],
    ],
  },
];
// Briefs only. No posts or articles are published by this plan.
export const wifiEditorialPlan: EditorialSiloPlan[] = clusters.map(
  (cluster) => ({
    name: cluster.name,
    slug: cluster.slug,
    kgrSlug: cluster.slug,
    articles: cluster.articles.map(([title, slug, uniqueIntent], index) => ({
      siloName: cluster.name,
      siloSlug: cluster.slug,
      kgrSiloSlug: cluster.slug,
      role: index === 0 ? "PILLAR" : "SUPPORT",
      position: index + 1,
      uniqueIntent,
      title,
      slug,
      primaryKeyword: title.replace(/[?:]/g, ""),
      secondaryKeywords: [
        "internet residencial",
        "disponibilidade",
        "planos de internet",
      ],
      searchIntent: "Informação para escolher e solicitar um plano",
      anchorIn: title,
      expectedLinks:
        index === 0
          ? cluster.articles
              .slice(1)
              .map(([targetTitle, targetSlug]) => ({
                targetSlug,
                anchor: targetTitle,
                relationship: "pillar-to-support" as const,
              }))
          : [
              {
                targetSlug: cluster.articles[0][1],
                anchor: cluster.articles[0][0],
                relationship: "support-to-pillar" as const,
              },
            ],
    })),
  }),
);
