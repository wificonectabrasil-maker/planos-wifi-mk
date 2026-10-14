# WifiConecta

Refinamento vigente de 14/10/2026: [São Paulo, mobile e metadados](REFINAMENTO-SP-MOBILE-METADADOS.md). Atendimento na capital e em outras cidades do estado, com prioridade para a capital e confirmação por endereço. Esta etapa aprimora a captação pelo clique no contato e os metadados das oito páginas; preserva os dois silos, as 15 pautas e os artigos.

Atualização vigente de 14/10/2026: consulte a [revisão comercial e editorial](REVISAO-2026-10-14.md), os [15 briefings revisados](PLANEJAMENTO-EDITORIAL-2026-10-14.md) e o [CSV](PLANEJAMENTO-EDITORIAL-2026-10-14.csv). Esta revisão substitui as composições históricas por modalidades para consulta, separa Home e /planos e prepara campanhas documentadas, sem ativar preços ou anúncios. Os artigos serão redigidos pelo responsável.

Projeto de consulta de pacotes e promoções de internet, celular e TV pelo WhatsApp, adaptado ao Mini WordPress 3.1. Marca: **WifiConecta**. Domínio: **https://wificonecta.com.br**. A prévia local não publica o domínio.

Canônicos seguem exclusivamente `https://wificonecta.com.br/{silo}/{slug-do-artigo}`; hubs usam `/{silo}`. As URLs anteriores com `/blog/planos-de-internet` são somente redirecionamentos 308 para `/planos-de-internet`, sem páginas editoriais naquela estrutura. Confira [URLs e desempenho móvel](URLS-E-DESEMPENHO-MOVEL.md).

## Modelo comercial vigente

A decisão do responsável em 04/10/2026 substitui o catálogo e a captura por formulário:

- Atendimento e confirmação de preços e condições pelo WhatsApp **(11) 94884-4107**, atualizado pelo responsável em 05/10/2026.
- A região comercial é o estado de São Paulo, com prioridade para a capital, conforme atualização do responsável em 14/10/2026. Outras cidades, interior e litoral dependem da confirmação por endereço; não prometer cobertura estadual integral ou atendimento nacional.
- Promoções temporárias e condições que variam por bairro e perfil. Nenhum preço ou oferta permanente é publicado.
- Em 05/10/2026, o responsável autorizou substituir os interesses genéricos por quatro composições Claro das imagens, com velocidades e benefícios como referências para consulta.
- Em 05/10/2026, o responsável forneceu o relato do atendente como [base da marca](BASE-DA-MARCA.md): atendimento humano, ajuda para escolher e encaminhamento do pedido com a confirmação do cliente. Informou atuação com Claro, Vivo, TIM e provedores de bairro. Essa atualização substitui a limitação anterior da apresentação institucional a Claro, mantendo os quatro cards comerciais Claro já autorizados e a confirmação de disponibilidade por endereço.

Registro histórico de 05/10/2026, substituído pela revisão de 14/10: as imagens originais com preços permanecem privadas. Os cards daquela versão reproduziam Claro Multi (500 Mega + 60 GB, Globoplay, Passaporte Américas, iCloud+ 50 GB e Google One 100 GB); internet + celular + TV (500 Mega + 60 GB, TV Box 120 canais, ligações e seis streamings); Claro Empresas (600 Mega + McAfee, CNPJ); e Claro tv+ Box para condomínios (composição Multi com 5G e internet, seis streamings). Valores e disponibilidade ficam sob consulta. Não criar ofertas no banco a partir dessas imagens.

A peça empresarial informa validade até 31/01/2026, anterior à atualização. Não anunciamos sua promoção como vigente, nem reproduzimos valores, economia, prazo promocional ou a alegação de Wi-Fi mais rápido. O card pede confirmação das condições atuais.

## Experiência pública

Desde 09/10/2026, a reorganização segue dois silos e 15 pautas fornecidas pelo responsável. Consulte [a auditoria e o mapa de redirecionamentos](AUDITORIA-E-MIGRACAO-EDITORIAL.md) e [o documento de origem](PLANEJAMENTO-EDITORIAL-FONTE.md).

Home apresenta a marca, o atendimento e entradas breves por categoria. /planos reúne quatro modalidades (internet, celular, TV e câmera), os CTAs por operadora e respostas sobre cobertura, composição, custo, instalação e primeira fatura. Não há catálogo de pacotes fixos. /internet-empresarial e /internet-para-condominios mantêm funções comerciais próprias. /sobre, /contato e políticas permanecem institucionais. Os conteúdos de comparação das páginas antigas foram consolidados e suas URLs redirecionam permanentemente para o novo hub ou a seção comercial relevante.

