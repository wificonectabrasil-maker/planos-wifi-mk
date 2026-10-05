"use client";

import { useState } from "react";
import { CheckCircle2, PlugZap, XCircle } from "lucide-react";

type GoogleSettingsSummary = {
  source: "env" | "db" | "none";
  envPresent: boolean;
  stored: {
    apiKeyMasked: string | null;
    cx: string | null;
    updatedAt?: string | null;
  };
};

export function GoogleIntegrationCard({ summary }: { summary: GoogleSettingsSummary }) {
  const [apiKey, setApiKey] = useState("");
  const [cx, setCx] = useState(summary.stored.cx ?? "");
  const [apiKeyMasked, setApiKeyMasked] = useState(summary.stored.apiKeyMasked ?? null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<null | { type: "ok" | "error"; message: string }>(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const payload: Record<string, string> = {};
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      if (cx.trim()) payload.cx = cx.trim();

      const response = await fetch("/api/admin/google-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ type: "error", message: json?.message || "Falha ao salvar integracao." });
        return;
      }

      setApiKeyMasked(json?.apiKeyMasked ?? apiKeyMasked);
      if (json?.cx) setCx(json.cx);
      setApiKey("");
      setStatus({ type: "ok", message: "Integracao salva." });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message || "Falha ao salvar integracao." });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/serp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "teste" }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ type: "error", message: json?.message || "Falha no teste da SERP." });
        return;
      }
      setStatus({ type: "ok", message: `Conexao OK. ${json?.items?.length ?? 0} resultados.` });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message || "Falha no teste da SERP." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-(--border) bg-(--paper) p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <PlugZap size={16} />
        Integracao com Google (Custom Search)
      </div>
      <p className="mt-1 text-xs text-(--muted)">
        Fonte ativa: <strong>{summary.source}</strong>
        {summary.envPresent ? " (env tem prioridade)" : ""}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-xs">
          <span className="text-[11px] font-semibold uppercase text-(--muted-2)">API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={apiKeyMasked ? apiKeyMasked : "Cole a API key"}
            className="mt-2 w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block text-xs">
          <span className="text-[11px] font-semibold uppercase text-(--muted-2)">Search Engine ID (cx)</span>
          <input
            value={cx}
            onChange={(event) => setCx(event.target.value)}
            placeholder="cx..."
            className="mt-2 w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-(--brand-hot) px-4 py-2 text-xs font-semibold text-(--paper) hover:bg-(--brand-accent) disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="rounded-md border border-(--border) bg-(--surface-muted) px-4 py-2 text-xs font-semibold hover:bg-(--brand-primary) disabled:opacity-60"
        >
          {testing ? "Testando..." : "Testar conexao"}
        </button>
      </div>

      {status ? (
        <div
          className={`mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${status.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
            }`}
        >
          {status.type === "ok" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {status.message}
        </div>
      ) : null}

      <p className="mt-3 text-[10px] text-(--muted-2)">
        Necessario configurar <code>GOOGLE_CSE_API_KEY</code> e <code>GOOGLE_CSE_CX</code> (env ou salvar aqui).
      </p>
    </section>
  );
}
