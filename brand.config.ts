import type { EditorialSiloPlan } from "./lib/editorial/content-plan";
import type { DriveSupportSource } from "./lib/editorial/drive-support";
import type { CollaboratorProfile } from "./lib/site/collaborators";
import { wifiEditorialPlan } from "./lib/telecom/editorial-plan";

// Each new project supplies its own identity, editorial plan and sources.
export const brandConfig = {
  name: "WifiConecta",
  url: "https://wificonecta.com.br",
  description:
    "Consulte promoções de internet, celular, TV e combos pelo WhatsApp da WifiConecta. Atendimento em São Paulo, com pacotes e condições apresentados na conversa.",
  tagline: "Sua casa conectada. Sua escolha descomplicada.",
  locale: "pt-BR",
  contactEmail: "",
  logo: "/brand-logo.svg",
  defaultAuthor: "Equipe WifiConecta",
  affiliateDisclosure:
    "A WifiConecta é uma plataforma independente. Marcas e serviços pertencem às respectivas operadoras. Consulte disponibilidade e condições antes de contratar.",
  niche:
    "Atendimento pelo WhatsApp para promoções temporárias de internet residencial, empresarial, condomínios, celular, TV e streaming em São Paulo",
  tone: [
    "português brasileiro de conversa",
    "direto",
    "próximo",
    "humor leve nas chamadas",
    "situações reais do dia a dia",
    "clareza em preços e contratação",
  ],
  sourcePolicy:
    "Atendimento e apresentação de pacotes exclusivamente pelo WhatsApp, por enquanto em São Paulo. Não publique preços, tabelas comerciais, planos fixos, velocidades como ofertas permanentes ou combinações garantidas de benefícios. Promoções são temporárias e variam conforme bairro, endereço e elegibilidade; as condições atuais são apresentadas na conversa. Não peça CEP nem dados pessoais em formulários do site. Materiais promocionais enviados servem de contexto e não autorizam replicar seus valores ou afirmar que seus benefícios estão sempre incluídos. Priorize fontes oficiais para informação editorial. Não invente cobertura, upload, fidelidade, prazos, rankings, autoria ou parcerias. Use linguagem natural, sem contagem de LSI, FAQ automático, urgência ou depoimentos artificiais.",
  visualPalette: { emerald: "#087f65", cobalt: "#1859de", midnight: "#142943" },
  allowAutomaticFaqSchema: false,
  articleNextStep: {
    title: "Converse sobre o pacote que faz sentido pra você.",
    description:
      "Atendimento em São Paulo pelo WhatsApp. As promoções e condições atuais são apresentadas na conversa, de acordo com o seu bairro e a sua necessidade.",
    href: "https://wa.me/5511948844107?text=Ol%C3%A1%21%20Vim%20pelo%20blog%20da%20WifiConecta%20e%20quero%20consultar%20os%20pacotes%20atuais%20para%20S%C3%A3o%20Paulo.",
    label: "Consultar pacotes no WhatsApp",
  },
  contentPlan: wifiEditorialPlan as EditorialSiloPlan[],
  supportFolder: { name: "", id: "", url: "" },
  supportSources: [] as DriveSupportSource[],
  collaborators: [] as CollaboratorProfile[],
  manifesto: [
    "O site orienta e inicia a conversa. Os pacotes, valores e vantagens atuais são apresentados somente no WhatsApp.",
    "Fale como quem conhece a rotina de uma casa brasileira: TV, celular, trabalho, estudo e uma conta que precisa caber no mês.",
    "Promoções são temporárias e variam por bairro. Atendimento em São Paulo por enquanto, sem oferta permanente ou garantia de instalação no site.",
    "Operadoras são fornecedoras independentes; WifiConecta é a identidade do projeto.",
  ],
};