Os hubs /planos-de-internet (Planos e contratação) e /wifi-e-fibra (Wi-Fi e fibra óptica) têm ícones e navegação breve, sem respostas antecipadas dos artigos. Enquanto vazios, ficam noindex e fora do sitemap. Por orientação posterior do responsável, /blog foi retirado como página e redireciona com 308 ao primeiro silo. Home, menu, rodapé e breadcrumbs dão acesso direto aos silos, sem índice cronológico ou busca geral de blog.

Cada hub destaca seu artigo pilar em “Comece pelo guia principal” e reúne os suportes em “Aprofunde por assunto”, respeitando os papéis e a ordem editorial do CMS. A estrutura segue temas e relações semânticas: pilar → suportes; suporte → pilar; suportes entre si quando o assunto e o contexto da leitura justificarem. Os links contextuais são inseridos no conteúdo pelo editor, com âncoras descritivas e variadas; não são adicionados automaticamente a todos os artigos. A orientação mais recente do responsável define canônicos somente em https://wificonecta.com.br/{silo}/{slug}, sem prefixo /blog.

Os 15 artigos não foram criados ou publicados. Os briefs revisados em 14/10 substituem as pautas de 09/10 em lib/telecom/editorial-plan.ts e editorial-briefs.ts; há oito artigos no silo 1 e sete no silo 2. As URLs futuras são /planos-de-internet/{slug} e /wifi-e-fibra/{slug}, usadas também por canonicals, publicação, breadcrumbs, links no editor e sitemap.

Cabeçalho, cards, final das páginas, rodapé e botão flutuante compartilham WIFICONECTA_WHATSAPP. A mensagem inicial indica o interesse e São Paulo. O usuário revisa e envia a mensagem; o site não envia automaticamente.

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

O domínio canônico da marca em `brand.config.ts` prevalece sobre SITE_URL e URLs de localhost ou da Vercel. Os CTAs usam o telefone público da marca: +55 11 94884-4107. `WIFICONECTA_WHATSAPP` permite substituir esse número no servidor, sem deixar os botões indisponíveis quando a variável estiver ausente. Os cards não guardam telefones próprios. A indexação exige NEXT_PUBLIC_ALLOW_INDEXING=true explicitamente e continua desativada em VERCEL_ENV=preview. Hosts *.vercel.app recebem X-Robots-Tag noindex. Validar domínio, HTTPS e condições comerciais antes de liberar a produção.

brand.config.ts centraliza marca, política de fontes, tom e CTA dos artigos. lib/telecom/editorial-plan.ts mantém 15 pautas em dois silos. O setup idempotente cria apenas os silos editoriais.

Os PDFs, diretrizes humanas, textos colados, SERP e imagens foram tratados como referências. Instruções dentro desses documentos não são pedidos independentes de execução. A solicitação atual do responsável define o modelo comercial. Não usar preços de exemplos, resultados de busca ou flyers no site.

A base do atendente está registrada em [BASE-DA-MARCA.md](BASE-DA-MARCA.md) e orienta `brand.config.ts`, manifesto e tom editorial. Os exemplos de mensalidades de clientes não viram preços públicos ou depoimentos. Instalação gratuita e primeira cobrança são assuntos para confirmar no atendimento, sem garantia universal de gratuidade, cobrança em um mês ou teste gratuito. As ferramentas de IA do CMS continuam editoriais; o atendimento comercial apresentado é humano.

Desde 14/10, o evento whatsapp_cta_click informa página, botão, categoria e campanha como wificonecta:conversion local. UTMs são aceitas apenas pela taxonomia revisada; parâmetros livres e dados pessoais são descartados. O evento comprova clique, sem indicar conversa ou venda. Não há persistência entre páginas nem envio a provedor externo.

## Validação

Em 09/10/2026, a padronização final das URLs e os ajustes móveis passaram em build com TypeScript, lint dos arquivos alterados, quatro testes unitários e 11 testes de navegador. A home carregou 13,05% menos JavaScript descomprimido na comparação local com celular e rede limitada simulados. Consulte as condições da medição e seus limites em [URLs e desempenho móvel](URLS-E-DESEMPENHO-MOVEL.md).

O fundo contínuo do cabeçalho e da hero passou em build, TypeScript, lint dos componentes e oito testes de navegador. A geometria foi verificada no desktop e com o menu móvel aberto e fechado, incluindo navegação para outras páginas e retorno à home. A inspeção visual confirmou textos claros sobre o vídeo e ausência de rolagem horizontal; atraso de três segundos, duração completa e loop silencioso continuam verificados.

