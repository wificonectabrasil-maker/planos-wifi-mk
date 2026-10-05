---
name: miniwordpress-silos-seo
description: Silo architecture and SEO skill for Mini WordPress. Use when Codex works on silos, hubs, post hierarchy, slug visibility, internal linking, link maps, cannibalization, SERP comparison, schema, sitemap, or SEO workflows.
---

# Mini WordPress Silos SEO

## Read first

- `docs/miniwordpress/SILOS_AND_SEO_SYSTEM.md`
- `docs/miniwordpress/FRONTEND_TEMPLATE.md`
- `docs/miniwordpress/DATABASE_SCHEMA.md`

## Workflow

1. Identify target silo and post hierarchy.
2. Preserve pilar/suporte role logic.
3. Keep slugs visible and readable in admin tables and graph nodes.
4. Use semantic internal linking, not exact-match-only anchors.
5. Use SERP/cannibalization as review and update tooling.
6. Separate brand silo names/seeds from Core mechanics.

## Relevant surfaces

- `/admin/silos`
- `/admin/silos/[slug]`
- `components/silos/*`
- Internal link APIs and link audit tables.

## Guardrails

- Do not use brand font in silo admin/graph.
- Do not let metadata forms consume the whole viewport when fields are rarely edited.
- Do not hardcode previous brand silos into Core.
- Keep the public two-line silo menu as Frontend Template.
