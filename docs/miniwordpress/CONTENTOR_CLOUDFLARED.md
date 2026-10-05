> Banco atual: Turso. Exemplos antigos de clone PostgreSQL/Storage neste documento estão descontinuados; use [TURSO_SETUP.md](TURSO_SETUP.md).

# Contentor and cloudflared Guide

Status: draft especializado inicial  
Data: 2026-04-28

## 1. Objetivo

Permitir que o Contentor publique conteudo no Mini WordPress usando endpoints estilo WordPress REST API.

Base URL:

```txt
https://SEU_DOMINIO/wp-json/wp/v2
```

Para ambiente local, normalmente o Contentor precisa acessar uma URL publica. Nesse caso usar `cloudflared.exe` para criar um tunnel ate `localhost:3000`.

## 2. Endpoints implementados

```txt
GET  /wp-json/wp/v2/users/me
GET  /wp-json/wp/v2/posts?search=texto
POST /wp-json/wp/v2/posts
POST /wp-json/wp/v2/media
```

Arquivos:

- `app/wp-json/wp/v2/users/me/route.ts`
- `app/wp-json/wp/v2/posts/route.ts`
- `app/wp-json/wp/v2/media/route.ts`
- `lib/wp/auth.ts`
- `lib/wp/id-map.ts`
- `lib/wp/passwords.ts`
- `lib/wp/response.ts`
- `lib/wp/slugify.ts`

## 3. Autenticacao

O adapter usa autenticacao estilo WordPress Application Password.

Criar senha:

```txt
POST /api/admin/wp-app-password
```

Body:

```json
{
  "username": "projeto_admin",
  "display_name": "projeto"
}
```

Resposta:

```json
{
  "app_password": "xxxx xxxx xxxx xxxx xxxx xxxx"
}
```

Usar no Contentor:

- Username: mesmo `username`.
- Application Password: valor retornado.

Fallback local via env:

- `WP_FAKE_USER`
- `WP_FAKE_PASSWORD`

## 4. Importacao de posts

Endpoint:

```txt
POST /wp-json/wp/v2/posts
```

Comportamento atual:

- Autentica request.
- Le `title`, `content`, `excerpt`, `meta_description`.
- Extrai meta Contentor por `extractContentorMeta`.
- Extrai CTAs por `extractContentorCtas`.
- Normaliza HTML por `importContentorHtml`.
- Gera slug unico.
- Define `target_keyword` por payload ou fallback.
- Insere post como:
  - `status = draft`
  - `published = false`
  - `silo_id = null`
  - `imported_source = contentor`
  - `raw_payload = payload`
- Retorna resposta estilo WordPress.

Importante:

- Imports nunca publicam automaticamente.
- O post entra sem silo; deve ser organizado no admin.
- Slug colidido recebe sufixo.

## 5. Busca de posts

Endpoint:

```txt
GET /wp-json/wp/v2/posts?search=texto
```

Comportamento:

- Busca por titulo ou slug.
- Limita 20 resultados.
- Retorna IDs numericos mapeados por `wp_id_map`.

## 6. Upload de media

Endpoint:

```txt
POST /wp-json/wp/v2/media
```

Tipos aceitos:

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`

Comportamento:

- Recebe `file` ou `media`.
- Usa `alt_text` e `title` se enviados.
- Faz upload no bucket Supabase Storage `media`.
- Se bucket `media` nao existir, tenta criar bucket publico.
- Salva registro em `wp_media`.
- Retorna `source_url`, `alt_text` e ID numerico estilo WordPress.

## 7. Rodando local com cloudflared

1. Rodar app local:

```powershell
pnpm.cmd run dev
```

ou:

```powershell
corepack pnpm dev
```

2. Iniciar tunnel:

```powershell
.\cloudflared.exe tunnel --url http://localhost:3000
```

3. Copiar a URL publica gerada pelo cloudflared.

4. Configurar no Contentor:

```txt
https://URL-GERADA.trycloudflare.com/wp-json/wp/v2
```

5. Testar:

```txt
GET https://URL-GERADA.trycloudflare.com/wp-json/wp/v2/users/me
```

## 8. Variaveis de ambiente relevantes

Obrigatorias para banco:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Admin/auth:

- `ADMIN_PASSWORD`
- `ADMIN_DISABLE_AUTH`

WP fake auth opcional:

- `WP_FAKE_USER`
- `WP_FAKE_PASSWORD`

Debug opcional:

- `DEBUG_CONTENTOR_IMPORT=1`

## 9. Fluxo operacional recomendado

1. Criar application password.
2. Configurar Contentor com URL `/wp-json/wp/v2`.
3. Testar usuario.
4. Testar upload de imagem.
5. Testar envio de post.
6. Abrir `/admin`.
7. Encontrar post importado como draft.
8. Definir silo.
9. Revisar SEO, links e imagens.
10. Publicar manualmente.

## 10. Pontos de Brand Adapter

Contentor em si e Core.

Mas o prompt/orientacao usada no Contentor deve ser Brand Adapter:

- Nicho.
- Tom.
- Estrutura de artigo.
- Regras de marca.
- Silo alvo.
- Tipo de CTA.
- Politica de fontes.

## 11. Pendencias

- [ ] Criar tela/admin para listar credenciais WP app password.
- [ ] Documentar payload Contentor ideal.
- [ ] Testar cloudflared local de ponta a ponta.
- [ ] Criar fixture de teste por nicho.
- [ ] Decidir se Contentor pode sugerir silo ou sempre entra sem silo.
