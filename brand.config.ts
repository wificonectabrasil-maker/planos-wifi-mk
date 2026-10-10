import type { EditorialSiloPlan } from "./lib/editorial/content-plan";
import type { DriveSupportSource } from "./lib/editorial/drive-support";
import type { CollaboratorProfile } from "./lib/site/collaborators";
import { wifiEditorialPlan } from "./lib/telecom/editorial-plan";

// Each new project supplies its own identity, editorial plan and sources.
export const brandConfig = {
  name: "WifiConecta",
  url: "https://wificonecta.com.br",
  useBrandCanonicalOrigin: true,
  staticSiloNavigation: true,
  description:
    "A WifiConecta facilita seu pedido de internet. Uma pessoa entende sua necessidade, explica os pacotes e ajuda a encaminhar o serviço pelo WhatsApp em São Paulo.",
  tagline: "Sua internet. Sem complicar o pedido.",
  locale: "pt-BR",
  contactEmail: "",
  whatsappPhone: "5511948844107",
  logo: "/brand-logo.svg",
  defaultAuthor: "Equipe WifiConecta",
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
    "A base da marca é o relato do atendente fornecido pelo responsável em 05/10/2026: facilitar o pedido de internet, ouvir a necessidade, explicar as opções e encaminhar o serviço escolhido após confirmação do cliente. O atendimento ao cliente é humano e exclusivamente pelo WhatsApp, por enquanto em São Paulo. O responsável informou atuação com Claro, Vivo, TIM e provedores de bairro; pode mencionar essas opções, sem inventar nomes de provedores, vínculo oficial ou cobertura no endereço. Os quatro cards Claro continuam como composições para consulta: Multi 500 Mega + 60 GB; internet 500 Mega + celular 60 GB + TV Box com 120 canais e seis streamings; Empresas 600 Mega + McAfee para CNPJ; Claro tv+ Box em composição Multi para condomínios. Velocidades e benefícios podem aparecer nesses cards como referências para consulta, com confirmação de disponibilidade, elegibilidade, vigência e regras no atendimento. Não publique preços, exemplos de valores de clientes, tabelas comerciais ou ofertas permanentes. Não apresente a promoção empresarial da imagem, vencida em 31/01/2026, como vigente. Promoções são temporárias e variam por bairro; as condições atuais são apresentadas na conversa. Instalação gratuita e primeira cobrança após a instalação são assuntos para confirmar no atendimento, sem prometer gratuidade universal, prazo fixo de um mês, teste gratuito, menor preço ou ausência de demora. Não peça CEP nem dados pessoais em formulários do site. Priorize fontes oficiais para informação editorial. Não invente cobertura, upload, fidelidade, prazos, rankings, autoria ou parcerias. Use linguagem natural, sem contagem de LSI, FAQ automático, urgência ou depoimentos artificiais.",
  visualPalette: { emerald: "#087f65", cobalt: "#1859de", midnight: "#142943" },
  allowAutomaticFaqSchema: false,
  articleNextStep: {
    title: "Converse sobre o pacote que faz sentido pra você.",
    description:
      "Uma pessoa da equipe entende sua necessidade, explica as opções pro seu endereço em São Paulo e ajuda a encaminhar o pedido. Converse pelo WhatsApp.",
    href: "https://wa.me/5511948844107?text=Ol%C3%A1%21%20Vim%20pelo%20blog%20da%20WifiConecta%20e%20quero%20consultar%20os%20pacotes%20atuais%20para%20S%C3%A3o%20Paulo.",
    label: "Consultar pacotes no WhatsApp",
  },
  contentPlan: wifiEditorialPlan as EditorialSiloPlan[],
  supportFolder: { name: "", id: "", url: "" },
  supportSources: [] as DriveSupportSource[],
  collaborators: [] as CollaboratorProfile[],
  manifesto: [
    "A WifiConecta nasceu para facilitar a contratação de internet: uma pessoa entende a necessidade, explica as opções e ajuda a encaminhar o pedido escolhido pelo cliente.",
    "Trabalhamos com Claro, Vivo, TIM e provedores de bairro. A disponibilidade de cada opção é confirmada para o endereço na conversa.",
    "O atendimento é humano, pelo WhatsApp. O pedido só é encaminhado após a confirmação do cliente, com condições e próximos passos explicados.",
    "O site apresenta composições Claro para consulta. Valores, disponibilidade, instalação, primeira cobrança e condições atuais são confirmados somente no WhatsApp.",
    "Fale como quem conhece a rotina de uma casa brasileira: TV, celular, trabalho, estudo e uma conta que precisa caber no mês.",
    "Promoções são temporárias e variam por bairro. Atendimento em São Paulo por enquanto, sem oferta permanente ou garantia de instalação no site.",
    "Operadoras são fornecedoras independentes; WifiConecta é a identidade do projeto.",
  ],
};
