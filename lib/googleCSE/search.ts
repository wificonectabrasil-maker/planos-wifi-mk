import { getSerpCache, setSerpCache } from "@/lib/cache/serpCache";
import { fetchSerpResults, getSerpProviderCredentials } from "@/lib/serp/provider";

type SearchOptions = {
  num?: number;
  start?: number;
  hl?: string;
  gl?: string;
  useCache?: boolean;
};

export async function searchCSE(query: string, options: SearchOptions = {}) {
  const term = query.trim();
  if (!term) {
    throw new Error("invalid_request");
  }

  const credentials = await getSerpProviderCredentials();
  if (!credentials) {
    throw new Error("missing_credentials");
  }

  const num = options.num ?? 10;
  const start = typeof options.start === "number" ? options.start : null;
  const hl = options.hl?.trim() || null;
  const gl = options.gl?.trim().toUpperCase() || null;

  const cacheKey = { query: `${credentials.provider}:${term}`, gl, hl, num, start };
  if (options.useCache !== false) {
    const cached = await getSerpCache(cacheKey);
    if (cached) {
      return {
        query: term,
        items: cached.items,
        meta: {
          ...(cached.meta ?? {}),
          cache: "hit" as const,
        },
      };
    }
  }

  const { items, meta } = await fetchSerpResults({
    credentials,
    query: term,
    num,
    start: start ?? undefined,
    hl: hl ?? undefined,
    gl: gl ?? undefined,
  });

  if (options.useCache !== false) {
    await setSerpCache(cacheKey, items, meta);
  }

  return {
    query: term,
    items,
    meta: {
      ...(meta ?? {}),
      cache: "miss" as const,
    },
  };
}
