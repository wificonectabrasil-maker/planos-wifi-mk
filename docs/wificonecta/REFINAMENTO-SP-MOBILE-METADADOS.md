# WifiConecta — São Paulo, mobile e metadados

14 de outubro de 2026. Implementação local, sem publicação ou alteração de configuração remota.

## Escopo aplicado

A orientação vigente do responsável é captar interessados pelo clique no contato, com prioridade para celulares. A comunicação agora abrange a capital e outras cidades do estado de São Paulo; a capital é a prioridade. Grande São Paulo, interior e litoral aparecem como regiões de consulta, com opções e disponibilidade confirmadas por endereço. Isso não representa cobertura garantida em todo o estado.

As auditorias anexadas foram usadas como referências. Não foram tratadas como autorização para publicar campanhas, integrar ferramentas ou alterar artigos. Não houve nova pesquisa de posições por dispositivo; não afirmamos equivalência com resultados atuais do Google.

## Oferta e navegação

- Home: proposta de atendimento humano, instalação ou troca de operadora e CTA “Consultar promoções no WhatsApp”.
- /planos: modalidades e CTA “Consultar promoções para meu endereço”; quatro atalhos nativos levam a internet, internet + celular, TV/streaming e internet + câmera. Os cards vêm antes dos detalhes de disponibilidade e contratação.
- Empresas e condomínios: funções comerciais próprias, com disponibilidade confirmada para cada endereço. Contato solicita cidade e bairro na conversa.
- Claro, Vivo, TIM e provedores regionais aparecem como possibilidades de consulta. Não foram publicados preços históricos, benefícios universais ou promessas de parceria oficial. A configuração de campanhas continua vazia.
- CTAs continuam no canal público +55 11 94884-4107. Não houve análise de conversas, integração com CRM ou envio de mensagens.
- Cor de destaque preservada conforme a escolha mais recente: #1773ea, hover #0e5fc9.

## Títulos e descrições

Os valores abaixo foram extraídos do HTML renderizado antes e depois, não apenas da configuração. A matriz fica em lib/telecom/static-page-copy.ts e é aplicada por staticPageMetadata. Títulos completos evitam a repetição da marca pelo template raiz. A intenção dos hubs permanece editorial; /planos concentra a consulta comercial residencial.

| URL | Título anterior | Título atual |
| --- | --- | --- |
| / | WifiConecta \| Peça internet com ajuda de verdade no WhatsApp | WifiConecta \| Internet em São Paulo sem complicação |
| /planos | Planos de internet residencial em São Paulo \| WifiConecta | Internet residencial em São Paulo \| Consulte promoções |
| /internet-empresarial | Internet empresarial em São Paulo: consulte opções \| WifiConecta | Internet empresarial em São Paulo \| Consulte opções |
| /internet-para-condominios | Internet para condomínios em São Paulo \| WifiConecta | Internet para condomínios em SP \| Moradores e síndicos |
| /sobre | Sobre a WifiConecta: atendimento humano \| WifiConecta | WifiConecta: quem somos e como funciona o atendimento |
| /contato | Fale com a WifiConecta no WhatsApp \| WifiConecta | Contato WifiConecta \| Fale com uma pessoa no WhatsApp |
| /planos-de-internet | Escolher internet para casa: planos e contratação \| WifiConecta | Como escolher internet para casa \| Guias WifiConecta |
| /wifi-e-fibra | Wi-Fi, fibra óptica e qualidade da conexão \| WifiConecta | Wi-Fi e fibra óptica \| Entenda sua conexão \| WifiConecta |

### Copy emitida por página

Open Graph e Twitter usam chamadas próprias para compartilhamento. A descrição social é compartilhada entre os dois; os títulos podem diferir.

#### /

- Description: Quer instalar internet ou mudar de operadora em SP? Consulte pacotes e promoções para seu endereço com atendimento humano. Fale com a equipe.
- Open Graph: Sua internet em São Paulo, com ajuda de gente
- Descrição social: Internet, celular, TV ou câmera? Consulte opções na capital e em outras cidades do estado. Uma pessoa ajuda você a fazer o pedido.
- Twitter: Internet em São Paulo, sem complicação
- Imagem: https://wificonecta.com.br/social/inicio
- Alt da imagem: Internet pra sua casa. Sem virar uma novela.

#### /planos

- Description: Consulte pacotes de internet, celular, TV e câmera em São Paulo. Claro, Vivo, TIM e provedores regionais, conforme o endereço. Fale com a equipe.
- Open Graph: Internet pra sua casa em SP. Consulte promoções.
- Descrição social: Quer instalar ou trocar a internet? Consulte pacotes e combos de diferentes operadoras com atendimento humano para seu endereço.
- Twitter: Internet pra sua casa em SP: consulte opções
- Imagem: https://wificonecta.com.br/social/planos
- Alt da imagem: Internet residencial em São Paulo

