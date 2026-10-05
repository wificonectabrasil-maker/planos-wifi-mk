---
name: miniwordpress-database
description: Turso/libSQL setup, schema verification, migrations and media storage for Mini WordPress.
---
# Mini WordPress Database

Read docs/miniwordpress/TURSO_SETUP.md, DATABASE_SCHEMA.md and MIGRATIONS_AUDIT.md.

The canonical schema is turso/migrations. Use pnpm run turso:check for read-only access, db:migrate for pending migrations and db:verify for integrity. Never edit an applied migration; add a new numbered file. Use bound SQL through lib/database and keep JSON/array/boolean contracts stable.

Tokens remain server-side. Public queries filter drafts, inactive silos and deleted records. Admin actions require a session. Media uses media_objects/media_chunks and app/media; preserve transaction atomicity, path validation, MIME allowlist and request size bounds.

New projects start with empty content. Do not copy previous brands, seeds, authors, credentials or media. Verify schema changes with test:database and app behavior with pnpm test. Tests must use isolated memory/file databases; remote smoke checks must roll back their data.