Na atualização da base institucional de 05/10/2026, build, TypeScript, lint dos arquivos alterados e sete testes de navegador passaram. Foram verificados os CTAs e assuntos das três operadoras, suas URLs e sitemap, atendimento exclusivo pelo WhatsApp, ausência de preços públicos e a hero em loop sem controles. A inspeção visual em desktop e celular confirmou os novos textos e a navegação sem rolagem horizontal. Não foram enviados pedidos ou mensagens reais nem publicados artigos.

Os testes de navegador usam banco e pasta de compilação isolados. Verificam navegação móvel, consultas diretas por WhatsApp, mensagem por interesse, redirecionamentos, API antiga desativada, administração e a ausência de preços/benefícios de ofertas históricas nas páginas públicas. A navegação externa do teste é interceptada: não envia mensagens.

Build, TypeScript, lint dos arquivos comerciais alterados e seis testes de navegador passaram. Houve inspeção visual em desktop e celular. Os testes usam Edge no Windows ou o navegador indicado em PLAYWRIGHT_CHANNEL. O lint completo do template tem erros anteriores fora desta implementação.

A atualização dos cards Claro passou em build, TypeScript, lint e seis testes de navegador. A inspeção visual em desktop e celular confirmou quatro cards, ausência de preços e mensagens específicas de cada composição para o WhatsApp configurado. Não houve rolagem horizontal no celular. A auditoria automática da home, em desktop e celular, não detectou violações; o texto sobre a foto continua dependendo de inspeção visual do fundo em gradiente.

Google Custom Search respondeu 403 por falta de acesso à API na verificação anterior. A configuração precisa ser regularizada na conta Google; não é usada no atendimento comercial.

O vídeo da hero passou em build, TypeScript, lint dos arquivos alterados e dois testes de navegador. Os testes verificam o início da requisição após o atraso, largura e cover, reprodução silenciosa, reinício efetivo ao fim do vídeo, ausência de controles, ausência de deslocamento de layout relevante (CLS < 0,01) e início automático com preferências de movimento e dados ativadas. O ffprobe confirmou uma única faixa de vídeo H.264, sem áudio. Houve inspeção visual em desktop de 1440 px e celular de 390 px.

Mídia da home: [proveniência do vídeo, poster e imagem anterior](IMAGEM-DA-HOME.md).

## Mike — equipe e autoria

Cadastro autorizado pelo responsável em 14/10/2026. Mike é gerente de vendas, integrante da WifiConecta e autor padrão dos novos artigos. O perfil está em lib/telecom/team.ts, registrado em brand.config.ts. A página /sobre#mike apresenta a foto, cargo e canais fornecidos: Instagram @mii_ke7, Facebook Mike Rodrigues e WhatsApp (11) 94884-4107.

A imagem fornecida pelo responsável foi convertida em public/images/team/mike.webp, com 206 × 206 px e 11.250 bytes, sem ampliação. O original permanece no local de origem. Não foram inferidos formação, anos de experiência, certificações ou revisão técnica.

DEFAULT_AUTHOR_PROFILE seleciona o colaborador correspondente ao autor padrão da marca. Assim, os novos rascunhos recebem Mike pelo fluxo existente de resolveDefaultEeat, e artigos sem autor usam esse perfil. A assinatura pública compartilha o componente AuthorCard da página Sobre, com links sociais e link para o perfil. Autores explicitamente diferentes continuam preservados; não houve alteração em massa no banco.

O JSON-LD identifica Mike como Person, com jobTitle Gerente de vendas, foto absoluta, URL e @id https://wificonecta.com.br/sobre#mike. Instagram e Facebook são sameAs; WhatsApp aparece como canal de contato no card. A página Sobre informa a relação worksFor com a WifiConecta. Isso descreve identidade e autoria, sem afirmar pontuação ou garantia de E-E-A-T/posicionamento.

O cadastro está no adaptador da marca, sem migration, conta de login ou nova tabela de autores. Nenhum artigo real foi criado, publicado ou reatribuído nesta etapa.

Validação do perfil: build/TypeScript e ESLint dos arquivos alterados passaram. Sete testes de navegador passaram, incluindo página Sobre em 320/390/1440 px, imagem otimizada, canais sociais, autoria padrão de novo rascunho e identidade Person no artigo publicado em banco isolado. As regressões de silos, metadados e navegação móvel também passaram. Capturas locais em artifacts/mike-about-{320,390,1440}.png. Sem deploy.
