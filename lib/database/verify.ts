import type { Client } from "@libsql/client";
import { TABLES } from "./schema";

export async function verifyDatabase(client: Client) {
  const tables = {
    ...Object.fromEntries(
      Object.entries(TABLES).map(([name, columns]) => [
        name,
        Object.keys(columns),
      ]),
    ),
    media_objects: [
      "id",
      "path",
      "content_type",
      "byte_length",
      "sha256",
      "created_at",
    ],
    media_chunks: ["media_id", "position", "data"],
    _migrations: ["name", "checksum", "applied_at"],
  };
  for (const [table, columns] of Object.entries(tables)) {
    const actual = await client.execute(`PRAGMA table_info("${table}")`);
    const names = new Set(actual.rows.map((row) => row.name));
    const missing = columns.filter((column) => !names.has(column));
    if (missing.length)
      throw new Error(`${table}: faltam ${missing.join(", ")}`);
  }
  const fk = await client.execute("PRAGMA foreign_key_check");
  if (fk.rows.length) throw new Error("Há relações inválidas no banco.");
  const expected = [
    "posts_url_immutable",
    "silos_url_immutable",
    "posts_lock_after_insert",
    "posts_lock_after_update",
  ];
  const triggers = new Set(
    (
      await client.execute(
        "SELECT name FROM sqlite_schema WHERE type = 'trigger'",
      )
    ).rows.map((row) => row.name),
  );
  if (expected.some((name) => !triggers.has(name)))
    throw new Error("Faltam triggers de proteção de URLs.");
  const foreignKeys = await client.execute("PRAGMA foreign_keys");
  if (foreignKeys.rows[0]?.foreign_keys !== 1)
    throw new Error("Foreign keys desabilitadas.");
  return {
    coreTables: Object.keys(TABLES).length,
    mediaTables: 2,
    migrationTables: 1,
    urlTriggers: expected.length,
  };
}
