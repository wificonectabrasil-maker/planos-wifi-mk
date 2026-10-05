"use client";

import { useCallback, useState } from "react";
import type { SerpResponse } from "@/lib/google/types";

type SerpQueryOptions = {
  num?: number;
  start?: number;
  hl?: string;
  gl?: string;
};

export function useSerpAnalysis(defaultOptions: SerpQueryOptions = {}) {
  const [data, setData] = useState<SerpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const analyze = useCallback(
    async (query: string, options: SerpQueryOptions = {}) => {
      const term = query.trim();
      if (term.length < 2) {
        setError("Informe uma query valida.");
        setErrorCode("invalid_request");
        return null;
      }

      setLoading(true);
      setError(null);
      setErrorCode(null);

      try {
        const payload = {
          query: term,
          num: options.num ?? defaultOptions.num,
          start: options.start ?? defaultOptions.start,
          hl: options.hl ?? defaultOptions.hl,
          gl: options.gl ?? defaultOptions.gl,
        };

        const response = await fetch("/api/serp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(json?.message || json?.error || "Falha ao analisar SERP.");
          setErrorCode(json?.error || "request_failed");
          setData(null);
          return null;
        }

        setData(json as SerpResponse);
        return json as SerpResponse;
      } catch (err: any) {
        setError(err?.message || "Falha ao analisar SERP.");
        setErrorCode("request_failed");
        setData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultOptions.gl, defaultOptions.hl, defaultOptions.num, defaultOptions.start]
  );

  return {
    data,
    loading,
    error,
    errorCode,
    analyze,
    setData,
    setError,
  };
}
