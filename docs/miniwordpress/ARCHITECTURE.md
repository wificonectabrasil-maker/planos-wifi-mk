# Arquitetura Mini WordPress

O app usa Next.js App Router. O navegador recebe páginas e chama APIs/actions autenticadas; o token Turso fica somente no servidor.

`brand.config.ts` define identidade e regras do projeto. `components/editor` contém o editor Tiptap. `app/admin` fornece o painel e actions. `lib/db.ts` mantém os contratos de conteúdo e silos. `lib/database` compila consultas para SQL libSQL com codecs e políticas públicas. `lib/media` grava imagens em BLOBs e `app/media` entrega os arquivos.

Os recursos de IA, SEO, auditoria e links internos continuam em `lib/seo`, `lib/silo`, `lib/editorial` e APIs administrativas. Pesquisa usa provedores SERP opcionais e cache Turso. WordPress/Contentor usa `app/wp-json` com credenciais em hash e mapeamento de IDs no banco.

Consulte [schema](DATABASE_SCHEMA.md), [setup](TURSO_SETUP.md) e [identidade](BRAND_ADAPTER_GUIDE.md). Migrations e decisões de runtime atuais têm prioridade sobre exemplos históricos de frontend.

Neste projeto, `components/telecom` implementa chamadas de consulta pelo WhatsApp e orientações comerciais da WifiConecta. As páginas públicas não leem ofertas do banco. As tabelas comerciais anteriores permanecem privadas, sem nova captura: `/api/telecom/leads` retorna 410. `/admin/comercial` descreve a operação e `/admin/solicitacoes` conserva histórico autenticado. Consulte [operação e limites](../wificonecta/README.md).
