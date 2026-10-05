import { randomBytes, createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, lstat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { zipSync, type Zippable } from "fflate";
import { parse } from "dotenv";
import type { Client } from "@libsql/client";
import {
  migrate,
  readMigrations,
  MIGRATIONS_TABLE_SQL,
} from "../database/migrate";
import { TABLES } from "../database/schema";
import { verifyDatabase } from "../database/verify";

export class TemplateError extends Error {}

export async function buildDatabasePreset(root: string) {
  const metadata = JSON.parse(
    await readFile(join(root, "miniwordpress.template.json"), "utf8"),
  );
  const migrations = await readMigrations(join(root, metadata.migrations));
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const sql = [
    `-- ${metadata.name} ${metadata.version} | ${metadata.database}`,
    "-- Instalação em banco vazio. Sem conteúdo, mídia ou credenciais.",
    "-- Gerado com pnpm run db:template; edite somente turso/migrations.",
    "PRAGMA foreign_keys = ON;",
    "BEGIN IMMEDIATE;",
    `${MIGRATIONS_TABLE_SQL};`,
    ...migrations.flatMap(({ name, sql, checksum }) => [
      `\n-- Migration: ${name}\n${sql}`,
      `INSERT INTO _migrations(name, checksum) VALUES (${quote(name)}, ${quote(checksum)});`,
    ]),
    "COMMIT;",
    "",
  ].join("\n");
  const manifest = {
    ...metadata,
    coreTables: Object.keys(TABLES).length,
    mediaTables: 2,
    controlTables: 1,
    migrations: migrations.map(({ name, checksum }) => ({ name, checksum })),
    schemaSha256: createHash("sha256").update(sql).digest("hex"),
  };
  return { metadata, sql, manifest };
}

export async function writeDatabasePreset(root: string) {
  const preset = await buildDatabasePreset(root);
  const output = join(root, preset.metadata.snapshot);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, preset.sql);
  await writeFile(
    join(dirname(output), "manifest.json"),
    `${JSON.stringify(preset.manifest, null, 2)}\n`,
  );
  return output;
}

