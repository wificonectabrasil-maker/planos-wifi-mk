import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Client } from "@libsql/client";

export const MIGRATIONS_TABLE_SQL =
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))";

export async function readMigrations(
  directory = resolve(process.cwd(), "turso/migrations"),
) {
  const names = (await readdir(directory))
    .filter((name) => /^\d+_[\w-]+\.sql$/.test(name))
    .sort();
  if (!names.length) throw new Error("Nenhuma migration canônica encontrada.");
  return Promise.all(
    names.map(async (name) => {
      const sql = (await readFile(resolve(directory, name), "utf8")).replace(
        /\r\n/g,
        "\n",
      );
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

export async function migrate(
  client: Client,
  directory = resolve(process.cwd(), "turso/migrations"),
) {
  await client.execute("PRAGMA foreign_keys = ON");
  const migrations = await readMigrations(directory);
  await client.execute(MIGRATIONS_TABLE_SQL);
  for (const { name, sql, checksum } of migrations) {
    const existing = await client.execute({
      sql: "SELECT checksum FROM _migrations WHERE name = ?",
      args: [name],
    });
    if (existing.rows.length) {
      if (existing.rows[0].checksum !== checksum)
        throw new Error(`Migration já aplicada foi alterada: ${name}`);
      continue;
    }
    const tx = await client.transaction("write");
    try {
      await tx.executeMultiple(sql);
      await tx.execute({
        sql: "INSERT INTO _migrations(name, checksum) VALUES (?, ?)",
        args: [name, checksum],
      });
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
    console.log(`[db:migrate] ${name}`);
  }
}
