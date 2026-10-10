import { config } from "dotenv";
import { getTursoClient } from "../lib/database/client";
import { mkdir, writeFile } from "node:fs/promises";
import { setupWifiEditorialSilos } from "../lib/telecom/editorial-setup";
config({ path: ".env.local", quiet: true });
const client = getTursoClient();
try {
  const silos = await client.execute("SELECT * FROM silos");
  const posts = await client.execute("SELECT id,slug,silo_id,published,status,canonical_path FROM posts");
  await mkdir("artifacts", { recursive: true });
  const backupPath = `artifacts/wificonecta-silos-before-${Date.now()}.json`;
  await writeFile(backupPath, JSON.stringify({ silos: silos.rows, posts: posts.rows }, null, 2));
  await setupWifiEditorialSilos(client);
  console.log(
    `WifiConecta: 2 silos preparados. Silos antigos, quando presentes e sem posts, são desativados sem exclusão. Nenhum artigo criado ou publicado. Snapshot: ${backupPath}`,
  );
} finally {
  client.close();
}
