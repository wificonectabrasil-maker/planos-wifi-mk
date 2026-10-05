> Banco atual: Turso. Exemplos antigos de clone PostgreSQL/Storage neste documento estão descontinuados; use [TURSO_SETUP.md](TURSO_SETUP.md).

# Agents and Skills Plan

Este documento define os skills e instrucoes para agentes implementarem o Mini WordPress sem perder contexto.

O objetivo e que humanos e agentes consigam instalar, adaptar, auditar e evoluir o sistema em qualquer projeto.

## Fonte canonica

Antes de qualquer skill executar trabalho, ele deve ler:

1. `docs/miniwordpress/README.md`
2. `docs/miniwordpress/PRD.md`
3. Documento especializado do assunto
4. `docs/miniwordpress/IMPLEMENTATION_CHECKLIST.md`

Para o blog SEO projeto, ler tambem `docs/miniwordpress/projeto_BLOG_SEO_RAIOX.md`.

## Pasta recomendada

Usar `.agents/skills/` como pasta canonica.

Status atual:

- Existem skills locais em `.agents/skills/`.
- `.agent/skills/` singular e legado quando aparecer.
- Skills novos ou atualizados devem ir para `.agents/skills/miniwordpress-*` ou skill especifico de dominio.
- `.agents` pode ser ignorado pelo git neste workspace; confirmar versionamento antes de exportar pacote neutro.

## Skills necessarios

### `miniwordpress-repo-map`

Funcao:

- Ler o repo alvo.
- Classificar arquivos como Core, Brand, Template ou Legacy.
- Gerar mapa de integracao.

Entradas:

- Caminho do repo.
- Nome da marca.
- Tipo de projeto: novo ou existente.

Saidas:

- Relatorio de colisao.
- Lista de arquivos Core.
- Lista de pontos Brand.
- Plano de migracao.

### `miniwordpress-supabase-clone`

Funcao:

- Preparar Supabase para Mini WordPress.
- Rodar ou orientar clone.
- Verificar tabelas e colunas.

Base:

- `docs/miniwordpress/DATABASE_SCHEMA.md`
- `docs/miniwordpress/SUPABASE_CLONE_PLAYBOOK.md`

Comandos relacionados:

- `pnpm run db:install`
- `pnpm run db:verify`

### `miniwordpress-migrations`

Funcao:

- Auditar migrations.
- Diferenciar migrations canonicas de SQL legado.
- Criar plano de consolidacao.

Base:

- `docs/miniwordpress/MIGRATIONS_AUDIT.md`

### `miniwordpress-contentor`

Funcao:

- Configurar adapter WordPress/Contentor.
- Verificar `cloudflared.exe`.
- Testar rotas `wp-json`.
- Validar senha de app.

Base:

- `docs/miniwordpress/CONTENTOR_CLOUDFLARED.md`

### `miniwordpress-admin-ui`

Funcao:

- Aplicar dark mode administrativo.
- Corrigir leitura.
- Reduzir bento box.
- Garantir isolamento `.editor-public-preview`.

Base:

- `docs/miniwordpress/ADMIN_UI_SYSTEM.md`
- `docs/miniwordpress/TAILWIND4_SYSTEM.md`

### `miniwordpress-editor`

Funcao:

- Configurar editor.
- Validar paineis esquerdo/direito.
- Garantir ordem de ferramentas.
- Verificar aplicacao de sugestoes IA.

Base:

- `docs/miniwordpress/EDITOR_SYSTEM.md`

### `miniwordpress-silos-seo`

Funcao:

- Criar/adaptar silos.
- Configurar grupos editoriais.
- Validar menu publico.
- Auditar linkagem e canibalizacao.
- Validar KGR local quando existir.
- Distinguir sobreposicao aceitavel de canibalizacao real.
- Priorizar pares/acoes em vez de relatorio bruto.

Base:

- `docs/miniwordpress/SILOS_AND_SEO_SYSTEM.md`
- `docs/miniwordpress/FRONTEND_TEMPLATE.md`

### `miniwordpress-ai-prompts`

Funcao:

- Criar prompt pack da marca.
- Separar prompt Core de Brand Adapter.
- Ajustar nicho, tom, fontes e restricoes.
- Atualizar Guardiao SEO, Links Internos IA, Duplicacao Interna e Agente Visual sem automatizar aplicacao.
- Usar Drive support curado e selecionado por ferramenta.
- Manter prompts de imagem limpos, sem metadados de editor.

