import { getAdminDatabase } from "@/lib/database";

type MapRow = { id: number | string } | null;

function toWpId(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function lookupIdByUuid(entityType: string, entityUuid: string) {
  const database = getAdminDatabase();
  const { data, error } = await database
    .from("wp_id_map")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_uuid", entityUuid)
    .maybeSingle();
  if (error) throw error;
  return data as MapRow;
}

async function lookupIdByKey(entityType: string, entityKey: string) {
  const database = getAdminDatabase();
  const { data, error } = await database
    .from("wp_id_map")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_key", entityKey)
    .maybeSingle();
  if (error) throw error;
  return data as MapRow;
}

async function insertMap(values: { entity_type: string; entity_uuid?: string; entity_key?: string }) {
  const database = getAdminDatabase();
  const { data, error } = await database.from("wp_id_map").insert(values).select("id").maybeSingle();
  if (error) throw error;
  return data as MapRow;
}

export async function getOrCreateWpIdByUuid(entityType: string, entityUuid: string) {
  if (!entityUuid) return 0;
  const existing = await lookupIdByUuid(entityType, entityUuid);
  if (existing?.id) return toWpId(existing.id);

  try {
    const created = await insertMap({ entity_type: entityType, entity_uuid: entityUuid });
    if (created?.id) return toWpId(created.id);
  } catch (error: any) {
    if (error?.code === "UNIQUE_VIOLATION") {
      const retry = await lookupIdByUuid(entityType, entityUuid);
      if (retry?.id) return toWpId(retry.id);
    }
    throw error;
  }

  return 0;
}

export async function getOrCreateWpIdByKey(entityType: string, entityKey: string) {
  if (!entityKey) return 0;
  const existing = await lookupIdByKey(entityType, entityKey);
  if (existing?.id) return toWpId(existing.id);

  try {
    const created = await insertMap({ entity_type: entityType, entity_key: entityKey });
    if (created?.id) return toWpId(created.id);
  } catch (error: any) {
    if (error?.code === "UNIQUE_VIOLATION") {
      const retry = await lookupIdByKey(entityType, entityKey);
      if (retry?.id) return toWpId(retry.id);
    }
    throw error;
  }

  return 0;
}
