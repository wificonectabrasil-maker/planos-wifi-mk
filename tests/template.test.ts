import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";
import { unzipSync, strFromU8 } from "fflate";
import { parse } from "dotenv";
import { migrate } from "../lib/database/migrate";
import { verifyDatabase } from "../lib/database/verify";
import {
  buildDatabasePreset,
  exportRepositoryPreset,
  initializeProjectEnv,
  installDatabasePreset,
  readTargetEnv,
} from "../lib/template/preset";

const root = process.cwd();

test("SQL copiável instala o schema vazio com histórico compatível", async () => {
  const preset = await buildDatabasePreset(root);
  const direct = createClient({ url: ":memory:" });
  const snapshot = createClient({ url: ":memory:" });
  try {
    await migrate(direct);
    await snapshot.executeMultiple(preset.sql);
    await migrate(snapshot);
    assert.deepEqual(await verifyDatabase(snapshot), {
      coreTables: 17,
      mediaTables: 2,
      migrationTables: 1,
      urlTriggers: 4,
    });
    const catalog =
      "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name";
    assert.deepEqual(
      (await snapshot.execute(catalog)).rows,
      (await direct.execute(catalog)).rows,
    );
    const tables = (
      await snapshot.execute(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'",
      )
    ).rows;
    for (const table of tables)
      assert.equal(
        (await snapshot.execute(`SELECT count(*) n FROM "${table.name}"`))
          .rows[0].n,
        0,
      );
    assert.equal(
      (await snapshot.execute("SELECT count(*) n FROM _migrations")).rows[0].n,
      preset.manifest.migrations.length,
    );
    assert.equal(
      createHash("sha256").update(preset.sql).digest("hex"),
      preset.manifest.schemaSha256,
    );
  } finally {
    direct.close();
    snapshot.close();
  }
});

test("instalador preserva conteúdo e recusa outro schema antes de escrever", async () => {
  const own = createClient({ url: ":memory:" });
  const foreign = createClient({ url: ":memory:" });
  try {
    await installDatabasePreset(own, root);
    await own.execute(
      "INSERT INTO silos(name, slug) VALUES ('Novo projeto', 'novo-projeto')",
    );
    await installDatabasePreset(own, root);
    assert.equal(
      (await own.execute("SELECT count(*) n FROM silos")).rows[0].n,
      1,
    );
    await foreign.execute(
      "CREATE TABLE other_project(id INTEGER PRIMARY KEY, content TEXT)",
    );
    await foreign.execute("INSERT INTO other_project VALUES (1,'preservado')");
    await assert.rejects(
      installDatabasePreset(foreign, root),
      /estrutura diferente/,
    );
    assert.equal(
      (await foreign.execute("SELECT content FROM other_project")).rows[0]
        .content,
      "preservado",
    );
    assert.equal(
      (
        await foreign.execute(
          "SELECT count(*) n FROM sqlite_schema WHERE name='_migrations'",
        )
      ).rows[0].n,
      0,
    );
    await own.execute("UPDATE _migrations SET checksum='alterado'");
    await assert.rejects(installDatabasePreset(own, root), /histórico/);
  } finally {
    own.close();
    foreign.close();
  }
});

