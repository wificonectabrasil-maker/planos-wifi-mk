# Schema Core Turso

Fonte canônica: `turso/migrations/0001_core.sql` e `0002_url_rules_and_media.sql`. Codecs TypeScript: `lib/database/schema.ts`.

| Área | Tabelas |
| --- | --- |
| Conteúdo | silos, posts |
| Organização | silo_groups, silo_posts, silo_batches, silo_batch_posts |
| Links e auditoria | post_links, post_link_occurrences, silo_audits, link_audits |
| Integração WordPress | wp_app_passwords, wp_id_map, wp_media |
| Pesquisa | google_cse_settings, serp_cache |
| URLs e métricas | url_redirects, post_views |
| Arquivos | media_objects, media_chunks |
| Controle | _migrations |

São 17 tabelas Core, duas de mídia e uma de controle. UUIDs são TEXT; wp_id_map usa INTEGER AUTOINCREMENT. Datas são strings ISO UTC. JSON e arrays são TEXT JSON com CHECK json_valid e codec no servidor; booleanos são INTEGER 0/1 convertidos para boolean ao ler. FKs e índices preservam relacionamentos, unicidade de slugs e um pilar por silo.

Triggers travam slug/canonical/silo de posts publicados e slug do silo após publicação. Despublicar não libera a URL. Conteúdo excluído é filtrado e pode ter um redirect preservado.

Não há seed de marcas, artigos, autores ou credenciais. Crie novos conteúdos pelo admin ou adaptador WP. Consulte [setup](TURSO_SETUP.md).

Extensão histórica WifiConecta: `0003_telecom.sql` criou `telecom_offers`, `telecom_leads` e `telecom_rate_limits`. A migration e os dados são preservados, mas as páginas públicas não leem ofertas e a captura está desativada. Estas tabelas não entram no contrato público Core. O setup acrescenta apenas cinco silos editoriais. Os testes de escrita usam banco local isolado.
