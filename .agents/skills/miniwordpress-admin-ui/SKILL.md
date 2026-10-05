---
name: miniwordpress-admin-ui
description: Admin UI system skill for Mini WordPress dark mode, density, panels, tables, dialogs, typography, and Core vs Brand visual separation. Use when Codex changes /admin screens, editor panels, toolbar UI, or CSS under .admin-app.
---

# Mini WordPress Admin UI

## Read first

- `docs/miniwordpress/ADMIN_UI_SYSTEM.md`
- `docs/miniwordpress/TAILWIND4_SYSTEM.md`
- `docs/miniwordpress/EDITOR_SYSTEM.md` when editor panels are involved

## Core rules

- Admin is always dark mode.
- Admin uses system font, not brand font.
- Panel names should be strong and uppercase when practical.
- Use compact spacing; avoid decorative bento boxes for operational data.
- Keep slugs, IDs and URLs highly legible.
- Exclude `.editor-public-preview` from admin overrides.

## Workflow

1. Identify whether the surface is admin, brand preview, or frontend template.
2. If admin, use `.admin-app` tokens/classes.
3. If brand preview, do not apply admin dark mode or density.
4. Reduce padding/margins only inside admin surfaces.
5. Verify text contrast in panels, dialogs, hover states and placeholders.

## Relevant files

- `app/admin/layout.tsx`
- `app/globals.css`
- `components/admin/*`
- `components/editor/*`
- `components/silos/*`

## Validation

Use browser or screenshots when changing UI. Check `/admin`, `/admin/silos`, `/admin/silos/[slug]`, and `/admin/editor/[id]`.
