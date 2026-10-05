import { config } from "dotenv";
import { getTursoClient } from "../lib/database/client";
import { migrate } from "../lib/database/migrate";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
try {
  const client = getTursoClient();
  await migrate(client);
  client.close();
  console.log(
    "[db:migrate] Schema pronto. Nenhum conteúdo de exemplo foi instalado.",
  );
} catch (error) {
  console.error(
    "[db:migrate]",
    error instanceof Error ? error.message : "Falha na instalação",
  );
  process.exitCode = 1;
}
