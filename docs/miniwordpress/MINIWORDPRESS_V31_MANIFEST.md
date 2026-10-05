# Manifesto técnico — Mini WordPress 3.1

Versão do preset: **3.1.0**. Os metadados legíveis por ferramentas estão em `miniwordpress.template.json`. O guia de cópia e instalação é [TEMPLATE_V31.md](TEMPLATE_V31.md).

## O que acompanha o pacote

- Admin, autenticação, painel editorial, silos, mapa e auditorias.
- Editor Tiptap, autosave, publicação, preview, metadados, extensões e ferramentas de SEO/IA.
- Frontend reutilizável: home, busca, navegação de silos em duas linhas, hubs, artigos e páginas institucionais genéricas.
- Turso/libSQL: 17 tabelas Core, 2 de mídia, 1 de histórico, constraints, índices, foreign keys e 4 triggers de URL.
- Upload e entrega de mídia pelo app, com BLOBs no banco.
- Adaptador WordPress/Contentor, application passwords em hash e IDs numéricos.
- Brand Adapter neutro, migrations, SQL copiável, docs, skills Mini WordPress, testes e lockfile.

## O que cada projeto configura

Identidade, domínio, nicho, tom, fontes, equipe e plano editorial ficam em `brand.config.ts`. Logos e textos institucionais são adaptados à marca. URL/token Turso e credenciais de admin/serviços são próprias de cada instalação e ficam somente no ambiente do projeto.

O banco inicial não contém artigos, silos, mídia, autores, usuários WordPress ou credenciais do projeto de origem. O painel permite criar conteúdo e integrar serviços após a instalação.

## Comandos canônicos

| Comando | Resultado |
| --- | --- |
| `pnpm run template:export` | `artifacts/miniwordpress-3.1.zip`, repositório sem credenciais e caches |
| `pnpm run template:init --email seu@email.com` | `.env.local` com senha e segredo próprios; recusa sobrescrita |
| `pnpm run db:install` | migrations e verificação no destino configurado |
| `pnpm run db:template` | `turso/template/miniwordpress-3.1.sql` e manifest |
| `pnpm run db:migrate` | futuras migrations, preservando dados |
| `pnpm run db:verify` | integridade e estrutura do banco |

`template-manifest.json` dentro do ZIP registra hashes dos arquivos e migrations. `turso/migrations` é a única fonte SQL canônica; o snapshot é gerado e nunca editado manualmente. O pacote é uma cópia do código atual: revise futuras personalizações específicas antes de reexportar uma nova edição neutra.

## Limites de operação

O instalador recebe uma URL e um token de banco; a conta e o banco são criados no painel/CLI Turso da organização de destino. Não há migração automática de contas, conteúdo ou tokens. IA/SERP e Contentor permanecem integrações opcionais com configuração própria.

Para integrar em um projeto existente, preserve seu frontend/identidade quando solicitado e trate o pacote como referência do Core. O instalador recusa bancos com estrutura de outro sistema; use uma Turso própria vazia.

Consulte [PRD](PRD.md), [schema](DATABASE_SCHEMA.md), [exportação](EXPORT_PACKAGE_GUIDE.md), [Brand Adapter](BRAND_ADAPTER_GUIDE.md) e [setup](TURSO_SETUP.md).
