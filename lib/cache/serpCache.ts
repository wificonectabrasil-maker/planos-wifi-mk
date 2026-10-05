import { getAdminDatabase } from "@/lib/database";
import type { SerpItem } from "@/lib/google/types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheKey = {
  query: string;
  gl?: string | null;
  hl?: string | null;
  num?: number | null;
  start?: number | null;
};

type CacheRow = {
  items: SerpItem[];
  meta?: any;
  created_at: string;
};

function isMissingTableError(error: any) {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  return /relation .*serp_cache.* does not exist/i.test(message);
}

function applyNullableFilter(query: any, column: string, value?: string | number | null) {
  if (typeof value === "number") {
    return query.eq(column, value);
  }
  if (typeof value === "string" && value.length) {
    return query.eq(column, value);
  }
  return query.is(column, null);
}

export async function getSerpCache(key: CacheKey) {
  try {
    const database = getAdminDatabase();
    let query = database.from("serp_cache").select("items, meta, created_at").eq("query", key.query);
    query = applyNullableFilter(query, "gl", key.gl ?? null);
    query = applyNullableFilter(query, "hl", key.hl ?? null);
    query = applyNullableFilter(query, "num", key.num ?? null);
    query = applyNullableFilter(query, "start", key.start ?? null);
    query = query.order("created_at", { ascending: false }).limit(1);

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (isMissingTableError(error)) return null;
      throw error;
    }
    if (!data) return null;

    const row = data as CacheRow;
    const createdAt = new Date(row.created_at).getTime();
    if (!Number.isFinite(createdAt)) return null;
    if (Date.now() - createdAt > CACHE_TTL_MS) return null;

    return {
      items: Array.isArray(row.items) ? row.items : [],
      meta: row.meta ?? null,
      createdAt: row.created_at,
    };
  } catch (error) {
    if (isMissingTableError(error)) return null;
    return null;
  }
}

export async function setSerpCache(key: CacheKey, items: SerpItem[], meta?: any) {
  try {
    const database = getAdminDatabase();
    const payload = {
      query: key.query,
      gl: key.gl ?? null,
      hl: key.hl ?? null,
      num: key.num ?? null,
      start: key.start ?? null,
      items,
      meta: meta ?? null,
      created_at: new Date().toISOString(),
    };

    const { error } = await database.from("serp_cache").insert(payload);
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (isMissingTableError(error)) return;
  }
}
