---
name: miniwordpress-export-package
description: Neutral package export skill for Mini WordPress. Use when Codex prepares a ZIP or standalone repository, removes previous brand-specific coupling, organizes docs and skills, or applies the system into a new/existing brand project.
---

# Mini WordPress Export Package

## Read first

- `docs/miniwordpress/EXPORT_PACKAGE_GUIDE.md`
- `docs/miniwordpress/IMPLEMENTATION_CHECKLIST.md`
- `docs/miniwordpress/REPOSITORY_AUDIT.md`
- `docs/miniwordpress/BRAND_ADAPTER_GUIDE.md`
- `docs/miniwordpress/TEMPLATE_V31.md`

## Workflow

1. Decide target mode: new project package or existing project integration.
2. Separate Core, Brand Adapter, Frontend Template and Legacy.
3. Remove previous brand-specific content and start with neutral configuration.
4. Include docs, migrations, scripts and skills.
5. Run `pnpm.cmd run template:export` to generate the versioned ZIP. Keep secrets, `.env.local`, caches and brand-only assets out of the package. Neutral identity/environment come from `templates/miniwordpress-3.1`.
6. Validate install/build in a clean copy when possible.

## Minimum package contents

- `app/admin`
- `app/api/admin`
- `components/editor`
- `components/silos`
- frontend template components
- `lib/database`, `lib/media`, `lib/template`
- `brand.config.ts`, `templates/miniwordpress-3.1`
- `turso/migrations`
- `scripts`
- `docs/miniwordpress`
- `.agents/skills/miniwordpress-*`

## Guardrails

- Do not export previous brand as the default Core identity.
- Do not include secrets.
- Do not ship ambiguous migrations.
- Do not skip docs and skills in the package.