test("credenciais próprias, recusa de sobrescrita e isolamento do arquivo --env", async () => {
  const temporary = await mkdtemp(
    join(tmpdir(), "miniwordpress-template-env-"),
  );
  try {
    await cp(join(root, "templates"), join(temporary, "templates"), {
      recursive: true,
    });
    const first = await initializeProjectEnv(
      temporary,
      ".env.local",
      "first@example.com",
    );
    const original = await readFile(first, "utf8");
    const env = parse(original);
    assert.equal(env.ADMIN_EMAIL, "first@example.com");
    assert.ok(env.ADMIN_PASSWORD.length >= 32);
    assert.ok(env.ADMIN_SESSION_SECRET.length >= 64);
    assert.equal(env.ADMIN_DISABLE_AUTH, "0");
    await assert.rejects(
      initializeProjectEnv(temporary, ".env.local", "second@example.com"),
      /já existe/,
    );
    assert.equal(await readFile(first, "utf8"), original);
    await initializeProjectEnv(
      temporary,
      ".env.second.local",
      "second@example.com",
    );
    assert.notEqual(
      parse(await readFile(join(temporary, ".env.second.local")))
        .ADMIN_PASSWORD,
      env.ADMIN_PASSWORD,
    );
    await writeFile(
      join(temporary, ".env.target.local"),
      "TURSO_DATABASE_URL=file:new-project.db\nTURSO_AUTH_TOKEN=target-token\n",
    );
    const target = await readTargetEnv(temporary, ".env.target.local");
    assert.equal(target.TURSO_DATABASE_URL, "file:new-project.db");
    assert.equal(target.TURSO_AUTH_TOKEN, "target-token");
    assert.equal(target.ADMIN_PASSWORD, undefined);
    await assert.rejects(
      readTargetEnv(temporary, ".env.missing.local"),
      /Não foi possível ler/,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("ZIP inclui Core, skills e migrations e elimina segredos, marca e caches", async () => {
  const temporary = await mkdtemp(
    join(tmpdir(), "miniwordpress-template-zip-"),
  );
  try {
    const files = [
      ".editorconfig",
      ".env.exemplo",
      ".gitignore",
      "eslint.config.mjs",
      "next-env.d.ts",
      "next.config.ts",
      "package.json",
      "pnpm-lock.yaml",
      "postcss.config.mjs",
      "proxy.ts",
      "README.md",
      "tailwind.config.ts",
      "tsconfig.json",
      "playwright.config.ts",
      "miniwordpress.template.json",
    ];
    for (const file of files) await cp(join(root, file), join(temporary, file));
    for (const name of [
      "app",
      "components",
      "hooks",
      "lib",
      "scripts",
      "tests",
      "docs",
      ".agents/skills",
    ])
      await mkdir(join(temporary, name), { recursive: true });
    await cp(join(root, "turso"), join(temporary, "turso"), {
      recursive: true,
    });
    await cp(join(root, "templates"), join(temporary, "templates"), {
      recursive: true,
    });
    await writeFile(
      join(temporary, ".env.local"),
      "ADMIN_PASSWORD=PRIVATE_SENTINEL",
    );
    await writeFile(join(temporary, ".env.exemplo"), "ADMIN_PASSWORD=PRIVATE_SENTINEL");
    await writeFile(join(temporary, "brand.config.ts"), "OLD_BRAND_SENTINEL");
    await writeFile(
      join(temporary, "app", ".env.production"),
      "PRIVATE_SENTINEL",
    );
    await writeFile(join(temporary, "app", "old.db"), "PRIVATE_SENTINEL");
    await writeFile(
      join(temporary, "app", "page.tsx"),
      "export default function Page() { return null; }",
    );
    await mkdir(join(temporary, "public"));
    await writeFile(
      join(temporary, "public", "private-photo.webp"),
      "PRIVATE_SENTINEL",
    );
    await mkdir(join(temporary, ".vercel"));
    await writeFile(
      join(temporary, ".vercel", "project.json"),
      "PRIVATE_SENTINEL",
    );
    await mkdir(join(temporary, ".agents/skills/miniwordpress-database"));
    await writeFile(
      join(temporary, ".agents/skills/miniwordpress-database/SKILL.md"),
      "Core database skill",
    );
    const result = await exportRepositoryPreset(temporary);
    const archive = unzipSync(await readFile(result.output));
    const prefix = "miniwordpress-3.1/";
    for (const file of [
      "brand.config.ts",
      "public/brand-logo.svg",
      "app/icon.svg",
      "turso/template/miniwordpress-3.1.sql",
      "turso/migrations/0001_core.sql",
      ".agents/skills/miniwordpress-database/SKILL.md",
      "template-manifest.json",
    ])
      assert.ok(archive[prefix + file], file);
    for (const [name, data] of Object.entries(archive)) {
      assert.ok(
        !name.includes(".env.local") &&
          !name.includes(".vercel") &&
          !name.endsWith(".db"),
      );
      assert.ok(!strFromU8(data).includes("PRIVATE_SENTINEL"));
      assert.ok(!strFromU8(data).includes("OLD_BRAND_SENTINEL"));
    }
    const manifest = JSON.parse(
      strFromU8(archive[prefix + "template-manifest.json"]),
    );
    for (const file of manifest.files)
      assert.equal(
        createHash("sha256")
          .update(archive[prefix + file.path])
          .digest("hex"),
        file.sha256,
      );
    assert.equal(manifest.version, "3.1.0");
    assert.ok(resolve(result.output).startsWith(temporary));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
