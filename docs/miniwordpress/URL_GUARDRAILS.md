> Banco atual: Turso. Exemplos antigos de clone PostgreSQL/Storage neste documento estão descontinuados; use [TURSO_SETUP.md](TURSO_SETUP.md).

# Mini WordPress 3.0 URL Guardrails

Status: canonico Core  
Data: 2026-05-04

## 1. Objetivo

URLs publicadas sao patrimonio de SEO. Depois que uma URL entra em producao, ela nao pode ser alterada por acidente no admin, por seed, por migracao ou por agente.

Este contrato vale para:

- Posts/artigos.
- Slugs de silos.
- Canonical path.
- URLs removidas que ja foram publicas.

## 2. Regras Core

### Regra 1: URL publicada e imutavel

Depois que um post estiver `published = true`, `status = 'published'` ou tiver `published_at`, estes campos ficam travados:

- `posts.slug`
- `posts.canonical_path`

Depois que um silo tiver URL publica, posts publicados dentro dele ou `url_locked_at`, este campo fica travado:

- `silos.slug`

Renomear titulo, meta title, descricao, imagens, conteudo e dados de SEO continua permitido. O que nao pode mudar e a URL.

### Regra 2: deletar URL exige barreira

Excluir uma URL publica deve exigir confirmacao explicita, no estilo GitHub/Vercel:

- Selecionar o item.
- Digitar a frase de intencao.
- Confirmar quantidade ou slug.
- Confirmar que sera criado redirecionamento.

Sem estas confirmacoes, a action deve recusar a exclusao.

### Regra 3: URL removida redireciona para recuperacao

Post removido nao deve simplesmente desaparecer. O fluxo canonico e:

1. Registrar a URL antiga em `url_redirects`.
2. Marcar o post como removido com `deleted_at`.
3. Despublicar o post.
4. Redirecionar a URL antiga com 308 para `/pagina-nao-encontrada?from=/silo/slug`.
5. A pagina de destino mostra a mensagem:
   - "Pagina nao encontrada"
   - "Mas temos conteudo que pode ser do seu interesse"
6. A pagina sugere conteudos relacionados.

## 3. Frontend publico

O frontend nao deve mostrar vitrines vazias.

Regras:

- Silo sem posts publicados nao aparece no menu publico.
- Silo sem posts publicados nao aparece no sitemap.
- Pagina publica de silo vazio retorna `notFound()`.
- Grupos de silo sem posts nao aparecem no submenu/hub publico.
- Essa regra e so de frontend publico. No admin, silos e grupos vazios continuam visiveis para planejamento editorial.

## 4. Banco de dados

Migration canonica:

```txt
turso/migrations/20260504_01_url_guardrails_redirects.sql
```

Ela adiciona:

- `posts.url_locked_at`
- `posts.deleted_at`
- `posts.deleted_redirect_path`
- `posts.deletion_reason`
- `silos.url_locked_at`
- `silos.deleted_at`
- `silos.deleted_redirect_path`
- `silos.deletion_reason`
- `url_redirects`
- triggers de bloqueio de URL
- indices para leitura publica sem deletados

`url_redirects` tem RLS habilitado e policy publica de leitura, porque o frontend precisa consultar redirecionamentos sem service role.

## 5. Implementacao em projetos existentes

Em sites em producao, aplicar nesta ordem:

1. Fazer backup ou snapshot do projeto Supabase.
2. Rodar a migration de guardrails.
3. Executar `pnpm.cmd run db:verify`.
4. Conferir `/admin`, `/admin/silos`, `/admin/editor/[id]`.
5. Conferir menu publico, sitemap e uma URL de post publicada.
6. So depois publicar deploy.

Nao mudar slugs existentes durante a atualizacao. A migration ja marca URLs publicadas como travadas.

## 6. Regra para agentes

Agente nunca deve:

- Trocar slug de post publicado para "corrigir SEO".
- Trocar slug de silo com posts publicados.
- Apagar linha de `posts` diretamente em producao.
- Exibir silo/grupo vazio no frontend publico.

Agente pode:

- Criar slug em rascunho.
- Ajustar slug antes da primeira publicacao.
- Despublicar post sem deletar.
- Remover post usando a barreira, com registro em `url_redirects`.
