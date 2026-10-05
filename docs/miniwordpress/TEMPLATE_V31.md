# Preset Mini WordPress 3.1

Este preset replica o repositório e a estrutura Turso/libSQL em projetos independentes. O banco começa sem artigos, silos, autores, imagens, application passwords ou credenciais de outro projeto. São 17 tabelas Core, 2 de mídia e 1 de controle de migrations, com índices, constraints, foreign keys e 4 triggers de proteção de URLs.

## Gerar e guardar o pacote

Na raiz deste repositório:

```powershell
pnpm.cmd run template:export
```

Resultado: `artifacts/miniwordpress-3.1.zip`, com a pasta `miniwordpress-3.1/` pronta para extrair e transformar em outro repositório Git. Inclui o app, editor, APIs, frontend, documentação, skills Mini WordPress, lockfile e migrations. Não inclui `.env.local`, histórico Git, `.vercel`, bancos locais, logs, dependências instaladas ou caches.

Identidade, logos e exemplo de ambiente vêm de `templates/miniwordpress-3.1/`. Assets personalizados de `public/` ficam fora do pacote. O exportador copia o código atual: alterações futuras de código ou textos institucionais específicos devem ser revisadas antes de gerar uma nova edição neutra. Guarde o ZIP 3.1 antes de personalizar este projeto.

`template-manifest.json` registra a versão, checksums das migrations, hash do SQL e hashes dos demais arquivos incluídos. O ZIP não consulta nem exporta registros da Turso.

Destino personalizado:

```powershell
pnpm.cmd run template:export --output "C:/templates/miniwordpress-3.1.zip"
```

O script anterior `scripts/create-local-zip.ps1` agora chama este exportador seguro.

## Instalar em outro projeto ou conta

1. Extraia o ZIP em uma pasta nova. Essa pasta pode receber `git init` e um novo remoto, sem o histórico do projeto de origem.
2. Entre na pasta extraída e instale as dependências:

```powershell
pnpm install --frozen-lockfile
pnpm.cmd run template:init --email seu@email.com
```

O segundo comando cria `.env.local`, com senha e segredo de sessão aleatórios próprios. Se o arquivo já existir, ele é preservado e o comando falha. A senha não é impressa: consulte `ADMIN_PASSWORD` no arquivo gerado. O login usa o e-mail passado em `--email`.

3. Na nova conta/organização Turso, crie um banco vazio e um token de banco com permissão de escrita. Preencha `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` no `.env.local` novo. Um token de gerenciamento da conta não substitui o token do banco. A conta é criada/autenticada pelo painel ou CLI da Turso; o instalador deste preset utiliza a URL e o token informados.
4. Instale a estrutura:

```powershell
pnpm.cmd run db:install
pnpm.cmd run dev
```

`db:install` aplica as migrations e verifica colunas, mídia, foreign keys, integridade e triggers. Pode ser repetido em uma instalação reconhecida, preservando seus dados. Recusa um banco com tabelas de outro sistema ou histórico incompatível. Não apaga banco nem importa conteúdo. Cada projeto deve apontar para sua própria URL Turso.

5. Acesse `http://localhost:3000/admin`, configure `brand.config.ts`, substitua os logos e crie os silos e artigos desse projeto. Para deploy, configure as variáveis no servidor, ajuste `SITE_URL` e execute migrations antes de iniciar o app. Serviços de IA/SERP e Contentor usam credenciais próprias opcionais.

## SQL para copiar e colar

```powershell
pnpm.cmd run db:template
```

Esse comando gera `turso/template/miniwordpress-3.1.sql` e `turso/template/manifest.json` a partir das migrations canônicas, sem ler o banco nem credenciais. O SQL pode ser copiado para um cliente SQL conectado a uma Turso vazia. Ele instala o schema em uma transação e registra o mesmo histórico/checksums de `db:migrate`.

Outra opção, com a CLI Turso autenticada na conta de destino, é criar um novo banco diretamente do arquivo:

```powershell
turso db create meu-novo-projeto --from-dump ./turso/template/miniwordpress-3.1.sql
```

O parâmetro `--from-dump` é documentado pela [Turso](https://docs.turso.tech/cli/db/create). Se houver mais de um grupo, informe `--group` para selecionar o grupo. Para um banco vazio já criado, a [CLI shell](https://docs.turso.tech/cli/db/shell) permite carregar um arquivo; no PowerShell:

```powershell
Get-Content -Raw -LiteralPath ./turso/template/miniwordpress-3.1.sql | turso db shell meu-novo-projeto
```

Escolha uma forma de instalação: `db:install` ou o SQL manual. O SQL completo foi feito para um banco vazio; para repetir a instalação ou aplicar futuras alterações, use `db:install`/`db:migrate`. Não edite o snapshot gerado. Adicione uma migration numerada em `turso/migrations` e gere o SQL novamente.

## Selecionar um destino sem trocar o ambiente atual

```powershell
pnpm.cmd run template:init --email seu@email.com --env .env.novo.local
# Preencha a URL/token do banco novo nesse arquivo.
pnpm.cmd run db:install --env .env.novo.local
```

Quando `--env` é informado, somente esse arquivo fornece a URL/token, mesmo que o processo ou `.env.local` tenham credenciais de outro banco. Sem `--env`, o ambiente do processo tem precedência sobre `.env.local` e `.env`, como nos demais scripts. O Next.js usa seus arquivos de ambiente padrão: para rodar o projeto novo, configure `.env.local` na cópia nova.

## Validar o preset

```powershell
pnpm.cmd run test:template
pnpm.cmd run test:database
pnpm.cmd run build
```

Os testes usam somente bancos isolados. Conferem equivalência entre SQL e migrations, banco sem conteúdo, instalação repetida, recusa de destinos incompatíveis, credenciais distintas e exclusão de segredos do ZIP. A versão 3.1.0 consta em `package.json` e `miniwordpress.template.json`.

A edição inicial 3.1 foi validada em uma cópia extraída: instalação com lockfile congelado, criação de ambiente, instalação e repetição do schema em banco local vazio, build de produção e teste de navegador de login/editor/publicação/SEO/mídia/mapas/auditorias/WordPress. TypeScript, lint dos novos arquivos e testes do preset/banco passaram. O banco remoto do projeto recebeu somente verificação de leitura; chamadas externas de IA/SERP não fizeram parte dessa validação.
