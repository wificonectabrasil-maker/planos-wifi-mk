import type { Client } from "@libsql/client";
import { wifiEditorialSilos } from "./editorial-plan";

export const retiredEditorialSlugs = ["contratacao", "velocidades", "wifi-e-uso", "guias-de-operadoras", "comparacoes-e-combos"];

export async function setupWifiEditorialSilos(client: Client) {
  const tx = await client.transaction("write");
  try {
    const existing = await tx.execute({
      sql: `SELECT s.slug, COUNT(p.id) AS posts FROM silos s JOIN posts p ON p.silo_id=s.id WHERE s.slug IN (${retiredEditorialSlugs.map(() => "?").join(",")}) GROUP BY s.id`,
      args: retiredEditorialSlugs,
    });
    if (existing.rows.some(row => Number(row.posts) > 0)) {
      throw new Error("Há posts vinculados aos silos antigos. Revise sua migração antes de retirar esses silos.");
    }
    for (const [index, silo] of wifiEditorialSilos.entries()) {
      await tx.execute({
        sql: "INSERT INTO silos(name,slug,description,meta_title,meta_description,menu_order,is_active,show_in_navigation) VALUES(?,?,?,?,?,?,1,1) ON CONFLICT(slug) DO UPDATE SET name=excluded.name,description=excluded.description,meta_title=excluded.meta_title,meta_description=excluded.meta_description,menu_order=excluded.menu_order,is_active=1,show_in_navigation=1",
        args: [silo.name, silo.slug, silo.description, `${silo.name} — WifiConecta`, silo.description, index + 1],
      });
    }
    await tx.execute({
      sql: `UPDATE silos SET is_active=0,show_in_navigation=0 WHERE slug IN (${retiredEditorialSlugs.map(() => "?").join(",")})`,
      args: retiredEditorialSlugs,
    });
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
