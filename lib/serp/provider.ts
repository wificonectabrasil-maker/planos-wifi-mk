import type { SerpItem, SerpMeta } from "@/lib/google/types";
import { fetchCustomSearch, GoogleCseError } from "@/lib/google/customSearch";
import { getGoogleCseCredentials, type GoogleCseCredentials } from "@/lib/google/settings";

export type SerpProvider = "serper" | "google_cse";

type SerperCredentials = {
  provider: "serper";
  apiKey: string;
  source: "env";
};

type GoogleSearchCredentials = GoogleCseCredentials & {
  provider: "google_cse";
};

export type SerpProviderCredentials = SerperCredentials | GoogleSearchCredentials;

export class SerpProviderError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  provider: SerpProvider;

  constructor(message: string, status: number, provider: SerpProvider, code?: string, details?: unknown) {
    super(message);
    this.name = "SerpProviderError";
    this.status = status;
    this.provider = provider;
    this.code = code;
    this.details = details;
  }
}

type ProviderSearchParams = {
  credentials: SerpProviderCredentials;
  query: string;
  num?: number;
  start?: number;
  hl?: string;
  gl?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 8000;

function normalizeTotalResults(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeSearchTime(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getDisplayLink(link: string, displayLink?: string) {
  if (displayLink && displayLink.trim()) return displayLink.trim();
  try {
    return new URL(link).hostname;
  } catch {
    return "";
  }
}

function getGoogleDomain(gl?: string) {
  const normalized = gl?.trim().toUpperCase();
  if (normalized === "BR") return "google.com.br";
  return "google.com";
}

function parseSerperErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Serper request failed";
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (typeof record.statusCode === "number" && typeof record.statusMessage === "string") return record.statusMessage;
  return "Serper request failed";
}

async function fetchSerperSearch(
  params: Omit<ProviderSearchParams, "credentials"> & { credentials: SerperCredentials }
): Promise<{ items: SerpItem[]; meta: SerpMeta }> {
  const { credentials, query, num, start, hl, gl, timeoutMs } = params;
  const url = "https://google.serper.dev/search";
  const page = typeof start === "number" && start > 1 ? Math.floor((start - 1) / (num || 10)) + 1 : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": credentials.apiKey,
      },
      body: JSON.stringify({
        q: query,
        gl: gl?.toLowerCase(),
        hl: hl?.toLowerCase(),
        ...(typeof num === "number" ? { num } : {}),
        ...(typeof page === "number" ? { page } : {}),
      }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new SerpProviderError(
        parseSerperErrorMessage(payload),
        response.status || 500,
        "serper",
        "serper_error",
        payload
      );
    }

    const data = (payload ?? {}) as Record<string, unknown>;
    const organicResults = Array.isArray(data.organic) ? (data.organic as Array<Record<string, unknown>>) : [];

    const items: SerpItem[] = organicResults.map((item) => {
      const link = typeof item.link === "string" ? item.link : "";
      return {
        title: typeof item.title === "string" ? item.title : "",
        link,
        snippet: typeof item.snippet === "string" ? item.snippet : "",
        displayLink: getDisplayLink(link),
      };
    });

    return {
      items,
      meta: {
        totalResults: normalizeTotalResults(data.totalResults),
        searchTime: normalizeSearchTime(data.searchTime),
        provider: "serper",
      },
    };
  } catch (error: unknown) {
    if ((error as { name?: string } | undefined)?.name === "AbortError") {
      throw new SerpProviderError("Serper timeout", 504, "serper", "timeout");
    }
    if (error instanceof SerpProviderError) throw error;
    throw new SerpProviderError(
      error instanceof Error ? error.message : "Serper failure",
      500,
      "serper",
      "unknown",
      error
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGoogleSearch(
  params: Omit<ProviderSearchParams, "credentials"> & { credentials: GoogleSearchCredentials }
): Promise<{ items: SerpItem[]; meta: SerpMeta }> {
  const { credentials, query, num, start, hl, gl } = params;
  try {
    const { items, meta } = await fetchCustomSearch({
      query,
      apiKey: credentials.apiKey,
      cx: credentials.cx,
      num,
      start,
      hl,
      gl,
    });

    return {
      items,
      meta: {
        ...(meta ?? {}),
        provider: "google_cse",
      },
    };
  } catch (error: unknown) {
    if (error instanceof GoogleCseError) {
      throw new SerpProviderError(error.message, error.status, "google_cse", error.code, error.details);
    }
    throw new SerpProviderError(
      error instanceof Error ? error.message : "Google Custom Search failure",
      500,
      "google_cse",
      "unknown",
      error
    );
  }
}

export async function getSerpProviderCredentials(): Promise<SerpProviderCredentials | null> {
  const serperApiKey = process.env.SERPER_API_KEY?.trim() || process.env.SERPAPI_KEY?.trim();
  if (serperApiKey) {
    return {
      provider: "serper",
      apiKey: serperApiKey,
      source: "env",
    };
  }

  const googleCredentials = await getGoogleCseCredentials();
  if (googleCredentials) {
    return {
      ...googleCredentials,
      provider: "google_cse",
    };
  }

  return null;
}

export async function fetchSerpResults(params: ProviderSearchParams): Promise<{ items: SerpItem[]; meta: SerpMeta }> {
  if (params.credentials.provider === "serper") {
    return fetchSerperSearch({ ...params, credentials: params.credentials });
  }

  return fetchGoogleSearch({ ...params, credentials: params.credentials });
}
