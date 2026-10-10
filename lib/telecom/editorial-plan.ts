import type { EditorialSiloPlan } from "@/lib/editorial/content-plan";

// Backlog supplied by the owner on 09/10/2026. This configuration never creates posts.
export const wifiEditorialSilos = [
  {
    name: "Planos e contratação",
    slug: "planos-de-internet",
    path: "/planos-de-internet",
    icon: "plans",
    description: "Encontre os artigos sobre escolha de planos, operadoras e condições de contratação.",
    scope: ["Planos e preços", "Operadoras e cobertura", "Velocidades e combos", "Contrato e instalação"],
    articles: [
      ["Como escolher o melhor plano de internet residencial para sua casa?", "como-escolher-plano-internet-residencial", "melhor plano de internet residencial", "Pilar: organizar os critérios de escolha. Apontar aos guias específicos sem repetir suas explicações completas."],
      ["Internet residencial barata: como encontrar um plano que vale a pena?", "internet-residencial-barata", "internet residencial barata", "Comparar custo total, mensalidade, taxas e promoções. Reservar regras de permanência mínima para o artigo de fidelidade."],
      ["Claro, Vivo ou TIM: qual internet residencial escolher?", "claro-vivo-ou-tim-internet", "Claro Vivo ou TIM internet", "Comparar operadoras, tecnologias e condições, sem vencedora universal. A consulta comercial permanece em /planos."],
      ["Como saber quais operadoras de internet atendem meu CEP?", "internet-disponivel-no-meu-cep", "internet disponível no meu CEP", "Distinguir cobertura regional e disponibilidade técnica no endereço. Não criar consulta por CEP no site."],
      ["Internet de 300, 500, 600 Mega ou 1 Giga: qual velocidade contratar?", "quantos-mega-de-internet-preciso", "quantos Mega de internet preciso", "Dimensionar a capacidade total da casa. Remeter aos guias de streaming, jogos e home office para cada uso específico."],
      ["Combo de internet, celular e TV: quando vale a pena contratar?", "combo-internet-celular-e-tv", "combo internet celular e TV", "Avaliar contratação conjunta, custo e limitações. Não transformar composições comerciais temporárias em ofertas permanentes."],
      ["Internet residencial sem fidelidade: quais são as vantagens e desvantagens?", "internet-residencial-sem-fidelidade", "internet residencial sem fidelidade", "Explicar permanência mínima, multas e contrato com fontes atuais. Diferenciar do guia de preços."],
      ["Como contratar internet residencial em São Paulo: cobertura, planos e instalação", "contratar-internet-residencial-sao-paulo", "contratar internet residencial em São Paulo", "Guia local das etapas de contratação. A home apresenta o serviço da WifiConecta; este artigo explica o processo ao leitor."],
    ],
  },
  {
    name: "Wi-Fi e fibra óptica",
    slug: "wifi-e-fibra",
    path: "/wifi-e-fibra",
    icon: "wifi",
    description: "Encontre os artigos sobre tecnologias de acesso, rede sem fio e qualidade da conexão.",
    scope: ["Fibra óptica", "Rede Wi-Fi", "Streaming, jogos e trabalho", "Testes de conexão"],
    articles: [
      ["Internet fibra óptica ou internet comum: qual a diferença e qual escolher?", "internet-fibra-optica-ou-comum", "internet fibra óptica", "Pilar: comparar tecnologias de acesso e suas limitações. Não assumir a função do guia de escolha de planos."],
      ["Qual a diferença entre internet e Wi-Fi? Entenda antes de contratar", "diferenca-entre-internet-e-wifi", "diferença entre internet e Wi-Fi", "Explicar conexão da operadora e rede interna. Remeter ao diagnóstico de lentidão para soluções práticas."],
      ["Wi-Fi lento em casa: 10 causas comuns e como melhorar a conexão", "wifi-lento-como-melhorar", "Wi-Fi lento", "Diagnosticar posicionamento, interferência, aparelhos e sinal. O artigo de teste de velocidade concentra método e interpretação das medições."],
      ["Quantos Mega de internet precisa para assistir Netflix, YouTube e streaming?", "internet-para-streaming", "internet para streaming", "Dimensionar banda por qualidade de vídeo e telas simultâneas. Não comparar assinaturas ou combos comerciais."],
      ["Qual a melhor internet para jogar online? Velocidade, ping e estabilidade", "internet-para-jogos-online", "melhor internet para jogos online", "Explicar latência, estabilidade e conexão nos jogos. Separar de download e dimensionamento geral dos Mega."],
      ["Internet para home office: qual velocidade e conexão são ideais?", "internet-para-home-office", "internet para home office", "Examinar videochamadas, upload e uso simultâneo em casa. Não duplicar a página comercial para CNPJ."],
      ["Teste de velocidade da internet: como saber se você recebe o que contratou?", "teste-de-velocidade-da-internet", "teste de velocidade da internet", "Ensinar método e interpretação de download, upload e ping. Não oferecer ferramenta fictícia nem reproduzir o diagnóstico completo do Wi-Fi lento."],
    ],
  },
] as const;

export const wifiEditorialPlan: EditorialSiloPlan[] = wifiEditorialSilos.map(silo => ({
  name: silo.name,
  slug: silo.slug,
  kgrSlug: silo.slug,
  articles: silo.articles.map(([title, slug, primaryKeyword, uniqueIntent], index) => ({
    siloName: silo.name,
    siloSlug: silo.slug,
    kgrSiloSlug: silo.slug,
    role: index === 0 ? "PILLAR" : "SUPPORT",
    position: index + 1,
    uniqueIntent,
    title,
    slug,
    primaryKeyword,
    secondaryKeywords: [],
    searchIntent: "Informacional",
    anchorIn: primaryKeyword,
    expectedLinks: index === 0
      ? silo.articles.slice(1).map(([, targetSlug, keyword]) => ({ targetSlug, anchor: keyword, relationship: "pillar-to-support" as const }))
      : [{ targetSlug: silo.articles[0][1], anchor: silo.articles[0][2], relationship: "support-to-pillar" as const }],
  })),
}));
