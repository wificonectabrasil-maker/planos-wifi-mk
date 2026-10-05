---
name: miniwordpress-system
description: Master routing skill for Mini WordPress work. Use when Codex is asked to understand, plan, document, extract, adapt, or implement the reusable Mini WordPress system across brands, including Core vs Brand vs Frontend Template vs Legacy separation.
---

# Mini WordPress System

## Workflow

1. Read `docs/miniwordpress/README.md`.
2. Read `docs/miniwordpress/PRD.md`.
3. If code changes are requested, read `docs/miniwordpress/ARCHITECTURE.md` and `docs/miniwordpress/REPOSITORY_MAP.md`.
4. Select the specialized Mini WordPress skill for the task.
5. Preserve the separation:
   - Core: reusable CMS/admin/editor/silos/IA infrastructure.
   - Brand Adapter: brand identity, tone, logo, silos, seeds, prompts.
   - Frontend Template: reusable public structures such as two-line silo menu, post layout, index and footer.
   - Legacy: current previous brand-specific implementation that must not become Core by accident.

## Required behavior

- Treat Mini WordPress admin as dark-only, dense, brand-independent system UI.
- Never change `.editor-public-preview` when fixing admin dark mode or density.
- Never hardcode previous brand into Core.
- Update `docs/miniwordpress/*` when discovering drift.
- Use pnpm for all projects, new and existing, and respect the version pinned in package.json. On Windows use `pnpm.cmd`; `corepack pnpm` also runs the pinned version.

## Specialized docs

- Admin UI: `docs/miniwordpress/ADMIN_UI_SYSTEM.md`
- Editor: `docs/miniwordpress/EDITOR_SYSTEM.md`
- Silos/SEO: `docs/miniwordpress/SILOS_AND_SEO_SYSTEM.md`
- AI prompts: `docs/miniwordpress/AI_PROMPTS_AND_BRAND_ADAPTER.md`
- Tailwind 4: `docs/miniwordpress/TAILWIND4_SYSTEM.md`
- Database: `docs/miniwordpress/DATABASE_SCHEMA.md` and `docs/miniwordpress/TURSO_SETUP.md`
- Migrations: `docs/miniwordpress/MIGRATIONS_AUDIT.md`
- Export: `docs/miniwordpress/EXPORT_PACKAGE_GUIDE.md` and `docs/miniwordpress/TEMPLATE_V31.md`
