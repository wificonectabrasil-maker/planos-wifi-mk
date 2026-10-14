// Planning data supplied by the owner, 14/10/2026. Does not publish posts.
const briefs = [
  {
    "number": 1,
    "siloSlug": "planos-de-internet",
    "title": "Como escolher um plano de internet residencial sem cair em uma oferta ruim",
    "slug": "como-escolher-plano-internet-residencial",
    "keyword": "como escolher plano de internet residencial",
    "intent": "Escolha de plano: cobertura, necessidade de uso, custo total, tecnologia, contrato e encaminhamento",
    "excludedTopics": "Não listar promoções como se fossem atuais; não ranquear operadoras de forma absoluta",
    "conversionTarget": "/planos",
    "cta": "Consultar opções disponíveis para meu endereço",
    "links": [
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ],
    "needsSerpValidation": true
  },
  {
    "number": 2,
    "siloSlug": "planos-de-internet",
    "title": "Internet residencial barata: o que comparar além da mensalidade",
    "slug": "internet-residencial-barata-custo-total",
    "keyword": "internet residencial barata",
    "intent": "Diferença entre preço promocional e custo real; reajuste, multa, instalação e serviços adicionais",
    "excludedTopics": "Não virar catálogo comercial nem repetir passo a passo genérico do pilar",
    "conversionTarget": "/planos",
    "cta": "Ver quais condições estão disponíveis",
    "links": [
      1,
      4,
      8
    ],
    "needsSerpValidation": true
  },
  {
    "number": 3,
    "siloSlug": "planos-de-internet",
    "title": "Claro, Vivo ou TIM para casa: como comparar onde você mora",
    "slug": "claro-vivo-tim-internet-residencial",
    "keyword": "claro vivo ou tim internet residencial",
    "intent": "Critérios condicionais por endereço, tecnologia, atendimento e contrato; provedores regionais",
    "excludedTopics": "Não declarar vencedora nacional; não confundir resultados móveis com fibra fixa",
    "conversionTarget": "/planos",
    "cta": "Pedir comparação para meu endereço",
    "links": [
      1,
      4
    ],
    "needsSerpValidation": true
  },
  {
    "number": 4,
    "siloSlug": "planos-de-internet",
    "title": "Como saber quais operadoras de internet atendem minha rua e meu CEP",
    "slug": "operadoras-internet-no-meu-cep",
    "keyword": "internet no meu cep",
    "intent": "Diferença entre CEP e endereço completo, prédio, porta disponível e viabilidade técnica",
    "excludedTopics": "Não prometer consulta instantânea nem cobertura sem integração real",
    "conversionTarget": "/planos",
    "cta": "Conferir disponibilidade com uma pessoa",
    "links": [
      1,
      3,
      8
    ],
    "needsSerpValidation": true
  },
  {
    "number": 5,
    "siloSlug": "planos-de-internet",
    "title": "300, 500, 600 Mega ou 1 Giga: quantos Mega você realmente precisa?",
    "slug": "quantos-mega-de-internet-preciso",
    "keyword": "quantos mega de internet preciso",
    "intent": "Dimensionamento por pessoas, dispositivos simultâneos e atividades; upload e Wi-Fi",
    "excludedTopics": "Não aprofundar diagnósticos de streaming, jogo e home office (Silo 2)",
    "conversionTarget": "/planos",
    "cta": "Encontrar opções para meu tipo de uso",
    "links": [
      1,
      12,
      13,
      14
    ],
    "needsSerpValidation": true
  },
  {
    "number": 6,
    "siloSlug": "planos-de-internet",
    "title": "Combo de internet e celular vale a pena? Veja o que entra na conta",
    "slug": "combo-internet-e-celular-vale-a-pena",
    "keyword": "combo internet e celular",
    "intent": "Comparar combo vs contratos separados, franquia, portabilidade, desconto e permanência",
    "excludedTopics": "Não inserir ofertas expiradas; não abordar TV como tópico central",
    "conversionTarget": "/planos",
    "cta": "Consultar combos para minha casa e celular",
    "links": [
      1,
      2,
      7
    ],
    "needsSerpValidation": true
  },
  {
    "number": 7,
    "siloSlug": "planos-de-internet",
    "title": "Internet, TV Box e streaming: quando compensa contratar tudo junto?",
    "slug": "combo-internet-tv-streaming-vale-a-pena",
    "keyword": "combo internet tv streaming",
    "intent": "Acesso a aplicativos, modalidade, telas, canais, duração dos benefícios e titularidade",
    "excludedTopics": "Não assumir assinatura vitalícia ou gratuita; foco no custo e composição, não Mbps",
    "conversionTarget": "/planos",
    "cta": "Consultar pacote com internet e TV",
    "links": [
      1,
      6,
      12
    ],
    "needsSerpValidation": true
  },
  {
    "number": 8,
    "siloSlug": "planos-de-internet",
    "title": "Instalação de internet: taxas, prazo e quando chega a primeira fatura",
    "slug": "instalacao-internet-primeira-fatura",
    "keyword": "instalação de internet residencial",
    "intent": "Instalação, agendamento, viabilidade, cobrança inicial e fidelidade",
    "excludedTopics": "Não prometer instalação grátis e 30 dias em toda oferta",
    "conversionTarget": "/planos",
    "cta": "Confirmar prazo e primeira cobrança",
    "links": [
      1,
      2,
      4
    ],
    "needsSerpValidation": true
  },
  {
    "number": 9,
    "siloSlug": "wifi-e-fibra",
    "title": "Fibra óptica, cabo ou internet sem fio: entenda o que muda na sua conexão",
    "slug": "fibra-optica-cabo-internet-sem-fio",
    "keyword": "diferença internet fibra óptica e cabo",
    "intent": "Tipos de conexão até residência, trade-offs, infraestrutura, fibra até o imóvel vs HFC",
    "excludedTopics": "Não disputar \"internet fibra óptica\" genérica como se fosse landing de contratação",
    "conversionTarget": "/planos",
    "cta": "Consultar tecnologia disponível no endereço",
    "links": [
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "needsSerpValidation": true
  },
  {
    "number": 10,
    "siloSlug": "wifi-e-fibra",
    "title": "Internet e Wi-Fi são a mesma coisa? Por que seu sinal pode falhar",
    "slug": "diferenca-internet-wifi",
    "keyword": "diferença entre internet e wifi",
    "intent": "Separar contrato/conexão da rede Wi-Fi e dos equipamentos domésticos",
    "excludedTopics": "Não repetir o diagnóstico de dez causas de lentidão do artigo 11",
    "conversionTarget": "/planos",
    "cta": "Entender qual conexão atende minha casa",
    "links": [
      9,
      11
    ],
    "needsSerpValidation": true
  },
  {
    "number": 11,
    "siloSlug": "wifi-e-fibra",
    "title": "Wi-Fi lento: o que testar antes de trocar de plano",
    "slug": "wifi-lento-como-melhorar",
    "keyword": "wifi lento",
    "intent": "Roteador, distância, bandas, interferência, dispositivos, reinício e suporte",
    "excludedTopics": "Não transformar em artigo completo de teste de velocidade nem prometer resolução universal",
    "conversionTarget": "/planos",
    "cta": "Ver se é caso de trocar o plano",
    "links": [
      9,
      10,
      15
    ],
    "needsSerpValidation": true
  },
  {
    "number": 12,
    "siloSlug": "wifi-e-fibra",
    "title": "Quantos Mega precisa para Netflix, YouTube e várias TVs em casa?",
    "slug": "quantos-mega-netflix-youtube-streaming",
    "keyword": "quantos mega para streaming",
    "intent": "Qualidade de vídeo, telas simultâneas, consumo, Wi-Fi; citar recomendações oficiais com data",
    "excludedTopics": "Não fazer comparação de preços ou planos de TV; referenciar artigo 7",
    "conversionTarget": "/planos",
    "cta": "Consultar internet para minha rotina de streaming",
    "links": [
      9,
      5,
      7
    ],
    "needsSerpValidation": true
  },
  {
    "number": 13,
    "siloSlug": "wifi-e-fibra",
    "title": "Internet para jogos online: ping e estabilidade importam mais que Mega?",
    "slug": "internet-para-jogos-ping-estabilidade",
    "keyword": "melhor internet para jogos online",
    "intent": "Latência, jitter, perda de pacotes, cabeamento, servidores e download de jogos",
    "excludedTopics": "Não prometer ping de operadora nem ranking sem medição",
    "conversionTarget": "/planos",
    "cta": "Ver opções adequadas para jogar",
    "links": [
      9,
      5,
      15
    ],
    "needsSerpValidation": true
  },
  {
    "number": 14,
    "siloSlug": "wifi-e-fibra",
    "title": "Internet para home office: como evitar travamentos em videochamadas",
    "slug": "internet-home-office-videochamadas",
    "keyword": "internet para home office",
    "intent": "Upload, estabilidade, Wi-Fi no local de trabalho, videoconferência, conexão reserva",
    "excludedTopics": "Não voltar à explicação genérica de velocidades do artigo 5",
    "conversionTarget": "/planos",
    "cta": "Consultar conexão para trabalhar de casa",
    "links": [
      9,
      5,
      15
    ],
    "needsSerpValidation": true
  },
  {
    "number": 15,
    "siloSlug": "wifi-e-fibra",
    "title": "Como interpretar um teste de velocidade da internet e achar o gargalo",
    "slug": "interpretar-teste-velocidade-internet",
    "keyword": "como interpretar teste de velocidade da internet",
    "intent": "Download, upload, ping, cabo vs Wi-Fi, repetição dos testes e evidências para suporte",
    "excludedTopics": "Não anunciar que temos velocímetro próprio; busca por teste de velocidade quer ferramenta",
    "conversionTarget": "/planos",
    "cta": "Entender se meu plano atual atende",
    "links": [
      9,
      10,
      11,
      13,
      14
    ],
    "needsSerpValidation": true
  }
];
export default briefs;
