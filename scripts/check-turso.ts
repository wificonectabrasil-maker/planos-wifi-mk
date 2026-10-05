import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

type SqlValue = {
  type: string;
  value?: string | number | null;
};

type SqlResult = {
  cols: Array<{ name: string }>;
  rows: SqlValue[][];
};

type PipelineResult =
  | { type: "ok"; response: { type: string; result?: SqlResult } }
  | { type: "error"; error: { code?: string } };

class ConnectionCheckError extends Error {}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value)
    throw new ConnectionCheckError(
      `Configure ${name} no ambiente ou em .env.local.`,
    );
  return value;
}

function resultRows(result: SqlResult) {
  return result.rows.map((row) =>
    Object.fromEntries(
      result.cols.map((column, index) => {
        const cell = row[index];
        const value = cell?.type === "null" ? null : cell?.value;
        return [column.name, cell?.type === "integer" ? Number(value) : value];
      }),
    ),
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Uso: pnpm.cmd run turso:check [--json]");
    console.log(
      "Testa conexão, consulta o catálogo e verifica JSON; executa somente leituras.",
    );
    return;
  }
  if (args.some((arg) => arg !== "--json")) {
    throw new ConnectionCheckError(
      "Opção desconhecida. Use --help para consultar o comando.",
    );
  }

  loadEnv({
    path: resolve(process.cwd(), ".env.local"),
    override: false,
    quiet: true,
  });
  loadEnv({
    path: resolve(process.cwd(), ".env"),
    override: false,
    quiet: true,
  });

  let url: URL;
  try {
    url = new URL(requiredEnv("TURSO_DATABASE_URL"));
  } catch (error) {
    if (error instanceof ConnectionCheckError) throw error;
    throw new ConnectionCheckError("TURSO_DATABASE_URL não é uma URL válida.");
  }
  if (
    !["libsql:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new ConnectionCheckError(
      "Este diagnóstico usa uma URL remota libsql:// ou https://, sem credenciais na URL.",
    );
  }
  // SQL over HTTP: https://docs.turso.tech/sdk/http/reference
  // Recriar a URL evita a diferença entre protocolos especiais e não especiais
  // ao atribuir URL.protocol diretamente a uma URL libsql://.
  const endpoint = new URL("/v2/pipeline", `https://${url.host}`);
  const token = requiredEnv("TURSO_AUTH_TOKEN");
  const statements = [
    { sql: "SELECT 1 AS connected, sqlite_version() AS sqlite_version" },
    {
      sql: "SELECT type, name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
    },
    { sql: "PRAGMA foreign_keys" },
    {
      sql: "SELECT json_valid(?) AS json_supported",
      args: [{ type: "text", value: JSON.stringify({ ok: true }) }],
    },
  ];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        ...statements.map((stmt) => ({ type: "execute", stmt })),
        { type: "close" },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const hint = [401, 403].includes(response.status)
      ? " Confira se TURSO_AUTH_TOKEN é um token de acesso ao banco e se tem permissão de leitura."
      : " Confira a URL, a disponibilidade do banco e o acesso à rede.";
    throw new ConnectionCheckError(
      `A Turso respondeu HTTP ${response.status}.${hint}`,
    );
  }

  const payload = (await response.json()) as { results: PipelineResult[] };
  const results = statements.map((_, index) => {
    const item = payload.results?.[index];
    if (item?.type === "error") {
      const code = item.error.code;
      const safeCode =
        code && /^[A-Z0-9_]{1,80}$/.test(code) ? ` (${code})` : "";
      throw new ConnectionCheckError(
        `A consulta de diagnóstico ${index + 1} falhou${safeCode}.`,
      );
    }
    if (item?.type !== "ok" || !item.response.result) {
      throw new ConnectionCheckError(
        "A Turso retornou uma resposta SQL inesperada.",
      );
    }
    return resultRows(item.response.result);
  });

  const connected = results[0][0]?.connected === 1;
  const jsonSupported = results[3][0]?.json_supported === 1;
  if (!connected || !jsonSupported) {
    throw new ConnectionCheckError(
      "A resposta não confirmou conexão e suporte a JSON.",
    );
  }
  const metadata = {
    connected,
    sqliteVersion: results[0][0]?.sqlite_version,
    tables: results[1]
      .filter((row) => row.type === "table")
      .map((row) => row.name),
    indexCount: results[1].filter((row) => row.type === "index").length,
    triggerCount: results[1].filter((row) => row.type === "trigger").length,
    foreignKeysEnabled: results[2][0]?.foreign_keys === 1,
    jsonSupported,
    writeAccess: "not-tested",
  };
  if (args.includes("--json")) {
    console.log(JSON.stringify(metadata, null, 2));
  } else {
    console.log(
      `[turso:check] Conexão OK. SQLite ${metadata.sqliteVersion}; JSON OK.`,
    );
    console.log(
      `[turso:check] Tabelas (${metadata.tables.length}): ${metadata.tables.join(", ") || "nenhuma"}.`,
    );
    console.log(
      `[turso:check] Índices: ${metadata.indexCount}; triggers: ${metadata.triggerCount}; foreign_keys: ${metadata.foreignKeysEnabled ? "ON" : "OFF"}.`,
    );
    console.log(
      "[turso:check] Somente leituras executadas. Permissões de escrita e DDL ainda não testadas.",
    );
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof ConnectionCheckError
      ? error.message
      : "Falha de rede ou resposta inválida. Confira a configuração e tente novamente; detalhes sensíveis foram omitidos.";
  console.error(`[turso:check] ${message}`);
  process.exitCode = 1;
});
