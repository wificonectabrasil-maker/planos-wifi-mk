// Static-page acquisition copy. Editorial briefs and published URLs are managed separately.
export const staticPageCopy = {
  "/": {
    title: "WifiConecta | Internet em São Paulo sem complicação",
    description: "Quer instalar internet ou mudar de operadora em SP? Consulte pacotes e promoções para seu endereço com atendimento humano. Fale com a equipe.",
    socialTitle: "Sua internet em São Paulo, com ajuda de gente",
    socialDescription: "Internet, celular, TV ou câmera? Consulte opções na capital e em outras cidades do estado. Uma pessoa ajuda você a fazer o pedido.",
    twitterTitle: "Internet em São Paulo, sem complicação",
  },
  "/planos": {
    title: "Internet residencial em São Paulo | Consulte promoções",
    description: "Consulte pacotes de internet, celular, TV e câmera em São Paulo. Claro, Vivo, TIM e provedores regionais, conforme o endereço. Fale com a equipe.",
    socialTitle: "Internet pra sua casa em SP. Consulte promoções.",
    socialDescription: "Quer instalar ou trocar a internet? Consulte pacotes e combos de diferentes operadoras com atendimento humano para seu endereço.",
    twitterTitle: "Internet pra sua casa em SP: consulte opções",
  },
  "/internet-empresarial": {
    title: "Internet empresarial em São Paulo | Consulte opções",
    description: "Sua empresa depende da conexão? Consulte internet para CNPJ na capital e em outras cidades paulistas. Confira condições e fale com a equipe.",
    socialTitle: "Internet para seu negócio. Vamos conversar?",
    socialDescription: "Conte a rotina da empresa. A WifiConecta consulta opções para CNPJ, disponibilidade e condições da proposta no seu endereço em SP.",
    twitterTitle: "Internet para empresas em SP: fale com a equipe",
  },
  "/internet-para-condominios": {
    title: "Internet para condomínios em SP | Moradores e síndicos",
    description: "Internet no apartamento ou uma demanda do condomínio? Consulte alternativas em São Paulo e fale com a equipe sobre seu caso e a disponibilidade.",
    socialTitle: "Seu apartamento ou seu condomínio precisa de internet?",
    socialDescription: "Moradores, síndicos e administradoras têm necessidades diferentes. Consulte seu caso na capital e em outras cidades do estado.",
    twitterTitle: "Internet para condomínios em SP: consulte seu caso",
  },
  "/sobre": {
    title: "WifiConecta: quem somos e como funciona o atendimento",
    description: "Conheça a WifiConecta: uma pessoa ajuda a consultar internet em São Paulo, entender as condições e encaminhar o pedido. Saiba como funciona.",
    socialTitle: "Uma pessoa facilita seu pedido de internet.",
    socialDescription: "Conheça a WifiConecta, o atendimento humano e a atuação independente para consultar opções na capital e no estado de São Paulo.",
    twitterTitle: "Conheça a WifiConecta e o atendimento humano",
  },
  "/contato": {
    title: "Contato WifiConecta | Fale com uma pessoa no WhatsApp",
    description: "Quer internet, celular, TV ou câmera em São Paulo? Entre em contato com a WifiConecta e consulte o que está disponível para seu endereço.",
    socialTitle: "Conte o que precisa. A WifiConecta te atende.",
    socialDescription: "Internet, celular, TV, câmera, empresa ou condomínio: escolha o assunto e fale com uma pessoa. Atendimento na capital e no estado de SP.",
    twitterTitle: "Fale com a WifiConecta: escolha o que quer conectar",
  },
  "/planos-de-internet": {
    title: "Como escolher internet para casa | Guias WifiConecta",
    description: "Compare critérios para escolher internet residencial: cobertura, velocidades, combos, custos e instalação. Explore os guias por assunto.",
    socialTitle: "Antes de escolher a internet, entenda o que comparar.",
    socialDescription: "Um tema por dúvida: escolha, cobertura, custo e condições. Explore o silo Planos e contratação da WifiConecta.",
    twitterTitle: "Planos e contratação: explore os guias",
  },
  "/wifi-e-fibra": {
    title: "Wi-Fi e fibra óptica | Entenda sua conexão | WifiConecta",
    description: "Wi-Fi lento, fibra ou cabo, streaming e jogos: entenda o que afeta a conexão e o que verificar antes de trocar de plano. Explore os temas.",
    socialTitle: "Sua conexão tem mais coisas além dos Mega.",
    socialDescription: "Entenda tecnologias, sinal Wi-Fi e qualidade da internet. Conheça os temas e os guias da WifiConecta.",
    twitterTitle: "Wi-Fi e fibra: entenda a conexão da sua casa",
  },
} as const;
export type StaticPagePath = keyof typeof staticPageCopy;
