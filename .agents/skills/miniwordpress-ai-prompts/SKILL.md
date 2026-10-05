---
name: miniwordpress-ai-prompts
description: AI prompt and brand adapter skill for Mini WordPress. Use when Codex edits guardian AI, improve-fragment, internal-link suggestions, entity suggestions, Termos/LSI, niche adaptation, prompt packs, schemas, or brand-specific AI behavior.
---

# Mini WordPress AI Prompts

## Read first

- `docs/miniwordpress/AI_PROMPTS_AND_BRAND_ADAPTER.md`
- `docs/miniwordpress/BRAND_ADAPTER_GUIDE.md`
- `docs/miniwordpress/EDITOR_SYSTEM.md`

## Core principle

Prompt Core provides procedure and response contracts. Brand Adapter provides niche, tone, restrictions, entities, silos and preferred sources.

## Relevant APIs

- `app/api/admin/improve-fragment/route.ts`
- `app/api/admin/guardian-ai/route.ts`
- `app/api/admin/entity-suggestions/route.ts`
- `app/api/admin/internal-link-suggestions/route.ts`

## Workflow

1. Remove hardcoded brand language from Core prompts.
2. Add or use `brandAiProfile` for niche/tone/source rules.
3. Keep JSON response contracts stable.
4. Validate LLM outputs before applying to UI.
5. Keep deterministic fallback when possible.

## Guardrails

- Do not force exact keywords into unnatural text.
- Allow semantic synonyms and small sentence adaptations.
- Explain why a suggestion improves SEO, retention or silo structure.
- Do not create medical, legal or sensitive claims without source/safety rules.
