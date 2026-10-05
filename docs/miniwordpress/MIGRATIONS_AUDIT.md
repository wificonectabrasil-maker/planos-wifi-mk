# Migrations Turso

A implementação Core anterior foi traduzida para SQLite/libSQL, mantendo as 17 tabelas, tipos no contrato do editor, FKs, índices e regras de URL. Seeds, renomeações de marcas e dumps antigos foram removidos.

- 0001_core.sql: schema Core e constraints.
- 0002_url_rules_and_media.sql: quatro triggers de URL e BLOBs de mídia.
- 0003_telecom.sql: extensão WifiConecta de ofertas, solicitações e limite de envio; sem alterações nas tabelas Core.

Execute `pnpm run db:migrate`. Cada arquivo é aplicado em transação com checksum; reexecutar é seguro. Não modifique migrations aplicadas. Valide novas alterações em memória e com `pnpm run db:verify`.
