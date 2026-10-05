import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { config } from "dotenv";
import { getTursoClient } from "../lib/database/client";
config({ path: ".env.local", quiet: true });
const client = getTursoClient(),
  id = randomUUID(),
  slug = `verification-${id}`;
const tx = await client.transaction("write");
try {
  await tx.execute({
    sql: "INSERT INTO silos(id,name,slug) VALUES (?,?,?)",
    args: [id, "Verificação temporária", slug],
  });
  await tx.execute({
    sql: "INSERT INTO posts(silo_id,slug,supporting_keywords,content_json,published,status) VALUES (?,?,?, ?,1,'published')",
    args: [
      id,
      slug,
      JSON.stringify(["ação", "contexto"]),
      JSON.stringify({ type: "doc", content: [] }),
    ],
  });
  const post = (
    await tx.execute({
      sql: "SELECT supporting_keywords,content_json,published,url_locked_at FROM posts WHERE slug=?",
      args: [slug],
    })
  ).rows[0];
  assert.deepEqual(JSON.parse(String(post.supporting_keywords)), [
    "ação",
    "contexto",
  ]);
  assert.equal(post.published, 1);
  assert.ok(post.url_locked_at);
  const bytes = randomBytes(300000);
  await tx.execute({
    sql: "INSERT INTO media_objects(id,path,content_type,byte_length,sha256) VALUES (?,?,?,?,'verification')",
    args: [id, slug + ".webp", "image/webp", bytes.length],
  });
  await tx.batch([
    {
      sql: "INSERT INTO media_chunks(media_id,position,data) VALUES (?,0,?)",
      args: [id, bytes.subarray(0, 256 * 1024)],
    },
    {
      sql: "INSERT INTO media_chunks(media_id,position,data) VALUES (?,1,?)",
      args: [id, bytes.subarray(256 * 1024)],
    },
  ]);
  const chunks = (
    await tx.execute({
      sql: "SELECT data FROM media_chunks WHERE media_id=? ORDER BY position",
      args: [id],
    })
  ).rows.map((row) => Buffer.from(row.data as ArrayBuffer));
  assert.deepEqual(Buffer.concat(chunks), bytes);
  console.log(
    "[db:smoke] Escrita, JSON, booleanos, triggers e BLOBs verificados; transação revertida sem deixar conteúdo.",
  );
} finally {
  await tx.rollback();
  tx.close();
  client.close();
}
