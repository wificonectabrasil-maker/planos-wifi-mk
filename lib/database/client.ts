import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;

export function getTursoClient(): Client {
  if (typeof window !== "undefined")
    throw new Error("O banco só pode ser acessado pelo servidor.");
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    if (!url)
      throw new Error(
        "Configure TURSO_DATABASE_URL e execute pnpm run db:migrate.",
      );
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
    if (!url.startsWith("file:") && url !== ":memory:" && !authToken)
      throw new Error("Configure TURSO_AUTH_TOKEN.");
    client = createClient({ url, authToken, intMode: "number" });
  }
  return client;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim());
}
