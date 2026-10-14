import type { EditorialSiloPlan } from "@/lib/editorial/content-plan";
import briefs from "./editorial-briefs";

// Owner's revised backlog, 14/10/2026. Planning only: never creates or publishes posts.
const articlesFor = (silo: string) => briefs.filter(brief => brief.siloSlug === silo).map(brief =>
  [brief.title, brief.slug, brief.keyword, brief.intent + ". Limite: " + brief.excludedTopics] as const);
export const wifiEditorialSilos = [
  {
    name: "Planos e contratação", slug: "planos-de-internet", path: "/planos-de-internet", icon: "plans",
    title: "Escolher internet para casa: por onde começar?",
    metaTitle: "Escolher internet para casa: planos e contratação",
    description: "Guias para comparar planos, operadoras, combos, cobertura e instalação antes de contratar.",
    introduction: "A propaganda grita o número de Mega. Só que a escolha também depende de onde você mora, do que usa e do custo completo. Estes guias organizam os critérios e as dúvidas de contratação. As condições comerciais atuais ficam na consulta de pacotes.",
    scope: ["Preço e cobertura", "Operadoras e velocidades", "Combos", "Instalação e primeira fatura"],
    groups: [
      { title: "Preço, cobertura e operadora", numbers: [2, 3, 4, 5] },
      { title: "Pacotes e condições de contratação", numbers: [6, 7, 8] },
    ],
    articles: articlesFor("planos-de-internet"),
  },
  {
    name: "Wi-Fi e fibra óptica", slug: "wifi-e-fibra", path: "/wifi-e-fibra", icon: "wifi",
    title: "Wi-Fi, fibra óptica e qualidade: entenda sua conexão",
    metaTitle: "Wi-Fi, fibra óptica e qualidade da conexão",
    description: "Entenda tecnologias, Wi-Fi lento, streaming, jogos, videochamadas e testes de conexão.",
    introduction: "Contratar mais Mega nem sempre resolve um Wi-Fi ruim. A tecnologia que chega à casa, o roteador e o tipo de uso são questões diferentes. Os guias ajudam a separar essas dúvidas antes de gastar mais ou pedir suporte.",
    scope: ["Tecnologias de acesso", "Internet e Wi-Fi", "Streaming, jogos e trabalho", "Diagnóstico da conexão"],
    groups: [
      { title: "Problemas dentro de casa", numbers: [10, 11, 15] },
      { title: "Conexão de acordo com o uso", numbers: [12, 13, 14] },
    ],
    articles: articlesFor("wifi-e-fibra"),
  },
] as const;
const anchors = ["como comparar um plano residencial", "o custo completo da internet", "as opções de operadoras no seu endereço", "como conferir a cobertura na sua rua", "a velocidade para sua casa", "o que muda no combo com celular", "a composição dos pacotes com TV", "a instalação e a primeira cobrança", "a diferença entre fibra, cabo e acesso sem fio", "onde entra o Wi-Fi na conexão", "por onde começar quando o Wi-Fi está lento", "a conexão para telas e streaming", "ping e estabilidade nos jogos", "videochamadas no trabalho em casa", "o resultado do teste de velocidade"];
export const wifiEditorialPlan = wifiEditorialSilos.map(silo => ({
  name: silo.name, slug: silo.slug, kgrSlug: silo.slug,
  articles: briefs.filter(b => b.siloSlug === silo.slug).map((b, index) => ({
    siloName: silo.name, siloSlug: silo.slug, kgrSiloSlug: silo.slug,
    role: index === 0 ? "PILLAR" as const : "SUPPORT" as const, position: index + 1,
    title: b.title, slug: b.slug, primaryKeyword: b.keyword, secondaryKeywords: [],
    uniqueIntent: b.intent + ". Fora do escopo: " + b.excludedTopics,
    searchIntent: "Informacional", anchorIn: b.keyword,
    excludedTopics: b.excludedTopics, conversionTarget: b.conversionTarget, ctaLabel: b.cta, needsSerpValidation: b.needsSerpValidation,
    expectedLinks: b.links.map(number => {
      const target = briefs.find(target => target.number === number)!;
      return { targetSlug: target.slug, anchor: anchors[target.number - 1],
        relationship: index === 0 ? "pillar-to-support" as const : (number === 1 || number === 9) ? "support-to-pillar" as const : "support-to-support" as const };
    }),
  })),
})) satisfies EditorialSiloPlan[];
