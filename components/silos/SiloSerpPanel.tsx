"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Search, TrendingUp } from "lucide-react";
import { useCseSearch } from "@/hooks/useCseSearch";
import type { SerpItem } from "@/lib/google/types";
import { computeSerpOverlapScore } from "@/lib/seo/cannibalization";

type SiloSerpPanelProps = {
  defaultQuery: string;
  baselineQuery?: string;
  hl?: string;
  gl?: string;
  title?: string;
};

function extractDomain(displayLink: string, link: string) {
  const cleaned = displayLink?.trim();
  if (cleaned) return cleaned.replace(/^www\./i, "");
  try {
    return new URL(link).hostname.replace(/^www\./i, "");
  } catch {
    return link.replace(/^https?:\/\//i, "").split("/")[0] || link;
  }
}

export function SiloSerpPanel({
  defaultQuery,
  baselineQuery,
  hl = "pt-BR",
  gl = "BR",
  title = "SERP",
}: SiloSerpPanelProps) {
  const [query, setQuery] = useState(defaultQuery);
  const prevDefault = useRef(defaultQuery);
  const [baselineData, setBaselineData] = useState<{ items: SerpItem[] } | null>(null);
  const { data, loading, error, errorCode, analyze } = useCseSearch({ num: 10, hl, gl });

  useEffect(() => {
    if (prevDefault.current !== defaultQuery) {
      setQuery((current) => (current.trim().length ? current : defaultQuery));
      prevDefault.current = defaultQuery;
    }
  }, [defaultQuery]);

  const handleAnalyze = async () => {
    const term = (query || defaultQuery).trim();
    if (!term) return;
    setQuery(term);
    const response = await analyze(term);
    if (!response) return;

    if (baselineQuery && baselineQuery.trim() && baselineQuery.trim() !== term && !baselineData) {
      try {
        const baselineResponse = await fetch("/api/seo/cse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: baselineQuery.trim(), num: 10, hl, gl }),
        });
        const baselineJson = await baselineResponse.json().catch(() => ({}));
        if (baselineResponse.ok && Array.isArray(baselineJson?.items)) {
          setBaselineData({ items: baselineJson.items as SerpItem[] });
        }
      } catch {
        // ignore baseline errors
      }
    }
  };

  const items = data?.items ?? [];

  const domainStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const domain = extractDomain(item.displayLink, item.link);
      if (!domain) continue;
      counts[domain] = (counts[domain] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const anomaly = useMemo(() => {
    if (!baselineData || items.length === 0) return null;
    const overlap = computeSerpOverlapScore(baselineData.items, items);
    if (overlap.score < 0.2) {
      return "SERP muito diferente do baseline do silo. Pode ser outra intenção de busca.";
    }
    return null;
  }, [baselineData, items]);

  const showCredentialsCta = errorCode === "missing_credentials";

  return (
    <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-(--muted)">
        <span className="flex items-center gap-2">
          <TrendingUp size={14} />
          {title}
        </span>
        {data?.meta?.cache === "hit" ? <span className="text-[9px] text-(--muted-2)">cache</span> : null}
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleAnalyze()}
          placeholder={defaultQuery || "Digite a query"}
          className="w-full rounded-md border border-(--border) bg-(--surface) px-2 py-1.5 text-[11px] text-(--text) outline-none placeholder:text-(--text)"
        />
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded bg-(--text) px-3 py-2 text-[11px] font-semibold text-(--surface) transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Search size={14} />
              Analisar SERP
            </>
          )}
        </button>
      </div>

      {error ? (
        <div className="rounded border border-[color:var(--admin-danger)] bg-(--surface) p-2 text-[11px] text-(--admin-danger)">
          {error}
          {showCredentialsCta ? (
            <div className="mt-2 text-[10px] text-(--admin-danger)">
              Configure a integracao com Google em <span className="font-semibold">/admin</span>.
            </div>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
            <div className="flex items-center justify-between text-[11px] font-semibold text-(--text)">
              <span>Sinais</span>
              <span className="text-[10px] text-(--muted)">
                Total resultados: {data?.meta?.totalResults ?? "N/D"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-(--muted)">
              {domainStats.length === 0 ? (
                <span className="text-(--muted-2)">Sem dominios suficientes.</span>
              ) : (
                domainStats.map(([domain, count]) => (
                  <span key={domain} className="rounded-full border border-(--border) bg-(--surface-muted) px-2 py-1">
                    {domain} ({count})
                  </span>
                ))
              )}
            </div>
            {anomaly ? (
              <div className="mt-2 rounded border border-[color:var(--admin-warning)] bg-(--surface) p-2 text-[10px] text-(--admin-warning)">{anomaly}</div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="sticky top-0 bg-(--surface-muted) py-1 text-[11px] font-semibold text-(--text)">
              Top 10 resultados
            </div>
            {items.map((result, index) => (
              <div key={`${result.link}-${index}`} className="rounded border border-(--border) bg-(--surface) p-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-(--muted)">#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 truncate text-[11px] font-medium text-(--brand-primary) hover:underline"
                      title={result.title}
                    >
                      {result.title}
                      <ExternalLink size={10} className="shrink-0" />
                    </a>
                    <div className="truncate text-[9px] text-(--muted-2)">{result.displayLink}</div>
                    <div className="mt-0.5 line-clamp-2 text-[10px] text-(--text)">{result.snippet}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted-2)">
          Use a query para comparar SERP e entender intenção.
        </div>
      ) : null}
    </section>
  );
}
