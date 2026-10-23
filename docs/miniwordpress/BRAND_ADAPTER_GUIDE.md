# Adaptar a identidade

`useDefaultAuthorForArticles` é opcional. Ative quando a marca designar seu `defaultAuthor` como responsável por todos os artigos. Na WifiConecta, a configuração está ativa para Mike: apresentação pública, schema e padrões do editor usam o cadastro central de `lib/telecom/team.ts`. Não é necessário migrar os registros para mostrar a assinatura; ao salvar no editor, a identidade padrão é persistida pelos campos existentes. Em projetos com vários autores, omita/desative a opção para preservar a escolha individual. CTA e card são componentes do template, sem inserção automática no texto do post.

A copy comercial de localização é compartilhada por lib/telecom/coverage.ts: capital como prioridade e outras cidades do estado sujeitas à confirmação por endereço. lib/telecom/static-page-copy.ts separa títulos/descrições de busca e chamadas sociais nas oito rotas. staticPageMetadata usa título absoluto para evitar duplicação da marca pelo layout raiz e fornece imagens sociais absolutas com dimensões e alt. Essa adaptação não altera o plano editorial ou o schema do CMS. [Revisão aplicada](../wificonecta/REFINAMENTO-SP-MOBILE-METADADOS.md).

A cor de destaque anteriormente verde da WifiConecta foi substituída por #1773ea nos botões, CTAs, ícones e detalhes públicos, conforme a última escolha do responsável. Hover usa #0e5fc9; links sobre o rodapé escuro usam um tom claro da mesma paleta para manter contraste. A chave visualPalette.emerald é preservada por compatibilidade, com o novo valor azul.

WifiConecta em 14/10/2026: a política de fontes e o manifesto seguem a revisão comercial atual. editorialResourcePages permite revalidar páginas com recomendações de artigos ao salvar/publicar no CMS. Campanhas são uma adaptação da marca, independente das tabelas históricas, e não alteram o schema Core. Indexação desta marca exige liberação explícita; a origem canônica fixa foi preservada.

Edite `brand.config.ts`: nome, URL, descrição, tagline, logo, idioma, contato, autor padrão, transparência de afiliados, nicho, tom e política de fontes.

`instagramUrl` configura o ícone de Instagram da marca no rodapé. Na WifiConecta, o perfil é `https://www.instagram.com/wifi_pedeaqui/`; no preset neutro, o campo começa vazio e o botão não é exibido.

`googleMapsUrl` configura o perfil oficial no Google Maps. O componente de link é compartilhado pelo contato e rodapé; a Home associa o perfil à organização existente em `sameAs`. O preset neutro começa com esse campo vazio. Na WifiConecta, o vínculo usa o CID validado do cadastro. Por solicitação posterior do responsável, `FooterServiceMap` apresenta também um mapa regional no rodapé, com carregamento adiado e sem marcador da empresa. O centro da visualização representa São Paulo, sem atribuir endereço físico ou coordenadas à organização nos dados estruturados. [Auditoria e decisões da integração](../wificonecta/GOOGLE-MAPS-2026-10-23.md).

Na WifiConecta, `useBrandCanonicalOrigin: true` fixa canônicos, Open Graph, JSON-LD, sitemap e auditorias na URL da marca, independentemente do host de desenvolvimento ou deploy. Outros projetos sem essa opção mantêm a resolução por ambiente. `staticSiloNavigation: true` usa o plano configurado da marca no cabeçalho sem consultas de artigos ou grupos ao banco; nesta marca os dois hubs são entradas permanentes da navegação. Os hubs e a home usam cache com revalidação, e as ações administrativas invalidam as URLs ao publicar artigos. O rodapé está no servidor e a navegação pública fica em um módulo pequeno separado do catálogo e de seus validadores.

`whatsappPhone` guarda o telefone público da marca, com DDI e DDD. Os CTAs e o painel comercial usam esse número quando `WIFICONECTA_WHATSAPP` não fornece uma alternativa válida no servidor. O preset começa com esse campo vazio; configure o contato próprio de cada novo projeto.

O plano editorial, manifesto, fontes de apoio e colaboradores começam vazios. Adicione somente materiais do projeto novo. Não invente biografias, experiência, credenciais nem revisão por especialistas. Silos e artigos são criados no admin e armazenados na Turso; o menu e a home usam esses dados automaticamente.

O Core de IA preserva seus contratos JSON e aplica a identidade e os critérios definidos nesse arquivo. Gemini e SERP usam credenciais próprias opcionais. Um projeto sem plano editorial configurado continua podendo editar e publicar artigos.

Substitua `public/brand-logo.svg` e `app/icon.svg`; adapte tokens visuais em `app/globals.css`. Revise as páginas institucionais conforme as práticas do novo projeto antes de publicar.

## Mike — equipe e autoria

Cadastro autorizado pelo responsável em 14/10/2026. Mike é gerente de vendas, integrante da WifiConecta e autor padrão dos novos artigos. O perfil está em lib/telecom/team.ts, registrado em brand.config.ts. A página /sobre#mike apresenta a foto, cargo e canais fornecidos: Instagram @mii_ke7, Facebook Mike Rodrigues e WhatsApp (11) 94884-4107.

A imagem fornecida pelo responsável foi convertida em public/images/team/mike.webp, com 206 × 206 px e 11.250 bytes, sem ampliação. O original permanece no local de origem. Não foram inferidos formação, anos de experiência, certificações ou revisão técnica.

DEFAULT_AUTHOR_PROFILE seleciona o colaborador correspondente ao autor padrão da marca. Assim, os novos rascunhos recebem Mike pelo fluxo existente de resolveDefaultEeat, e artigos sem autor usam esse perfil. A assinatura pública compartilha o componente AuthorCard da página Sobre, com links sociais e link para o perfil. Autores explicitamente diferentes continuam preservados; não houve alteração em massa no banco.

O JSON-LD identifica Mike como Person, com jobTitle Gerente de vendas, foto absoluta, URL e @id https://wificonecta.com.br/sobre#mike. Instagram e Facebook são sameAs; WhatsApp aparece como canal de contato no card. A página Sobre informa a relação worksFor com a WifiConecta. Isso descreve identidade e autoria, sem afirmar pontuação ou garantia de E-E-A-T/posicionamento.

O cadastro está no adaptador da marca, sem migration, conta de login ou nova tabela de autores. Nenhum artigo real foi criado, publicado ou reatribuído nesta etapa.
