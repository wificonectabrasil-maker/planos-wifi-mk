import { config } from "dotenv";
import { getTursoClient } from "../lib/database/client";
import { wifiEditorialPlan } from "../lib/telecom/editorial-plan";
config({ path: ".env.local", quiet: true });
const client = getTursoClient();
try {
  await client.batch(
    wifiEditorialPlan.map((silo, index) => ({
      sql: "INSERT INTO silos(name,slug,description,meta_title,meta_description,menu_order,is_active,show_in_navigation) VALUES(?,?,?,?,?,?,1,1) ON CONFLICT(slug) DO NOTHING",
      args: [
        silo.name,
        silo.slug,
        `Guias de ${silo.name.toLowerCase()} para escolher e consultar internet.`,
        `${silo.name} — guias WifiConecta`,
        `Informação sobre ${silo.name.toLowerCase()}, internet e escolha de planos.`,
        index + 1,
      ],
    })),
    "write",
  );
  console.log(
    "WifiConecta: 5 silos preparados. Nenhum artigo ou oferta de exemplo publicado.",
  );
} finally {
  client.close();
}
