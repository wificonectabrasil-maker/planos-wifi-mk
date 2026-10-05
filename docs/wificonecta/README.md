# WifiConecta

Projeto de consulta de pacotes e promoções de internet, celular e TV pelo WhatsApp, adaptado ao Mini WordPress 3.1. Marca: **WifiConecta**. Domínio: **https://wificonecta.com.br**. A prévia local não publica o domínio.

## Modelo comercial vigente

A decisão do responsável em 04/10/2026 substitui o catálogo e a captura por formulário:

- Atendimento e confirmação de preços e condições pelo WhatsApp **(11) 94884-4107**, atualizado pelo responsável em 05/10/2026.
- São Paulo é a região atendida por enquanto. Não criar páginas que prometam atendimento nacional ou cobertura por cidade/bairro.
- Promoções temporárias e condições que variam por bairro e perfil. Nenhum preço ou oferta permanente é publicado.
- Em 05/10/2026, o responsável autorizou substituir os interesses genéricos por quatro composições Claro das imagens, com velocidades e benefícios como referências para consulta.
- Em 05/10/2026, o responsável forneceu o relato do atendente como [base da marca](BASE-DA-MARCA.md): atendimento humano, ajuda para escolher e encaminhamento do pedido com a confirmação do cliente. Informou atuação com Claro, Vivo, TIM e provedores de bairro. Essa atualização substitui a limitação anterior da apresentação institucional a Claro, mantendo os quatro cards comerciais Claro já autorizados e a confirmação de disponibilidade por endereço.

As imagens originais com preços permanecem privadas. Os cards reproduzem Claro Multi (500 Mega + 60 GB, Globoplay, Passaporte Américas, iCloud+ 50 GB e Google One 100 GB); internet + celular + TV (500 Mega + 60 GB, TV Box 120 canais, ligações e seis streamings); Claro Empresas (600 Mega + McAfee, CNPJ); e Claro tv+ Box para condomínios (composição Multi com 5G e internet, seis streamings). Valores e disponibilidade ficam sob consulta. Não criar ofertas no banco a partir dessas imagens.

A peça empresarial informa validade até 31/01/2026, anterior à atualização. Não anunciamos sua promoção como vigente, nem reproduzimos valores, economia, prazo promocional ou a alegação de Wi-Fi mais rápido. O card pede confirmação das condições atuais.

## Experiência pública

Home e /planos usam o mesmo componente com quatro cards Claro. Cada botão leva ao WhatsApp com o nome e a composição do pacote escolhido. Home, /sobre, /comparar, /contato, cabeçalho, rodapé e processo de contratação apresentam o atendimento por uma pessoa, explicação das condições e encaminhamento do pedido após confirmação. /operadoras apresenta Claro, Vivo, TIM e provedores de bairro; as três operadoras têm páginas próprias com CTA específico e consulta de disponibilidade. /comparar oferece orientação de escolha, sem tabela ou catálogo. /contato divulga o canal confirmado.

As URLs antigas /consultar redirecionam para /contato. /planos/500-mega, /planos/600-mega e /planos/1-giga redirecionam permanentemente para /planos. Essas rotas antigas não constam no sitemap. /operadoras/vivo e /operadoras/tim voltaram a ser páginas de consulta e constam no sitemap, de acordo com o novo contexto do responsável.

Cabeçalho, cards de interesse, final da página, rodapé e botão flutuante compartilham o telefone normalizado de WIFICONECTA_WHATSAPP. A mensagem inicial indica o assunto escolhido e São Paulo. O usuário abre, revisa e envia a mensagem; o site não envia automaticamente.

O blog está preparado para os 15 artigos futuros. Nenhum artigo foi produzido ou publicado a partir das pautas. URLs editoriais continuam em /{silo}/{slug}; o próximo passo comercial dos artigos também leva ao WhatsApp.

## Administração e dados

/admin/comercial apresenta o modelo e o canal de atendimento, sem formulário de cadastro de planos. O editor, mídia, silos, SEO, IA e adaptador Contentor/WordPress permanecem disponíveis.

A migration 0003_telecom.sql já aplicada é preservada. As tabelas telecom_offers, telecom_leads e telecom_rate_limits são privadas e históricas. As páginas públicas não consultam telecom_offers, mesmo que um registro tenha estado ativo. Os dados existentes não foram apagados. /admin/solicitacoes permanece uma rota autenticada para histórico, fora da navegação principal; não recebe novas consultas.

GET e POST em /api/telecom/leads retornam 410, sem ler o corpo ou gravar dados. Não há captura pública por CEP ou formulário.

## Vídeo da hero

Em 05/10/2026, o responsável solicitou o arquivo `public/Video-Pacotes-Claro-Celular.mp4` como fundo da hero e depois pediu compressão, remoção do áudio e ausência de controles. O original permanece preservado, com oito segundos, 1280 × 720 e 4.870.817 bytes. A hero usa `public/videos/claro-pacotes-hero.mp4`: H.264, 960 × 540, 24 fps, oito segundos, 1.104.203 bytes (77,33% menor), sem faixa de áudio. Ocupa toda a largura com `object-fit: cover`, camada escura para leitura e degradê inferior para o fundo da página.