#### /internet-empresarial

- Description: Sua empresa depende da conexão? Consulte internet para CNPJ na capital e em outras cidades paulistas. Confira condições e fale com a equipe.
- Open Graph: Internet para seu negócio. Vamos conversar?
- Descrição social: Conte a rotina da empresa. A WifiConecta consulta opções para CNPJ, disponibilidade e condições da proposta no seu endereço em SP.
- Twitter: Internet para empresas em SP: fale com a equipe
- Imagem: https://wificonecta.com.br/social/internet-empresarial
- Alt da imagem: Internet para a rotina do seu negócio

#### /internet-para-condominios

- Description: Internet no apartamento ou uma demanda do condomínio? Consulte alternativas em São Paulo e fale com a equipe sobre seu caso e a disponibilidade.
- Open Graph: Seu apartamento ou seu condomínio precisa de internet?
- Descrição social: Moradores, síndicos e administradoras têm necessidades diferentes. Consulte seu caso na capital e em outras cidades do estado.
- Twitter: Internet para condomínios em SP: consulte seu caso
- Imagem: https://wificonecta.com.br/social/internet-para-condominios
- Alt da imagem: Seu apartamento ou seu condomínio?

#### /sobre

- Description: Conheça a WifiConecta: uma pessoa ajuda a consultar internet em São Paulo, entender as condições e encaminhar o pedido. Saiba como funciona.
- Open Graph: Uma pessoa facilita seu pedido de internet.
- Descrição social: Conheça a WifiConecta, o atendimento humano e a atuação independente para consultar opções na capital e no estado de São Paulo.
- Twitter: Conheça a WifiConecta e o atendimento humano
- Imagem: https://wificonecta.com.br/social/sobre
- Alt da imagem: Conheça a WifiConecta

#### /contato

- Description: Quer internet, celular, TV ou câmera em São Paulo? Entre em contato com a WifiConecta e consulte o que está disponível para seu endereço.
- Open Graph: Conte o que precisa. A WifiConecta te atende.
- Descrição social: Internet, celular, TV, câmera, empresa ou condomínio: escolha o assunto e fale com uma pessoa. Atendimento na capital e no estado de SP.
- Twitter: Fale com a WifiConecta: escolha o que quer conectar
- Imagem: https://wificonecta.com.br/social/contato
- Alt da imagem: Converse com uma pessoa

#### /planos-de-internet

- Description: Compare critérios para escolher internet residencial: cobertura, velocidades, combos, custos e instalação. Explore os guias por assunto.
- Open Graph: Antes de escolher a internet, entenda o que comparar.
- Descrição social: Um tema por dúvida: escolha, cobertura, custo e condições. Explore o silo Planos e contratação da WifiConecta.
- Twitter: Planos e contratação: explore os guias
- Imagem: https://wificonecta.com.br/social/planos-de-internet
- Alt da imagem: Planos e contratação

#### /wifi-e-fibra

- Description: Wi-Fi lento, fibra ou cabo, streaming e jogos: entenda o que afeta a conexão e o que verificar antes de trocar de plano. Explore os temas.
- Open Graph: Sua conexão tem mais coisas além dos Mega.
- Descrição social: Entenda tecnologias, sinal Wi-Fi e qualidade da internet. Conheça os temas e os guias da WifiConecta.
- Twitter: Wi-Fi e fibra: entenda a conexão da sua casa
- Imagem: https://wificonecta.com.br/social/wifi-e-fibra
- Alt da imagem: Wi-Fi e fibra óptica

As oito páginas emitem canonical e URL social no domínio https://wificonecta.com.br. Imagens sociais têm endereço absoluto, dimensões 1200 × 630 e texto alternativo; Twitter usa summary_large_image. Os CTAs dos metadados são convites textuais, e não botões clicáveis independentes no resultado da busca.

A [simulação de snippets](../../artifacts/sp-mobile-snippets.html) usa a copy efetivamente emitida. É uma prévia editorial local, não um resultado real ou uma reprodução do corte do Google. O buscador pode reescrever títulos e descrições conforme a consulta; o ganho de CTR precisa ser medido após publicação e indexação, sem promessa de posicionamento.

