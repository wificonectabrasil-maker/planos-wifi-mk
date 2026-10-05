# PRD — Mini WordPress 3.1

O Mini WordPress 3.1 é um CMS editorial reutilizável, com admin/editor, SEO, silos, frontend público e persistência Turso/libSQL. A instalação neutra começa sem conteúdo de outro projeto. O preset do banco e repositório está documentado em [TEMPLATE_V31.md](TEMPLATE_V31.md).

## Separação de responsabilidades

- Core: painel, editor, autenticação, persistência, mídia, SEO, auditorias, importação e contratos de APIs.
- Brand Adapter: `brand.config.ts`, identidade, domínio, tom, nicho, fontes, equipe, plano editorial, ativos e textos institucionais.
- Frontend Template: home, busca, menu de silos em duas linhas, hubs, posts, índice e rodapé.
- Preset: migrations canônicas, SQL gerado, identidade neutra, ambiente de exemplo e pacote versionado sem credenciais.

O admin é sempre escuro, denso e usa fonte do sistema. A área `.editor-public-preview` preserva o visual do artigo e não recebe os overrides administrativos.

## Requisitos do Core

1. Login administrativo com `ADMIN_EMAIL`, `ADMIN_PASSWORD` e sessão HMAC/HttpOnly protegida por `ADMIN_SESSION_SECRET`. Produção permanece protegida mesmo se uma flag de bypass de desenvolvimento for definida.
2. Editor Tiptap com toolbar, painéis de inteligência e metadados/revisão, autosave, rascunhos, publicação, preview e importação HTML. Extensões de links, imagens, produtos, CTA, tabelas e estrutura H2/H3/H4 seguem disponíveis.
3. Silos, grupos, hierarquia pilar/suporte/auxiliar, ordem e visibilidade de menu, mapa de links, auditoria de saúde e prevenção de canibalização.
4. SEO técnico e editorial: metadados, URLs, JSON-LD, sitemap, robots, entidades, fontes, FAQ/HowTo e critérios de E-E-A-T/YMYL quando o tema exige. Autoria e credenciais não podem ser inventadas.
5. URLs publicadas ficam bloqueadas; despublicar não libera mudanças. Exclusão confirmada usa soft delete e pode preservar redirecionamento.
6. IA mantém contratos de respostas e prompts adaptáveis pelo Brand Adapter. Guardian SEO, melhorar trecho, links internos, higiene de links, termos/LSI, SERP e planejamento visual continuam disponíveis. Serviços externos exigem suas próprias credenciais; o banco não fornece IA nem pesquisa.
7. Upload administrativo otimiza imagens em WebP. Mídia fica em `media_objects`/`media_chunks` na Turso e é servida por `/media/...` com GET/HEAD, ETag, cache e validação. Upload é atômico, com limite de tamanho.
8. Adaptador WordPress/Contentor em `/wp-json/wp/v2` mantém application passwords em hash, IDs numéricos e importação de mídia/posts. Credenciais desse adaptador são separadas do login administrativo.
9. Consultas públicas filtram rascunhos, itens excluídos e silos inativos. Escritas administrativas exigem sessão; tabelas privadas não são expostas publicamente. Tokens Turso ficam no servidor.

## Banco e distribuição

A fonte SQL canônica é `turso/migrations`. São 17 tabelas Core, duas de mídia e uma de controle. Migrations aplicadas são imutáveis e identificadas por checksum. Tipos SQLite/libSQL preservam os contratos JSON, arrays e booleanos do editor.

- `db:migrate`: aplica alterações pendentes com transações e histórico.
- `db:verify`: verifica schema, integridade, mídia e triggers.
- `db:install`: instala e verifica o preset, recusando estruturas incompatíveis.
- `db:template`: gera SQL copiável, sem consultar o banco de um projeto.
- `template:init`: cria ambiente e credenciais próprias sem sobrescrever arquivos existentes.
- `template:export`: gera ZIP do código atual, com identidade neutra e sem dados, credenciais, histórico Git ou caches.

Cada novo projeto usa uma Turso própria. O preset não cria contas de terceiros nem reutiliza tokens. A criação do banco é feita no painel/CLI da conta de destino. Não há seeds de marcas, artigos, autores ou mídia no pacote.

## Critérios de aceitação

- A mesma estrutura pode ser instalada por migrations ou SQL gerado, sem divergência no catálogo.
- A instalação inicial não insere conteúdo; a repetição das migrations preserva conteúdo existente.
- O ZIP contém código, frontend, docs, skills, lockfile, migrations e identidade neutra verificáveis por manifest de hashes.
- Credenciais do projeto de origem não aparecem no pacote; novos ambientes ganham senha e segredo distintos.
- `test:template` e `test:database` usam somente bancos isolados.
- Fluxos administrativos e públicos são validados com testes de navegador quando seus contratos mudam.
- Dependências e build podem ser executados a partir de uma cópia extraída.

Consulte [arquitetura](ARCHITECTURE.md), [mapa](REPOSITORY_MAP.md), [schema](DATABASE_SCHEMA.md), [UI](ADMIN_UI_SYSTEM.md), [editor](EDITOR_SYSTEM.md) e [identidade](BRAND_ADAPTER_GUIDE.md).
