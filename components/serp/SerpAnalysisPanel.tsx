"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Loader2, Search, TrendingUp } from "lucide-react";
import { useSerpAnalysis } from "@/hooks/useSerpAnalysis";
import type { SerpItem } from "@/lib/google/types";

type SerpAnalysisPanelProps = {
  defaultQuery: string;
  intentSource?: string;
  hl?: string;
  gl?: string;
  title?: string;
};

const INFO_KEYWORDS = ["como", "guia", "passo a passo", "tutorial"];
const COMPARATIVE_KEYWORDS = ["melhor", "review", "comparativo", "vs", "top"];
const ECOMMERCE_PATTERNS = ["/dp/", "/product", "/produto", "/loja", "checkout", "/cart", "/carrinho"];

function extractDomain(displayLink: string, link: string) {
  const cleaned = displayLink?.trim();
  if (cleaned) return cleaned.replace(/^www\./i, "");
  try {
    return new URL(link).hostname.replace(/^www\./i, "");
  } catch {
    return link.replace(/^https?:\/\//i, "").split("/")[0] || link;
  }
}

function isEcommerceUrl(url: string) {
  const lower = url.toLowerCase();
  return ECOMMERCE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function countByKeyword(items: SerpItem[], keywords: string[]) {
  return items.reduce((acc, item) => {
    const title = item.title.toLowerCase();
    return keywords.some((kw) => title.includes(kw)) ? acc + 1 : acc;
  }, 0);
}

function detectIntent(text: string) {
  const lower = text.toLowerCase();
  if (COMPARATIVE_KEYWORDS.some((kw) => lower.includes(kw))) return "comparativo";
  if (INFO_KEYWORDS.some((kw) => lower.includes(kw))) return "informacional";
  return "neutro";
}

export function SerpAnalysisPanel({
  defaultQuery,
  intentSource,
  hl = "pt-BR",
  gl = "BR",
  title = "Analise SERP",
}: SerpAnalysisPanelProps) {
  const [query, setQuery] = useState(defaultQuery);
  const prevDefault = useRef(defaultQuery);
  const { data, loading, error, errorCode, analyze } = useSerpAnalysis({ num: 10, hl, gl });

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
    await analyze(term);
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

  const intentStats = useMemo(() => {
    const ecommerceCount = items.filter((item) => isEcommerceUrl(item.link)).length;
    const informationalCount = countByKeyword(items, INFO_KEYWORDS);
    const comparativeCount = countByKeyword(items, COMPARATIVE_KEYWORDS);

    let serpIntent: "comercial" | "informacional" | "comparativo" | "mista" = "mista";
    if (ecommerceCount >= 5) serpIntent = "comercial";
    else if (comparativeCount >= 4) serpIntent = "comparativo";
    else if (informationalCount >= 4) serpIntent = "informacional";

    return { ecommerceCount, informationalCount, comparativeCount, serpIntent };
  }, [items]);

  const intentWarnings = useMemo(() => {
    if (!items.length) return [];
    const source = intentSource || defaultQuery || query;
    const contentIntent = detectIntent(source || "");
    const warnings: string[] = [];

    if (intentStats.serpIntent === "comercial" && contentIntent === "informacional") {
      warnings.push("SERP comercial detectada. Ajuste o angulo (mais comparativo/review) para competir.");
    }

    return warnings;
  }, [items.length, intentSource, defaultQuery, query, intentStats.serpIntent]);

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
              Configure a integracao com Google em{" "}
              <Link href="/admin" className="font-semibold underline">
                /admin
              </Link>
              .
            </div>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
            <div className="flex items-center justify-between text-[11px] font-semibold text-(--text)">
              <span>Sinais de intencao</span>
              <span className="text-[10px] text-(--muted)">{intentStats.serpIntent}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
                <div className="text-[11px] font-semibold text-(--text)">{intentStats.ecommerceCount}</div>
                <div>comercial</div>
              </div>
              <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
                <div className="text-[11px] font-semibold text-(--text)">{intentStats.informationalCount}</div>
                <div>informacional</div>
              </div>
              <div className="rounded border border-(--border) bg-(--surface-muted) p-2 text-center">
                <div className="text-[11px] font-semibold text-(--text)">{intentStats.comparativeCount}</div>
                <div>comparativo</div>
              </div>
            </div>
          </div>

          {intentWarnings.length > 0 ? (
            <div className="rounded border border-[color:var(--admin-warning)] bg-(--surface) p-2 text-[10px] text-(--admin-warning)">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-(--admin-warning)">
                <AlertTriangle size={12} />
                Alertas
              </div>
              <div className="mt-1 space-y-1">
                {intentWarnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded border border-(--border) bg-(--surface) p-2">
            <div className="text-[11px] font-semibold text-(--text)">Dominios dominantes</div>
            {domainStats.length === 0 ? (
              <p className="mt-2 text-[10px] text-(--muted-2)">Sem dominios suficientes.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-(--muted)">
                {domainStats.map(([domain, count]) => (
                  <span key={domain} className="rounded-full border border-(--border) bg-(--surface-muted) px-2 py-1">
                    {domain} ({count})
                  </span>
                ))}
              </div>
            )}
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
          Use a query para comparar SERP (dominios, intentos e sobreposicoes).
        </div>
      ) : null}
    </section>
  );
}
