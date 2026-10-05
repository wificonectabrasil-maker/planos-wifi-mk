# Exportar o template

Execute `pnpm run template:export`. O resultado é `artifacts/miniwordpress-3.1.zip`, com código, documentação, skills, migrations, SQL copiável e manifest de checksums. O exportador restaura identidade e logos do preset neutro, exclui assets personalizados de public e não inclui .env.local, .env, .next, node_modules, test-results, .cache-tests, logs, bancos locais ou configuração .vercel.

O destinatário executa `template:init -- --email seu@email.com`, preenche URL/token de uma Turso própria e roda `db:install`. Não há importação de artigos, mídia ou credenciais. Consulte [preset 3.1](TEMPLATE_V31.md). O código é um snapshot do estado atual; revise personalizações futuras antes de gerar outra edição neutra.
