---
name: miniwordpress-migrations
description: Audit and maintain canonical Turso/libSQL migrations for Mini WordPress.
---
# Mini WordPress Migrations

Read docs/miniwordpress/DATABASE_SCHEMA.md, MIGRATIONS_AUDIT.md and TURSO_SETUP.md. The sole canonical SQL directory is turso/migrations. Preserve the 17 Core tables, media, constraints, foreign keys, indices and URL guards. Add a new numbered migration instead of editing one already applied. Keep brand content and credentials out of migrations. Run test:database and db:verify; validate app behavior for changed contracts. Never seed a previous project's content.
