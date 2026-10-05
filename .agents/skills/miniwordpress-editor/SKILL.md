---
name: miniwordpress-editor
description: Editor workflow skill for Mini WordPress. Use when Codex changes the post editor, left intelligence panel, right inspector tabs, selected-text improvement, article search, Termos/LSI, internal links, SERP review, or Tiptap behavior.
---

# Mini WordPress Editor

## Read first

- `docs/miniwordpress/EDITOR_SYSTEM.md`
- `docs/miniwordpress/ADMIN_UI_SYSTEM.md`
- `docs/miniwordpress/AI_PROMPTS_AND_BRAND_ADAPTER.md` for IA tools

## Panel order

The left panel should prioritize frequent work:

1. Buscar no artigo.
2. Estrutura H2/H3/H4.
3. Links internos IA.
4. Higiene de links.
5. Guardiao SEO.
6. Termos / LSI IA.

## Right inspector

- Post: content metadata and cover.
- SEO / KGR: SEO fields.
- Revisao: SERP, duplication, schema, manual checks.
- E-E-A-T: trust, sources, author and authority.
- Publicar: final status and publishing controls.

## Guardrails

- Do not alter brand article styling unless the task is explicitly about brand/public preview.
- Keep `TextSearchPanel` at the top.
- Keep `TermsPanel` at the end.
- Keep SERP analysis in Revisao for post updates/audits.
- Selected text improvement must preserve context and position.
