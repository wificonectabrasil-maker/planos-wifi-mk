---
name: miniwordpress-repo-map
description: Repository audit and mapping skill for Mini WordPress extraction. Use when Codex must classify files or folders as Core, Brand Adapter, Frontend Template, or Legacy before porting the system to another brand or project.
---

# Mini WordPress Repo Map

## Read first

- `docs/miniwordpress/REPOSITORY_AUDIT.md`
- `docs/miniwordpress/REPOSITORY_MAP.md`
- `docs/miniwordpress/ARCHITECTURE.md`

## Workflow

1. Inspect the repo structure with fast file listing.
2. Classify each relevant area:
   - Core: admin, editor, APIs, silos, database, Contentor, IA orchestration.
   - Brand Adapter: logo, colors, fonts, author, niche prompts, silo seeds.
   - Frontend Template: public menu, post structure, index, footer, hub layout.
   - Legacy: previous brand hardcoding or obsolete SQL/docs.
3. Identify collisions with the target project.
4. Produce a migration map before editing.
5. Update `docs/miniwordpress/REPOSITORY_AUDIT.md` if the current classification is stale.

## Output format

Report:

- Core files to keep.
- Brand files to extract.
- Template files to parameterize.
- Legacy files to archive or review.
- Risks before implementation.

## Guardrails

- Do not treat previous brand-specific seeds, images, prompts or slugs as Core.
- Do not move code without checking imports and route ownership.
- Do not overwrite an existing brand/app surface without mapping conflicts first.