Referências oficiais: [títulos dos resultados](https://developers.google.com/search/docs/appearance/title-link?hl=pt-br), [snippets](https://developers.google.com/search/docs/appearance/snippet?hl=pt-br) e [indexação com prioridade móvel](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=pt-br).

## Ajustes para celulares

Foram verificados 320, 360, 390, 430, 768 e 1440 px, além de 844 × 390 em paisagem. As oito rotas passaram sem rolagem horizontal. Os CTAs comerciais principais ficam na primeira tela nas alturas testadas a partir de 800 px; alvos verificados têm pelo menos 44 × 44 px. Em 320 × 844, o final do CTA da Home ficou em 540 px e o de /planos em 521 px. Isso descreve as condições testadas, não todos os tamanhos de tela ou configurações de fonte.

Os atalhos têm área de toque confortável e indicam o card de destino. O menu compacto atende também celulares em paisagem; Escape fecha e devolve o foco ao botão. Foco visível, margem de âncora e safe area do contato flutuante foram ajustados. O conteúdo essencial continua no HTML do servidor em desktop e celular. Não foi adicionado pacote de interface ou serviço externo.

| Evidência em 390 px | Antes | Depois |
| --- | --- | --- |
| Home | [Captura](../../artifacts/sp-mobile-before-home-390.png) | [Captura](../../artifacts/sp-mobile-after-home-390.png) |
| /planos | [Captura](../../artifacts/sp-mobile-before-planos-390.png) | [Captura](../../artifacts/sp-mobile-after-planos-390.png) |

Outras larguras estão em artifacts/sp-mobile-after-{home,planos}-{largura}.png. Há [prévia social de /planos](../../artifacts/sp-mobile-social-planos.png) e [simulação móvel dos snippets](../../artifacts/sp-mobile-snippets-390.png). Artefatos de QA são locais e ignorados pelo Git; não fazem parte do deploy.

## Desempenho e validação

Build de produção local medido com Edge headless, emulação Pixel 5, CPU 4× mais lenta, latência de 80 ms e download de aproximadamente 1,6 Mbps. Cada página usou um contexto novo. A leitura inicial foi feita 1,2 s após load, antes da requisição adiada do vídeo. Uma abertura/fechamento do menu forneceu uma amostra de interação; ela não equivale a INP de usuários reais.

| Página | LCP local | CLS local | JavaScript decodificado | Amostra de interação |
| --- | ---: | ---: | ---: | ---: |
| / | 1.720 s | 0 | 440728 bytes | 200 ms |
| /planos | 1.236 s | 0 | 441290 bytes | 56 ms |

O JavaScript aumentou 113 bytes por página em relação à medição local anterior. Os tempos são uma amostra de laboratório e variam; não demonstram melhoria de Core Web Vitals de campo nem garantem CTR, classificação ou ausência de penalidades.

- pnpm build: passou, incluindo TypeScript e geração de páginas.
- ESLint dos arquivos TS/TSX alterados: passou. O lint global não foi reexecutado nesta etapa; a revisão anterior identificou 57 erros preexistentes, registrados separadamente.
- Playwright: 15 testes passaram, cobrindo conteúdo comercial, arquitetura editorial, links de contato, vídeo, metadados no HTML e navegação móvel.
- Os testes usam banco isolado de E2E; não houve leitura ou alteração de artigos e rascunhos reais.
- Nove arquivos protegidos mantiveram os mesmos hashes: planos e briefings editoriais, wrappers dos hubs, campanhas, indexação, canonical, origem e redirecionamentos.

Evidências: [metadados antes](../../artifacts/sp-mobile-metadata-before.json), [depois](../../artifacts/sp-mobile-metadata-after.json), [viewports](../../artifacts/sp-mobile-viewports.json), [métricas](../../artifacts/sp-mobile-production-metrics.json) e [hashes de referência](../../artifacts/sp-mobile-protected-before.json).

## Preservado e fora desta etapa

Dois silos, 15 pautas, slugs, hierarquia, artigos e rascunhos permanecem como estavam. Os hubs receberam apenas os metadados na fábrica compartilhada; não ganharam conteúdo que antecipe os artigos. A política vigente de noindex dos hubs vazios e os bloqueios de preview foram preservados.

O vídeo continua completo, silencioso, sem controles, em loop e com origem atribuída três segundos após load. Não alteramos sua reprodução por preferências de movimento ou economia de dados, conforme a orientação humana anterior.

Não foram alterados banco real, indexação, domínio, DNS ou ambiente remoto. Não houve commit, push ou deploy. O servidor local do responsável não foi interrompido; os servidores temporários de teste foram encerrados. Após publicação autorizada, validar as URLs e prévias no domínio e acompanhar impressões, cliques e CTR por página/dispositivo no Search Console. O objetivo desta etapa permanece o contato; a estratégia posterior ao atendimento será desenvolvida com dados futuros.
