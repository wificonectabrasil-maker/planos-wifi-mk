import type { EditorialSiloPlan } from "./lib/editorial/content-plan";
import type { DriveSupportSource } from "./lib/editorial/drive-support";
import type { CollaboratorProfile } from "./lib/site/collaborators";
import { wifiEditorialPlan } from "./lib/telecom/editorial-plan";
import { mikeProfile } from "./lib/telecom/team";

// Each new project supplies its own identity, editorial plan and sources.
export const brandConfig = {
  name: "WifiConecta",
  url: "https://wificonecta.com.br",
  useBrandCanonicalOrigin: true,
  staticSiloNavigation: true,
  editorialResourcePages: ["/planos"],
  description:
    "A WifiConecta facilita seu pedido de internet. Uma pessoa entende sua necessidade, explica os pacotes e ajuda a encaminhar o serviço pelo WhatsApp na capital e no estado de São Paulo.",
  tagline: "Sua internet. Sem complicar o pedido.",
  locale: "pt-BR",
  contactEmail: "",
  whatsappPhone: "5511948844107",
  instagramUrl: "https://www.instagram.com/wifi_pedeaqui/",
  logo: "/brand-logo.svg",
  defaultAuthor: "Mike",
  affiliateDisclosure:
    "A WifiConecta é uma plataforma independente. Marcas e serviços pertencem às respectivas operadoras. Consulte disponibilidade e condições antes de contratar.",
  niche:
    "Atendimento humano pelo WhatsApp para escolher e solicitar internet residencial, empresarial, condomínios, celular, TV e streaming em São Paulo, com operadoras e provedores de bairro",
  tone: [
    "português brasileiro de conversa",
    "direto",
    "próximo",
    "uma pessoa ajuda na escolha e no pedido",
    "humor leve nas chamadas",
    "situações reais do dia a dia",
    "clareza em preços e contratação",
  ],
  sourcePolicy:
    "A orientação do responsável de 14/10/2026 reposiciona a WifiConecta como atendimento humano e intermediação de pedidos de internet na capital e em outras cidades do estado de São Paulo, conforme disponibilidade. A Home apresenta a marca; /planos atende a consulta residencial; empresarial e condomínios têm escopos próprios. Há opções de Claro, Vivo, TIM e provedores regionais conforme disponibilidade, sem declarar parceria oficial. Os exemplos de preços, velocidades e apps enviados são históricos; não constituem ofertas ativas. Faixas só podem ser mostradas com amostra atual, comparável e datada por categoria. Campanhas só aparecem após validação comercial, comprovação interna, vigência, elegibilidade, instalação, fidelidade, primeira cobrança e restrições documentadas. Ao vencer, saem dos espaços públicos. Nenhuma promessa universal de instalação grátis, cobrança em 30 dias, teste gratuito, menor preço ou cobertura. As modalidades para consulta incluem internet, celular, TV/streaming e câmera; não garantir equipamentos ou assinaturas sem oferta atual. Site sem coleta de dados pessoais por formulário e sem atendimento automático por IA. Os 15 briefs são planejamento: keywords exigem validação individual de SERP; pilares explicam e suportes aprofundam, sem duplicar a landing comercial. Não publicar artigos ou inventar fontes, depoimentos, credenciais e rankings. Use português brasileiro natural, sem erros artificiais, contagem de LSI, FAQ automático, urgência falsa ou superlativos sem prova.",
  visualPalette: { emerald: "#166de0", cobalt: "#1859de", midnight: "#142943" },
  allowAutomaticFaqSchema: false,
  articleNextStep: {
    title: "Já sabe o que sua conexão precisa?",
    description:
      "Veja as modalidades de internet e consulte opções para seu endereço em São Paulo com atendimento humano.",
    href: "/planos",
    label: "Ver modalidades e consultar opções",
  },
  contentPlan: wifiEditorialPlan as EditorialSiloPlan[],
  supportFolder: { name: "", id: "", url: "" },
  supportSources: [] as DriveSupportSource[],
  collaborators: [mikeProfile] as CollaboratorProfile[],
  manifesto: [
    "A WifiConecta nasceu para facilitar a contratação de internet: uma pessoa entende a necessidade, explica as opções e ajuda a encaminhar o pedido escolhido pelo cliente.",
    "Trabalhamos com Claro, Vivo, TIM e provedores de bairro. A disponibilidade de cada opção é confirmada para o endereço na conversa.",
    "O atendimento é humano, pelo WhatsApp. O pedido só é encaminhado após a confirmação do cliente, com condições e próximos passos explicados.",
    "O site apresenta modalidades para consulta. Campanhas são independentes, documentadas e temporárias; o atendimento confirma disponibilidade e condições antes do pedido.",
    "Fale como quem conhece a rotina de uma casa brasileira: TV, celular, trabalho, estudo e uma conta que precisa caber no mês.",
    "Promoções são temporárias e variam por bairro. Prioridade na capital e consultas nas demais cidades do estado, sem oferta permanente ou garantia de instalação no site.",
    "Operadoras são fornecedoras independentes; WifiConecta é a identidade do projeto.",
  ],
};
