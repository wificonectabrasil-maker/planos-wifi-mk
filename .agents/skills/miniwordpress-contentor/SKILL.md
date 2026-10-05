---
name: miniwordpress-contentor
description: Contentor and WordPress adapter integration skill for Mini WordPress. Use when Codex configures wp-json routes, app passwords, media import, post import, cloudflared tunnel, or local Contentor publishing into the Mini WordPress admin.
---

# Mini WordPress Contentor

## Read first

- `docs/miniwordpress/CONTENTOR_CLOUDFLARED.md`
- `docs/contentor-wp-adapter.md` if present
- `docs/miniwordpress/DATABASE_SCHEMA.md`

## Relevant code

- `app/wp-json/wp/v2/posts/route.ts`
- `app/wp-json/wp/v2/media/route.ts`
- `app/wp-json/wp/v2/users/me/route.ts`
- `app/api/admin/wp-app-password/route.ts`

## Workflow

1. Confirm environment variables and local URL.
2. Confirm `cloudflared.exe` exists or document the missing binary.
3. Confirm WordPress adapter routes are available.
4. Check app password creation and authentication.
5. Check that imported posts remain drafts and do not bypass editorial workflow.
6. Check media bucket behavior.

## Guardrails

- Imported posts should enter Mini WordPress as drafts.
- Contentor integration is Core; Contentor credentials are environment/brand deployment details.
- Never commit secrets or tunnel tokens.
- Preserve `raw_payload` or equivalent import trace when available.