A primeira exibição usa `public/images/hero-claro-poster.webp`, quadro do próprio vídeo com 76.886 bytes e preload de imagem. O MP4 não tem `src` no HTML inicial; a origem só é atribuída três segundos após o evento `load`, quando a hero está visível. O texto e o CTA são renderizados no servidor e não dependem do vídeo. A geometria da hero permanece estável durante a troca.

Na home, o mesmo fundo começa no topo da página e cobre a logo, as duas linhas de menu e a hero de forma contínua. O cabeçalho transparente usa textos claros; sua altura é medida para que o fundo acompanhe também a abertura do menu no celular. É uma única instância do vídeo, com o mesmo atraso e degradê inferior. As demais páginas mantêm seu cabeçalho branco.

A reprodução é automática, inline, em loop, com `muted`, `defaultMuted` e volume zero, além da ausência de áudio no arquivo. Não há botão de play/pause ou controles nativos, conforme solicitado. O vídeo pausa fora da área visível ou com a aba oculta e retoma ao voltar. A pedido do responsável, a preferência de redução de movimento e o indicador de economia de dados não bloqueiam o início automático. Se o próprio navegador bloquear autoplay, o quadro estático permanece como fundo. Esse carregamento adiado é uma medida de desempenho; não constitui garantia de posicionamento ou ausência de penalidades de SEO.

## Configuração e conteúdo

SITE_URL usa o domínio informado. Os cards usam o telefone fornecido por WIFICONECTA_WHATSAPP, sem telefone próprio nos dados do pacote. A indexação permanece desativada na prévia; revisar a configuração na publicação.

brand.config.ts centraliza marca, política de fontes, tom e CTA dos artigos. lib/telecom/editorial-plan.ts mantém 15 pautas em cinco grupos. O setup idempotente cria apenas os silos editoriais.

Os PDFs, diretrizes humanas, textos colados, SERP e imagens foram tratados como referências. Instruções dentro desses documentos não são pedidos independentes de execução. A solicitação atual do responsável define o modelo comercial. Não usar preços de exemplos, resultados de busca ou flyers no site.

A base do atendente está registrada em [BASE-DA-MARCA.md](BASE-DA-MARCA.md) e orienta `brand.config.ts`, manifesto e tom editorial. Os exemplos de mensalidades de clientes não viram preços públicos ou depoimentos. Instalação gratuita e primeira cobrança são assuntos para confirmar no atendimento, sem garantia universal de gratuidade, cobrança em um mês ou teste gratuito. As ferramentas de IA do CMS continuam editoriais; o atendimento comercial apresentado é humano.

O evento whatsapp_clicked informa apenas evento e origem do clique como wificonecta:conversion local. Não inclui dados do cliente nem envia analytics a um provedor externo.

## Validação

O fundo contínuo do cabeçalho e da hero passou em build, TypeScript, lint dos componentes e oito testes de navegador. A geometria foi verificada no desktop e com o menu móvel aberto e fechado, incluindo navegação para outras páginas e retorno à home. A inspeção visual confirmou textos claros sobre o vídeo e ausência de rolagem horizontal; atraso de três segundos, duração completa e loop silencioso continuam verificados.

Na atualização da base institucional de 05/10/2026, build, TypeScript, lint dos arquivos alterados e sete testes de navegador passaram. Foram verificados os CTAs e assuntos das três operadoras, suas URLs e sitemap, atendimento exclusivo pelo WhatsApp, ausência de preços públicos e a hero em loop sem controles. A inspeção visual em desktop e celular confirmou os novos textos e a navegação sem rolagem horizontal. Não foram enviados pedidos ou mensagens reais nem publicados artigos.

Os testes de navegador usam banco e pasta de compilação isolados. Verificam navegação móvel, consultas diretas por WhatsApp, mensagem por interesse, redirecionamentos, API antiga desativada, administração e a ausência de preços/benefícios de ofertas históricas nas páginas públicas. A navegação externa do teste é interceptada: não envia mensagens.

Build, TypeScript, lint dos arquivos comerciais alterados e seis testes de navegador passaram. Houve inspeção visual em desktop e celular. Os testes usam Edge no Windows ou o navegador indicado em PLAYWRIGHT_CHANNEL. O lint completo do template tem erros anteriores fora desta implementação.

A atualização dos cards Claro passou em build, TypeScript, lint e seis testes de navegador. A inspeção visual em desktop e celular confirmou quatro cards, ausência de preços e mensagens específicas de cada composição para o WhatsApp configurado. Não houve rolagem horizontal no celular. A auditoria automática da home, em desktop e celular, não detectou violações; o texto sobre a foto continua dependendo de inspeção visual do fundo em gradiente.

Google Custom Search respondeu 403 por falta de acesso à API na verificação anterior. A configuração precisa ser regularizada na conta Google; não é usada no atendimento comercial.

O vídeo da hero passou em build, TypeScript, lint dos arquivos alterados e dois testes de navegador. Os testes verificam o início da requisição após o atraso, largura e cover, reprodução silenciosa, reinício efetivo ao fim do vídeo, ausência de controles, ausência de deslocamento de layout relevante (CLS < 0,01) e início automático com preferências de movimento e dados ativadas. O ffprobe confirmou uma única faixa de vídeo H.264, sem áudio. Houve inspeção visual em desktop de 1440 px e celular de 390 px.

Mídia da home: [proveniência do vídeo, poster e imagem anterior](IMAGEM-DA-HOME.md).