export async function installDatabasePreset(client: Client, root: string) {
  const metadata = JSON.parse(await readFile(join(root, "miniwordpress.template.json"), "utf8"));
  const extensionTables: string[] = Array.isArray(metadata.extensionTables)
    ? metadata.extensionTables.filter((name: unknown): name is string => typeof name === "string" && /^[a-z][a-z0-9_]*$/.test(name))
    : [];
  const existing = (
    await client.execute(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
  ).rows.map((row) => String(row.name));
  if (existing.length) {
    const allowed = new Set([
      ...Object.keys(TABLES),
      "media_objects",
      "media_chunks",
      "_migrations",
      ...extensionTables,
    ]);
    if (
      !existing.includes("_migrations") ||
      existing.some((name) => !allowed.has(name))
    ) {
      throw new TemplateError(
        "O destino contém uma estrutura diferente. Use uma Turso vazia ou uma instalação deste template. Nenhum dado foi alterado.",
      );
    }
    const applied = (
      await client.execute("SELECT name, checksum FROM _migrations")
    ).rows;
    const migrations = await readMigrations(join(root, "turso/migrations"));
    if (
      !applied.length ||
      applied.some(
        (row) =>
          !migrations.some(
            (migration) =>
              migration.name === row.name &&
              migration.checksum === row.checksum,
          ),
      )
    ) {
      throw new TemplateError(
        "O histórico de migrations não corresponde a este template. Nenhum dado foi alterado.",
      );
    }
  }
  await migrate(client, join(root, "turso/migrations"));
  return verifyDatabase(client);
}

export async function initializeProjectEnv(
  root: string,
  file: string,
  email: string,
) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new TemplateError("Informe seu e-mail de administrador com --email.");
  const output = resolve(root, file);
  const original = await readFile(
    join(root, "templates/miniwordpress-3.1/env.example"),
    "utf8",
  );
  const env = original
    .replace(
      /^ADMIN_EMAIL=.*$/m,
      () => `ADMIN_EMAIL=${JSON.stringify(email.trim().toLowerCase())}`,
    )
    .replace(
      /^ADMIN_PASSWORD=.*$/m,
      () => `ADMIN_PASSWORD=${randomBytes(24).toString("base64url")}`,
    )
    .replace(
      /^ADMIN_SESSION_SECRET=.*$/m,
      () => `ADMIN_SESSION_SECRET=${randomBytes(32).toString("hex")}`,
    );
  try {
    await writeFile(output, env, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new TemplateError(
        "O arquivo de ambiente já existe. Ele foi preservado; escolha outro caminho com --env.",
      );
    throw error;
  }
  return output;
}

export async function readTargetEnv(
  root: string,
  file?: string,
): Promise<Record<string, string | undefined>> {
  if (file !== undefined) {
    if (!file.trim())
      throw new TemplateError("Informe o caminho do arquivo em --env.");
    try {
      return parse(await readFile(resolve(root, file)));
    } catch {
      throw new TemplateError(
        "Não foi possível ler o arquivo informado em --env.",
      );
    }
  }
  let values: Record<string, string | undefined> = {};
  for (const name of [".env", ".env.local"]) {
    try {
      values = { ...values, ...parse(await readFile(join(root, name))) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return { ...values, ...process.env };
}

const rootFiles = [
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
const sourceDirectories = [
  "app",
  "components",
  "hooks",
  "lib",
  "scripts",
  "tests",
  "docs",
  "turso",
  "templates",
  ".agents/skills",
];
const excludedNames = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  ".cache-tests",
  "test-results",
  "playwright-report",
  "artifacts",
  ".artifacts",
]);

export async function exportRepositoryPreset(root: string, file?: string) {
  const preset = await buildDatabasePreset(root);
  const files: Record<string, Uint8Array> = {};
  async function collect(relative: string) {
    const name = basename(relative);
    if (
      excludedNames.has(name) ||
      (name.startsWith(".env") && name !== ".env.exemplo") ||
      /\.(?:db|db-wal|db-shm|sqlite|sqlite3|log|tsbuildinfo|pem|key|pfx|exe|msi|zip)$/i.test(
        name,
      )
    )
      return;
    if (
      relative.startsWith(".agents/skills/") &&
      !relative.split("/")[2].startsWith("miniwordpress-")
    )
      return;
    const absolute = join(root, relative);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      for (const child of (await readdir(absolute)).sort())
        await collect(`${relative}/${child}`);
    } else if (stat.isFile()) {
      files[relative] = new Uint8Array(await readFile(absolute));
    }
  }
  for (const path of [...rootFiles, ...sourceDirectories]) await collect(path);
  // A identidade do pacote vem do preset, nunca da marca do projeto em uso.
  for (const [source, target] of [
    ["brand.config.ts.txt", "brand.config.ts"],
    ["brand-logo.svg", "public/brand-logo.svg"],
    ["icon.svg", "app/icon.svg"],
    ["env.example", ".env.exemplo"],
  ]) {
    files[target] = new Uint8Array(
      await readFile(join(root, "templates", preset.metadata.preset, source)),
    );
  }
  files[preset.metadata.snapshot] = Buffer.from(preset.sql);
  files["turso/template/manifest.json"] = Buffer.from(
    `${JSON.stringify(preset.manifest, null, 2)}\n`,
  );
  const inventory = Object.keys(files)
    .sort()
    .map((path) => ({
      path,
      sha256: createHash("sha256").update(files[path]).digest("hex"),
    }));
  files["template-manifest.json"] = Buffer.from(
    `${JSON.stringify({ ...preset.manifest, files: inventory }, null, 2)}\n`,
  );
  const archive: Zippable = {};
  const mtime = new Date("2026-01-01T00:00:00Z");
  for (const path of Object.keys(files).sort())
    archive[`${preset.metadata.preset}/${path}`] = [files[path], { mtime }];
  const output = resolve(
    root,
    file ?? `artifacts/${preset.metadata.preset}.zip`,
  );
  if (!output.toLowerCase().endsWith(".zip"))
    throw new TemplateError("O caminho de exportação deve terminar em .zip.");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, zipSync(archive, { level: 6 }));
  return {
    output,
    fileCount: Object.keys(files).length,
    version: preset.metadata.version,
  };
}
