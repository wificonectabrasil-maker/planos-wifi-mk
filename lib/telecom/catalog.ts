import { z } from "zod";

export const categories = [
  "residential",
  "business",
  "condominium",
  "tv",
  "mobile",
  "bundle",
] as const;
export type ServiceCategory = (typeof categories)[number];
export const categoryLabels: Record<ServiceCategory, string> = {
  residential: "Internet residencial",
  business: "Internet empresarial",
  condominium: "Internet para condomínios",
  tv: "TV e streaming",
  mobile: "Celular e internet",
  bundle: "Combos",
};
const nullableNumber = z
  .number()
  .finite()
  .nonnegative()
  .nullable()
  .default(null);
export const offerSchema = z
  .object({
    id: z.string().min(1).max(100),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120),
    operator: z.string().min(1).max(60),
    category: z.enum(categories),
    title: z.string().min(3).max(120),
    shortDescription: z.string().max(300).default(""),
    downloadMbps: nullableNumber,
    uploadMbps: nullableNumber,
    mobileDataGb: nullableNumber,
    promotionalPrice: nullableNumber,
    regularPrice: nullableNumber,
    promotionalMonths: nullableNumber,
    installationFee: nullableNumber,
    fidelityMonths: nullableNumber,
    tvChannels: nullableNumber,
    benefits: z.array(z.string().min(1).max(180)).max(12).default([]),
    streamingServices: z.array(z.string().min(1).max(80)).max(12).default([]),
    eligibilityNotes: z.array(z.string().max(400)).max(12).default([]),
    legalNotes: z.array(z.string().max(500)).max(12).default([]),
    status: z.enum(["draft", "active", "paused", "expired"]).default("draft"),
    validFrom: z.string().datetime().nullable().default(null),
    validUntil: z.string().datetime().nullable().default(null),
    verifiedAt: z.string().datetime().nullable().default(null),
    source: z.string().max(500).default(""),
  })
  .superRefine((offer, ctx) => {
    if (
      offer.status === "active" &&
      (!offer.verifiedAt || !offer.source.trim() || !offer.validUntil)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Para ativar, informe fonte, data de verificação e validade da oferta.",
      });
    if (
      offer.validFrom &&
      offer.validUntil &&
      offer.validFrom >= offer.validUntil
    )
      ctx.addIssue({
        code: "custom",
        message: "A validade deve terminar depois do início da oferta.",
      });
    if (
      offer.promotionalPrice !== null &&
      (offer.promotionalMonths === null || offer.regularPrice === null)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Uma promoção precisa informar duração e preço após a promoção.",
      });
    if (
      offer.promotionalPrice !== null &&
      offer.promotionalMonths !== null &&
      (!Number.isInteger(offer.promotionalMonths) ||
        offer.promotionalMonths < 1)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "A duração da promoção deve ser um número inteiro de meses, maior que zero.",
      });
    if (
      offer.promotionalPrice !== null &&
      offer.regularPrice !== null &&
      offer.promotionalPrice >= offer.regularPrice
    )
      ctx.addIssue({
        code: "custom",
        message:
          "O preço promocional deve ser menor que a mensalidade regular.",
      });
  });
export type InternetOffer = z.infer<typeof offerSchema>;
export function isCurrentOffer(offer: InternetOffer, now = new Date()) {
  const instant = now.getTime();
  return (
    offer.status === "active" &&
    Boolean(offer.verifiedAt && offer.source && offer.validUntil) &&
    Boolean(offer.verifiedAt && Date.parse(offer.verifiedAt) <= instant) &&
    (!offer.validFrom || Date.parse(offer.validFrom) <= instant) &&
    Boolean(offer.validUntil && Date.parse(offer.validUntil) > instant)
  );
}
export const operators = [
  {
    slug: "claro",
    name: "Claro",
    description:
      "Internet para casa, celular e opções de TV. Confira tecnologia, pacote e condições para o endereço.",
  },
  {
    slug: "vivo",
    name: "Vivo",
    description:
      "Considere a conexão para casa e o uso do celular. Compare mensalidade, upload e serviços incluídos.",
  },
  {
    slug: "tim",
    name: "TIM",
    description:
      "Avalie os serviços residenciais e móveis. A disponibilidade e o pacote precisam ser confirmados no endereço.",
  },
];
export const speedProfiles = [
  {
    slug: "500-mega",
    mbps: 500,
    value: "500",
    unit: "Mega",
    label: "O dia a dia da casa",
    title: "Pra conectar a sua rotina",
    description:
      "TV ligada, chamada de vídeo e celular na mão. Comece comparando essa faixa de velocidade.",
    uses: ["Séries e filmes", "Trabalho e estudos", "Celulares e Smart TV"],
    detail:
      "Observe também o upload, o roteador e como o Wi-Fi chega aos cômodos. O número de Mega sozinho não garante o resultado.",
  },
  {
    slug: "600-mega",
    mbps: 600,
    value: "600",
    unit: "Mega",
    label: "Mais uso ao mesmo tempo",
    title: "Pra uma casa movimentada",
    description:
      "Todo mundo usando a internet junto? Coloque mais capacidade na comparação.",
    uses: [
      "Uso simultâneo da conexão",
      "Downloads frequentes",
      "Casa com vários aparelhos",
    ],
    detail:
      "600 Mbps oferece mais capacidade de download que 500 Mbps. Isso não significa automaticamente menos travamentos: a rede de casa e o serviço também contam.",
  },
  {
    slug: "1-giga",
    mbps: 1000,
    value: "1",
    unit: "Giga",
    label: "Arquivos grandes na rotina",
    title: "Pra quem exige mais",
    description:
      "Arquivos pesados, downloads e muitos usos juntos. Veja se a diferença faz sentido no seu bolso.",
    uses: [
      "Transferência de arquivos grandes",
      "Downloads de jogos",
      "Uso intenso da conexão",
    ],
    detail:
      "Antes de pagar por 1 Giga, confirme se seus equipamentos suportam essa velocidade e compare o uso real da casa. Mais velocidade não é sinônimo de menor latência.",
  },
];
export const commercialLinks = [
  { href: "/internet-residencial", label: "Internet pra casa" },
  { href: "/celular-e-internet", label: "Internet + celular" },
  { href: "/tv-e-streaming", label: "TV e streaming" },
  { href: "/internet-empresarial", label: "Pra sua empresa" },
  { href: "/internet-para-condominios", label: "Condomínios" },
  { href: "/operadoras", label: "Operadoras" },
  { href: "/comparar", label: "Ajuda pra escolher" },
  { href: "/blog", label: "Dicas e guias" },
];
export const commercialPaths = [
  "/planos",
  ...commercialLinks.map((l) => l.href),
  ...operators.map(operator => `/operadoras/${operator.slug}`),
];
export const servicePages: Record<
  string,
  {
    category: ServiceCategory;
    eyebrow: string;
    title: string;
    description: string;
    considerations: [string, string][];
  }
