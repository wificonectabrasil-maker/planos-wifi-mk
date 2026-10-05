# Mapa do repositório

| Caminho | Responsabilidade |
| --- | --- |
| brand.config.ts | identidade, nicho, tom, fontes e colaboradores |
| app/admin, components/editor | painel, editor e publicação |
| app/api/admin, app/actions | APIs e ações protegidas |
| lib/db.ts, lib/database | persistência Core Turso e filtros públicos |
| turso/migrations | schema canônico, regras SQL e mídia |
| lib/media, app/media | arquivos BLOB e entrega HTTP |
| lib/seo, lib/silo | SEO, hierarquia, links e auditorias |
| lib/editorial, lib/visual-editorial | plano editorial, apoio e sugestões |
| app/wp-json, lib/wp | compatibilidade WordPress/Contentor |
| components/site, app/[silo] | frontend público reutilizável |
| public/brand-logo.svg, app/icon.svg | identidade genérica substituível |
| scripts | conexão, migrations e verificação |
| miniwordpress.template.json, templates/miniwordpress-3.1 | versão e identidade neutra do preset |
| lib/template, scripts/template.ts | SQL, instalação e exportação do repositório |
| turso/template | SQL gerado e manifest das migrations |
| tests | validação isolada em memória e navegador |
| lib/telecom, components/telecom | consultas por WhatsApp, pautas e modelos históricos privados WifiConecta |
| app/admin/comercial, app/admin/solicitacoes | operação comercial autenticada |
| app/api/telecom | captura antiga desativada, retorna 410 sem gravar dados |
| app/wificonecta.css, docs/wificonecta | visual público, voz e operação do projeto |

Não exporte .env.local, .next, node_modules, .cache-tests nem test-results. Não há seeds editoriais antigos no pacote atual.
