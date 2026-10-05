import type { SerpItem } from "@/lib/google/types";

export class GoogleCseError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "GoogleCseError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type CustomSearchParams = {
  query: string;
  apiKey: string;
  cx: string;
  num?: number;
  start?: number;
  hl?: string;
  gl?: string;
  timeoutMs?: number;
};

type GoogleSearchInformation = {
  totalResults?: string;
  searchTime?: number;
};

const DEFAULT_TIMEOUT_MS = 8000;

export async function fetchCustomSearch(params: CustomSearchParams) {
  const { query, apiKey, cx, num, start, hl, gl, timeoutMs } = params;

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  if (num) url.searchParams.set("num", String(num));
  if (start) url.searchParams.set("start", String(start));
  if (hl) url.searchParams.set("hl", hl);
  if (gl) url.searchParams.set("gl", gl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal, cache: "no-store" });

    if (!response.ok) {
      let errorPayload: any = null;
      try {
        errorPayload = await response.json();
      } catch {
        // ignore parse errors
      }
      const apiError = errorPayload?.error;
      const reason = apiError?.errors?.[0]?.reason;
      throw new GoogleCseError(apiError?.message || "Google Custom Search error", response.status, reason, apiError);
    }

    const data = await response.json();
    const items: SerpItem[] = (data.items || []).map((item: any) => ({
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || "",
      displayLink: item.displayLink || "",
    }));

    const info: GoogleSearchInformation | undefined = data.searchInformation;
    const totalResults = info?.totalResults ? Number(info.totalResults) : undefined;
    const searchTime = typeof info?.searchTime === "number" ? info?.searchTime : undefined;

    return {
      items,
      meta: {
        totalResults: Number.isFinite(totalResults) ? totalResults : undefined,
        searchTime,
      },
    };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new GoogleCseError("Google Custom Search timeout", 504, "timeout");
    }
    if (error instanceof GoogleCseError) throw error;
    throw new GoogleCseError(error?.message || "Google Custom Search failure", 500, "unknown", error);
  } finally {
    clearTimeout(timeout);
  }
}