> = {
  "internet-residencial": {
    category: "residential",
    eyebrow: "Internet pra casa",
    title: "A casa toda conectada. Sem complicar a escolha.",
    description:
      "Série na TV, trabalho no notebook, celular de todo mundo. Uma pessoa da equipe entende sua rotina, apresenta as opções pro seu endereço e ajuda a encaminhar o pedido.",
    considerations: [
      [
        "Conte seu bairro na conversa",
        "As condições podem variar até na mesma rua. No WhatsApp, confira as opções disponíveis para o local onde precisa do serviço.",
      ],
      [
        "Olhe além dos Mega",
        "Upload, roteador e distribuição do Wi-Fi também fazem diferença. Mais velocidade não resolve sozinha um sinal fraco no quarto.",
      ],
      [
        "Faça a conta completa",
        "A equipe explica a mensalidade durante e depois da promoção, instalação, fidelidade e a data da primeira cobrança antes de encaminhar o pedido.",
      ],
    ],
  },
  "internet-empresarial": {
    category: "business",
    eyebrow: "Pra sua empresa",
    title: "Sua operação não pode depender de uma escolha no escuro.",
    description:
      "Conte como a sua empresa usa a internet. Vamos reunir o que precisa ser confirmado: endereço, capacidade, atendimento e condições comerciais.",
    considerations: [
      [
        "Como a equipe trabalha?",
        "Informe quantas pessoas usam a conexão, os sistemas da empresa e se há chamadas, câmeras ou envio de arquivos.",
      ],
      [
        "O que o contrato inclui?",
        "Confirme upload, suporte, prazos de atendimento e qualquer recurso empresarial com a operadora.",
      ],
      [
        "Precisa de uma conexão de apoio?",
        "Se a operação depende da internet, avalie uma alternativa para os períodos de indisponibilidade.",
      ],
    ],
  },
  "internet-para-condominios": {
    category: "condominium",
    eyebrow: "Internet para condomínios",
    title: "Uma boa conexão começa pela estrutura do condomínio.",
    description:
      "Você é morador, síndico ou administra o prédio? Informe seu interesse para avaliar disponibilidade e necessidades de infraestrutura.",
    considerations: [
      [
        "Morador ou administração?",
        "Contratar para um apartamento é diferente de avaliar uma solução para áreas comuns ou para o condomínio inteiro.",
      ],
      [
        "Infraestrutura vem primeiro",
        "A operadora precisa verificar endereço, cabeamento, acesso e eventuais autorizações para instalação.",
      ],
      [
        "Cada proposta tem suas condições",
        "Confirme responsabilidades, custos, cronograma e atendimento antes de aprovar uma contratação coletiva.",
      ],
    ],
  },
  "tv-e-streaming": {
    category: "tv",
    eyebrow: "TV e streaming",
    title: "Seu sofá merece uma programação que você vai usar.",
    description:
      "TV, box e streaming: compare o que vem em cada pacote antes de acumular assinatura e uma conta maior.",
    considerations: [
      [
        "O que você quer assistir?",
        "Liste os canais e serviços que interessam à sua casa. Nem todo pacote inclui as mesmas assinaturas.",
      ],
      [
        "Box não é assinatura de tudo",
        "Confirme equipamento, aplicativos, canais, resolução e se os serviços precisam ser contratados à parte.",
      ],
      [
        "Cuidado com benefícios temporários",
        "Confira o prazo dos serviços incluídos e o que acontece com o preço quando o período promocional termina.",
      ],
    ],
  },
  "celular-e-internet": {
    category: "bundle",
    eyebrow: "Internet + celular",
    title: "Internet dentro e fora de casa. A conta precisa fechar.",
    description:
      "Juntar casa e celular pode fazer sentido. Compare os GB, a mensalidade total e as condições de cada serviço.",
    considerations: [
      [
        "Mega em casa, GB no celular",
        "São medidas diferentes. Mega descreve velocidade; GB indica a quantidade de dados do pacote móvel.",
      ],
      [
        "Compare com as contas separadas",
        "Some os valores que você paga hoje e confira o preço do combo depois do período promocional.",
      ],
      [
        "Entenda cada parte do pacote",
        "Confirme cobertura móvel, franquia, portabilidade, fidelidade e o que muda ao cancelar um dos serviços.",
      ],
    ],
  },
};