Base:

- `docs/miniwordpress/AI_PROMPTS_AND_BRAND_ADAPTER.md`
- `docs/miniwordpress/BRAND_ADAPTER_GUIDE.md`

### `visual-editorial-agent`

Funcao:

- Planejar capa, imagens de respiro e tabela visual para artigos prontos.
- Gerar prompt limpo para ChatGPT Images.
- Diferenciar capas pela variavel do slug/intencao e por direcao de arte: camera, pose, acao, objeto, composicao e elementos AR.
- Capas usam prompt de edicao sobre foto-base de banco de imagem: preservar a pessoa/foto original e adicionar overlays de realidade aumentada editorial.
- Usar visual inspirado em Google Search/I/O 2026 sem logotipo oficial nem UI copiada: search box inteligente, cards flutuantes, pins/mapas abstratos e paineis translucidos.
- Gerar respiros pelo conceito do trecho depois da marcacao, nao pela keyword global do artigo; preferir secao HTML estruturada quando disponivel.
- Usar frase forte, termos concretos, H2/H3 e bullets para evitar buckets genericos.
- Variar respiros por layout, objeto focal e metafora local quando o mesmo tema aparece mais de uma vez; marcar duplicidade visual quando o trecho for equivalente.
- Priorizar composicoes limpas com margens e poucos elementos sem repetir o mesmo escudo/card/browser.
- Manter alt, legenda, nome de arquivo e checklist fora do prompt principal quando forem metadata.
- Fornecer dois prompts de imagem quando o gerador externo variar: GPT Imagem direto e Gemini/Nano Banana com 3D/glass/degrade, sem formato/dimensao no prompt Gemini.
- Gemini/Nano Banana deve usar portugues do Brasil para qualquer texto e evitar borracha, liquido, massinha, blobs, formas derretidas e linhas tortas.
- Nunca cortar prompt com limite fixo depois de montado; compactar antes e garantir frase final completa.

Base:

- `docs/miniwordpress/projeto_BLOG_SEO_RAIOX.md`
- `lib/visual-editorial/AGENTE_VISUAL_EDITORIAL_GPT.md`
- `.agents/skills/visual-editorial-agent/SKILL.md`

### `miniwordpress-tailwind4`

Funcao:

- Auditar tokens e classes.
- Evitar mistura de admin e marca.
- Migrar estilos para arquivos separados quando necessario.

Base:

- `docs/miniwordpress/TAILWIND4_SYSTEM.md`

### `miniwordpress-export-package`

Funcao:

- Preparar ZIP/repo neutro.
- Remover dados Mini WordPress.
- Incluir docs e migrations canonicas.
- Validar install em projeto limpo.

Base:

- `docs/miniwordpress/EXPORT_PACKAGE_GUIDE.md`

## Regras para agentes

- Nunca misturar Core e Brand por conveniencia.
- Nunca alterar a area publica da marca ao corrigir o admin.
- Nunca remover migrations sem registrar motivo.
- Nunca converter prompt de nicho em prompt Core.
- Nunca mandar ChatGPT Images acessar Drive privado.
- Nunca misturar marcacoes do editor no prompt principal de imagem.
- Nunca aplicar links, reescrita, imagem, upload ou publicacao automaticamente no v1.
- Sempre validar com build ou verificacao equivalente quando houver codigo.
- Sempre atualizar docs quando descobrir divergencia.

## Ordem recomendada de execucao

Para projeto novo:

1. `miniwordpress-export-package`
2. `miniwordpress-supabase-clone`
3. `miniwordpress-brand-adapter`
4. `miniwordpress-silos-seo`
5. `miniwordpress-contentor`
6. `miniwordpress-admin-ui`
7. `miniwordpress-editor`
8. `miniwordpress-ai-prompts`

Para projeto existente:

1. `miniwordpress-repo-map`
2. `miniwordpress-brand-adapter`
3. `miniwordpress-supabase-clone`
4. `miniwordpress-admin-ui`
5. `miniwordpress-frontend-template`
6. `miniwordpress-silos-seo`
7. `miniwordpress-ai-prompts`
8. `miniwordpress-contentor`

## Pendencias

- Revisar quais skills locais devem entrar no pacote neutro versionado.
- Padronizar formato de `SKILL.md`.
- Remover ou arquivar `.agent/skills` antigo se confirmado legado.
- Criar exemplos por marca: Mini WordPress, Lindisse, projeto, projeto Pro, FantasyIA blog.
