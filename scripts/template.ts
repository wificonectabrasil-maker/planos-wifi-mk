import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { createClient } from "@libsql/client";
import {
  writeDatabasePreset,
  exportRepositoryPreset,
  initializeProjectEnv,
  installDatabasePreset,
  readTargetEnv,
  TemplateError,
} from "../lib/template/preset";

async function main() {
  const [command, ...args] = process.argv.slice(2);
  let options: Record<string, string | boolean | undefined>;
  try {
    const allowed: ParseArgsOptionsConfig =
      command === "init"
        ? {
            env: { type: "string" as const },
            email: { type: "string" as const },
          }
        : command === "export"
          ? { output: { type: "string" as const } }
          : command === "install"
            ? { env: { type: "string" as const } }
            : {};
    options = parseArgs({
      args,
      options: { ...allowed, help: { type: "boolean" } },
      strict: true,
    }).values;
  } catch {
    throw new TemplateError("Opção inválida. Consulte --help.");
  }
  const usage: Record<string, string> = {
    schema:
      "pnpm run db:template — gera turso/template/miniwordpress-3.1.sql sem acessar o banco.",
    export:
      "pnpm run template:export [--output caminho.zip] — gera o repositório neutro Mini WordPress 3.1.",
    init: "pnpm run template:init --email seu@email.com [--env .env.local] — cria credenciais próprias sem substituir um arquivo existente.",
    install:
      "pnpm run db:install [--env .env.local] — instala e verifica o schema. Com --env, usa somente o arquivo indicado.",
  };
  if (!usage[command]) throw new TemplateError("Comando de template inválido.");
  if (options.help) {
    console.log(usage[command]);
    return;
  }
  const root = process.cwd();
  if (command === "schema") {
    console.log(`[db:template] SQL pronto: ${await writeDatabasePreset(root)}`);
  } else if (command === "export") {
    await writeDatabasePreset(root);
    const result = await exportRepositoryPreset(
      root,
      options.output as string | undefined,
    );
    console.log(
      `[template:export] Mini WordPress ${result.version}: ${result.fileCount} arquivos em ${result.output}`,
    );
    console.log(
      "[template:export] Sem .env.local, dados de banco, credenciais, histórico Git ou caches.",
    );
  } else if (command === "init") {
    const file = await initializeProjectEnv(
      root,
      (options.env as string) || ".env.local",
      (options.email as string) || "",
    );
    console.log(`[template:init] Arquivo criado: ${file}`);
    console.log(
      "[template:init] Preencha TURSO_DATABASE_URL e TURSO_AUTH_TOKEN desse projeto. A senha gerada está em ADMIN_PASSWORD no arquivo; não foi exibida no terminal.",
    );
  } else {
    const env = await readTargetEnv(root, options.env as string | undefined);
    const url = env.TURSO_DATABASE_URL?.trim();
    if (!url || url.includes("seu-banco"))
      throw new TemplateError(
        "Configure TURSO_DATABASE_URL no ambiente de destino.",
      );
    const authToken = env.TURSO_AUTH_TOKEN?.trim();
    if (!url.startsWith("file:") && url !== ":memory:" && !authToken)
      throw new TemplateError(
        "Configure TURSO_AUTH_TOKEN com permissão de escrita no banco de destino.",
      );
    const client = createClient({ url, authToken, intMode: "number" });
    try {
      const result = await installDatabasePreset(client, root);
      console.log(
        `[db:install] Mini WordPress 3.1 pronto: ${result.coreTables} tabelas Core, ${result.mediaTables} de mídia, controle de migrations e ${result.urlTriggers} triggers. Sem instalação de conteúdo.`,
      );
    } finally {
      client.close();
    }
  }
}

main().catch((error: unknown) => {
  console.error(
    "[template]",
    error instanceof TemplateError
      ? error.message
      : "A operação falhou. Confira arquivos, URL/token e acesso ao banco. Detalhes sensíveis foram omitidos.",
  );
  process.exitCode = 1;
});
