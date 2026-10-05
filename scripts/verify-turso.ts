import { config } from "dotenv";
import { getTursoClient } from "../lib/database/client";
import { verifyDatabase } from "../lib/database/verify";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
const client = getTursoClient();
try {
  await verifyDatabase(client);
  console.log(
    "[db:verify] OK: 17 tabelas Core, mídia, migrations, triggers e integridade referencial.",
  );
} catch (error) {
  console.error(
    "[db:verify]",
    error instanceof Error ? error.message : "Falha de verificação",
  );
  process.exitCode = 1;
} finally {
  client.close();
}
