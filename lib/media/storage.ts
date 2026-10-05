import { createHash, randomUUID } from "node:crypto";
import type { Client, InStatement } from "@libsql/client";
import { getTursoClient } from "../database/client";

export const ALLOWED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
export function uploadLimitBytes() {
  const value = Number(process.env.ADMIN_UPLOAD_MAX_MB ?? 6);
  return (Number.isFinite(value) && value > 0 ? value : 6) * 1024 * 1024;
}
export function validMediaPath(path: string) {
  return (
    path.length <= 400 &&
    path
      .split("/")
      .every((segment) => /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)?$/.test(segment))
  );
}

export async function storeMedia(
  path: string,
  bytes: Uint8Array,
  contentType: string,
  client: Client = getTursoClient(),
) {
  if (!validMediaPath(path) || !ALLOWED_MEDIA_TYPES.has(contentType))
    throw new Error("Mídia inválida.");
  if (!bytes.length || bytes.length > uploadLimitBytes())
    throw new Error("Arquivo acima do limite ou vazio.");
  const id = randomUUID(),
    sha256 = createHash("sha256").update(bytes).digest("hex");
  const statements: InStatement[] = [
    {
      sql: "INSERT INTO media_objects(id,path,content_type,byte_length,sha256) VALUES (?,?,?,?,?)",
      args: [id, path, contentType, bytes.length, sha256],
    },
  ];
  // Bound each statement; no base64 payload, credentials or binary in URLs.
  const blockSize = 256 * 1024;
  for (
    let offset = 0, position = 0;
    offset < bytes.length;
    offset += blockSize, position++
  ) {
    statements.push({
      sql: "INSERT INTO media_chunks(media_id,position,data) VALUES (?,?,?)",
      args: [id, position, bytes.slice(offset, offset + blockSize)],
    });
  }
  const tx = await client.transaction("write");
  try {
    // Keep each network request under 1 MiB of binary data while making the
    // object and all chunks visible together only after commit.
    for (let offset = 0; offset < statements.length; offset += 3) {
      await tx.batch(statements.slice(offset, offset + 3));
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
  return { id, url: `/media/${path}`, sha256 };
}

export async function loadMediaMetadata(
  path: string,
  client: Client = getTursoClient(),
) {
  if (!validMediaPath(path)) return null;
  const result = await client.execute({
    sql: "SELECT id,content_type,byte_length,sha256 FROM media_objects WHERE path = ?",
    args: [path],
  });
  return result.rows[0] ?? null;
}
export async function loadMediaBytes(
  id: string,
  client: Client = getTursoClient(),
) {
  const chunks: Uint8Array[] = [];
  for (let position = 0; ; position += 3) {
    const result = await client.execute({
      sql: "SELECT data FROM media_chunks WHERE media_id = ? AND position >= ? AND position < ? ORDER BY position",
      args: [id, position, position + 3],
    });
    chunks.push(
      ...result.rows.map((row) => new Uint8Array(row.data as ArrayBuffer)),
    );
    if (result.rows.length < 3) break;
  }
  const bytes = new Uint8Array(
    chunks.reduce((size, chunk) => size + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
