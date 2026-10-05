# WifiConecta — Mini WordPress 3.1

Projeto de consulta de pacotes e promoções de internet, celular e TV pelo WhatsApp, com atendimento atual em São Paulo. Desenvolvido sobre o Mini WordPress 3.1 em Next.js 16, React 19 e Tailwind 4, com Turso/libSQL para conteúdo, silos, auditorias, cache SERP, credenciais WordPress, visualizações e imagens. O site não publica valores ou planos fixos e não captura consultas por formulário.

Consulte [o guia WifiConecta](docs/wificonecta/README.md) para páginas, operação comercial e validação. `/admin/comercial` descreve o atendimento pelo WhatsApp (11) 94884-4107. Os comandos abaixo preservam o funcionamento do template editorial.

O gerenciador padrão em projetos novos e existentes é **pnpm**. Este preset fixa `pnpm@10.33.0` em `package.json` e usa `pnpm-lock.yaml`. No Windows, `pnpm.cmd` executa os mesmos comandos; `corepack pnpm` permite usar a versão fixada no projeto.

## Preset para novos projetos e contas Turso

`pnpm run template:export` gera `artifacts/miniwordpress-3.1.zip` com código, docs, skills e schema. Credenciais e conteúdo do projeto ficam fora do pacote.

Na cópia extraída:

```powershell
pnpm install --frozen-lockfile
pnpm.cmd run template:init --email seu@email.com
# Preencha TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no .env.local gerado.
pnpm.cmd run db:install
pnpm.cmd run dev
```

`template:init` gera uma senha própria em `ADMIN_PASSWORD`, preservando arquivos de ambiente existentes. Para copiar somente o SQL: `pnpm run db:template`; o resultado fica em `turso/template/miniwordpress-3.1.sql`.

Veja o [guia completo do preset 3.1](docs/miniwordpress/TEMPLATE_V31.md), incluindo instalação em outra conta, SQL manual e seleção de ambiente.

## Preparar um projeto

1. Instale as dependências com pnpm 10: `pnpm install`.
2. Copie `.env.exemplo` para `.env.local` e preencha URL/token da Turso e credenciais do administrador. Gere um `ADMIN_SESSION_SECRET` aleatório de pelo menos 32 caracteres.
3. Execute `pnpm run turso:check`, `pnpm run db:migrate` e `pnpm run db:verify`.
4. Configure identidade, tom, fontes e equipe em `brand.config.ts` e substitua o logo genérico em `public/brand-logo.svg`.
5. Execute `pnpm run dev`, acesse `/admin` e crie os silos e artigos do novo projeto.

Para produção, configure as mesmas variáveis no servidor e use o domínio real em `SITE_URL`. Habilite indexação quando o conteúdo estiver pronto. O app exige Node.js para processamento de imagens.

## Funcionalidades

- Editor Tiptap, autosave, rascunhos, revisão, publicação, agendamento editorial, preview responsivo e importação HTML.
- Silos, grupos, hierarquia pilar/suporte/auxiliar, mapa, links internos e auditorias.
- SEO, entidades, anticanibalização, metadados, JSON-LD, sitemap e robots.
- URLs publicadas imutáveis, exclusão confirmada, soft delete e redirecionamentos.
- Imagens otimizadas em WebP no upload do admin, armazenadas como BLOBs na Turso e servidas em `/media/...`, com cache e ETag.
- Adaptador WordPress/Contentor em `/wp-json/wp/v2`: application passwords, importação de posts, mídia e IDs numéricos.
- Pesquisa SERP e sugestões Gemini opcionais, com suas próprias credenciais. O banco não fornece esses serviços.

## Verificar

`pnpm run test:database` valida schema, codecs, joins, visibilidade, transações, URLs e mídia em memória.

`pnpm test` cria um banco local isolado em `.cache-tests` e verifica o fluxo real no navegador. Instale Chromium com `pnpm exec playwright install chromium`, ou use `PLAYWRIGHT_CHANNEL=chrome` quando Chrome estiver instalado. Os testes não alteram a Turso remota.

`pnpm run build` valida a compilação de produção.

Documentação: [preset 3.1](docs/miniwordpress/TEMPLATE_V31.md), [setup Turso](docs/miniwordpress/TURSO_SETUP.md), [schema](docs/miniwordpress/DATABASE_SCHEMA.md), [adaptação de marca](docs/miniwordpress/BRAND_ADAPTER_GUIDE.md).
