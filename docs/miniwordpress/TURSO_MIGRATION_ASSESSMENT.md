# Migração para Turso — template neutro

Data: 2026-10-03. Implementação concluída no repositório local; schema instalado e validado na Turso configurada. O deploy ainda deve receber o código e as variáveis novas.

## Resultado

A Turso é o único banco e armazena também as imagens. O runtime e as dependências do Supabase foram removidos. Nenhum registro, mídia, marca, autor, cache ou credencial do banco anterior foi importado. O schema inicial não possui seed editorial.

As 17 tabelas Core foram traduzidas para SQLite/libSQL com índices, foreign keys, validação JSON, booleanos e constraints. Duas tabelas novas armazenam metadados e BLOBs de mídia, servidos pelo app. As regras de URLs publicadas e exclusão com redirecionamento foram preservadas.

As queries fluentes do CMS agora compilam SQL parametrizado com identificadores permitidos, codecs de leitura/escrita e projeções relacionais. A distinção entre consulta pública e administrativa fica no servidor; sessões do admin e application passwords do adaptador WP controlam acesso.

## Verificação executada

- Conexão real e catálogo da Turso.
- Migrations aplicadas na Turso, sem conteúdo de exemplo.
- Verificação de todas as colunas, tabelas de mídia, quatro triggers e integridade referencial.
- Escrita real de JSON, booleanos e BLOBs na Turso em transação revertida; sem registros de teste persistidos.
- Testes locais: migrations idempotentes, joins aninhados, codecs, drafts ocultos, silos inativos, soft delete, URL locks, unicidade, rollback e mídia multibloco.
- Navegador: login, proteção administrativa, draft, autosave, publicação/despublicação, busca, sitemap, imagem, WP/Contentor, mapa e auditoria de silos.

## Configuração do projeto novo

Identidade e regras editoriais: `brand.config.ts`. Silos e artigos: admin. Dados do template antigo e seus arquivos de seed foram removidos. Páginas institucionais começam neutras e devem ser definidas pelo responsável pelo projeto.

Banco: `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. Admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`. Mídia: `ADMIN_UPLOAD_MAX_MB`, padrão 6 MiB. Credenciais ficam somente no servidor.

IA, SERP e Contentor continuam sendo integrações próprias: configurar seus provedores quando forem utilizados. Chamadas externas pagas de IA/SERP não foram disparadas durante os testes; o fallback editorial local foi verificado. Agendamento editorial mantém o comportamento existente; esta migração não acrescenta um scheduler externo.

As imagens consomem espaço e transferência do banco. GET/HEAD usam cache e ETag, mas o dimensionamento depende do volume do novo projeto.

## Referências

[SDK oficial libSQL 0.18](https://tursodatabase.github.io/libsql-client-ts/) e [limites SQLite](https://sqlite.org/limits.html). Setup local: [TURSO_SETUP.md](TURSO_SETUP.md).
