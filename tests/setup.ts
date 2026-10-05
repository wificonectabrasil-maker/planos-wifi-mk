import { mkdir, rm } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { migrate } from "../lib/database/migrate";
export default async function setup() {
  await mkdir(".cache-tests", { recursive: true });
  for (const name of ["e2e.db", "e2e.db-wal", "e2e.db-shm"])
    await rm(`.cache-tests/${name}`, { force: true });
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    await migrate(client);
  } finally {
    client.close();
  }
}
