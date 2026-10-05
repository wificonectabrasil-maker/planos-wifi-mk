> Banco atual: Turso. Exemplos antigos de clone PostgreSQL/Storage neste documento estão descontinuados; use [TURSO_SETUP.md](TURSO_SETUP.md).

# Instalação Turso

O banco do template é Turso Cloud/libSQL, acessado pelo servidor com `@libsql/client`. O token nunca usa prefixo NEXT_PUBLIC e nunca é entregue ao navegador.

## Instalação limpa

Para uma cópia completa reutilizável, veja o [preset Mini WordPress 3.1](TEMPLATE_V31.md). `pnpm run db:install` reúne migrations e verificação. `pnpm run db:template` gera somente o SQL, sem consultar o banco atual.

Configure `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` em `.env.local` e execute:

`pnpm run turso:check` — conexão e catálogo, sem escrita.

`pnpm run db:migrate` — aplica migrations novas em transações e registra checksum em `_migrations`. Não cria conteúdo nem apaga registros existentes. Uma migration já aplicada não pode ser editada: acrescente outra numerada.

`pnpm run db:verify` — confere colunas, mídia, triggers e foreign keys.

As migrations oficiais ficam somente em `turso/migrations`. Use um banco vazio para cada novo projeto. PostgreSQL, PostgREST, políticas RLS e Storage de outro fornecedor não fazem parte deste runtime.

## Segurança e dados públicos

Admin: sessão HMAC assinada com `ADMIN_SESSION_SECRET`, senha própria em `ADMIN_PASSWORD` e cookie HttpOnly. APIs e actions administrativas continuam protegidas por sessão.

WordPress: Basic Auth com application passwords salvas como hashes; gere-as pelo painel.

Conteúdo público: queries do servidor mostram somente posts publicados, sem deleted_at e vinculados a silo ativo não excluído. Escritas públicas são negadas. Tabelas de senhas, configurações e auditorias não são expostas pelo cliente público.

## Mídia

`media_objects` contém caminho, MIME, tamanho e SHA-256. `media_chunks` contém BLOBs de até 256 KiB. O upload grava tudo em uma transação com requests limitados; GET/HEAD em `/media/[...path]` reconstroem o arquivo com cache imutável, ETag e validação de caminho. Limite padrão de upload: 6 MiB via `ADMIN_UPLOAD_MAX_MB`.

Imagens são públicas por URL, como no armazenamento público anterior. Não use esse endpoint para documentos privados. Imagens aumentam o armazenamento e a transferência de dados do banco; dimensione o plano conforme uso real.

## Desenvolvimento e deploy

Para desenvolvimento offline, libSQL aceita `file:local.db` em lugar da URL remota. Não use arquivo local em um deploy sem disco persistente. O teste E2E usa seu próprio arquivo e credenciais fictícias. Mantenha `.env.local`, bancos locais e resultados de testes fora do pacote.

No deploy: configure variáveis, execute migrations e faça build. Alterar este repositório não atualiza automaticamente um deploy existente.
