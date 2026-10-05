---
name: miniwordpress-tailwind4
description: Tailwind 4 styling governance skill for Mini WordPress. Use when Codex audits or edits CSS tokens, Tailwind utility usage, admin dark-mode hardening, system classes, frontend template classes, or style separation by scope.
---

# Mini WordPress Tailwind 4

## Read first

- `docs/miniwordpress/TAILWIND4_SYSTEM.md`
- `docs/miniwordpress/ADMIN_UI_SYSTEM.md`
- `docs/miniwordpress/FRONTEND_TEMPLATE.md`

## Scopes

- `.admin-app`: Mini WordPress dark admin system.
- `.editor-public-preview`: brand article preview, protected from admin overrides.
- `system-*`: reusable frontend template structure.
- `--brand-*`: brand identity variables.

## Workflow

1. Classify the surface before editing CSS.
2. Prefer system classes and tokens over repeated hardcoded utility clusters.
3. Add dark-mode safety net only under `.admin-app`.
4. Exclude `.editor-public-preview` from admin compacting and color overrides.
5. Keep structural frontend classes separate from brand colors/fonts.

## Guardrails

- Avoid `bg-white`, `text-zinc-900`, large `p-6/gap-6` patterns in admin.
- Do not make admin depend on brand variables.
- Do not make public brand pages depend on admin variables.
- Verify hover, placeholder, disabled and focus states.
