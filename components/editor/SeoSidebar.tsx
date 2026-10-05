"use client";

import { countOccurrences, extractFirstParagraphText, normalizeText, wordCount } from "./utils/seo";

export function SeoSidebar(props: {
  targetKeyword: string;
  supportingKeywords: string[];
  html: string;
  text: string;
}) {
  const firstP = extractFirstParagraphText(props.html);
  const firstHasTarget = normalizeText(firstP).includes(normalizeText(props.targetKeyword));

  const wc = wordCount(props.text);
  const occ = countOccurrences(props.text, props.targetKeyword);
  const density = wc > 0 ? (occ / wc) * 100 : 0;

  const supportingStatus = (props.supportingKeywords ?? []).map((k) => ({
    keyword: k,
    used: normalizeText(props.text).includes(normalizeText(k)),
  }));

  const supportingUsed = supportingStatus.filter((s) => s.used).length;

  // Score simples (heurístico) — ajustável depois
  const score =
    (firstHasTarget ? 30 : 0) +
    Math.min(30, wc >= 800 ? 30 : Math.round((wc / 800) * 30)) +
    (supportingStatus.length ? Math.round((supportingUsed / supportingStatus.length) * 40) : 0);

  return (
    <aside className="rounded-3xl border border-(--border) bg-(--paper) p-6">
      <p className="text-xs text-(--muted-2)">SEO (KGR)</p>
      <div className="mt-3 space-y-4 text-sm">
        <div className="rounded-2xl border border-(--border) bg-(--paper) p-4">
          <p className="text-xs text-(--muted-2)">Score</p>
          <p className="mt-1 text-2xl font-semibold">{score}/100</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-(--muted-2)">Checklist</p>

          <Check ok={firstHasTarget} label="Keyword no 1º parágrafo" />
          <Check ok={wc >= 800} label="800+ palavras (mínimo recomendado)" />
          <Check ok={density >= 0.6 && density <= 1.8} label={`Densidade alvo ~0,6% a 1,8% (atual: ${density.toFixed(1)}%)`} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-(--muted-2)">Supporting keywords</p>
          {supportingStatus.length === 0 ? (
            <p className="text-xs text-(--muted-3)">Sem supporting keywords definidas.</p>
          ) : (
            <div className="space-y-1">
              {supportingStatus.map((s) => (
                <Check key={s.keyword} ok={s.used} label={s.keyword} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-(--border) bg-(--paper) p-4 text-xs text-(--muted-2) space-y-1">
          <p>Palavras: <span className="text-(--muted)">{wc}</span></p>
          <p>Ocorrências da keyword: <span className="text-(--muted)">{occ}</span></p>
          <p className="text-(--muted-3)">Ajuste fino depois: links internos, headings e snippet.</p>
        </div>
      </div>
    </aside>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border ${ok ? "border-(--brand-primary) bg-(--brand-primary)" : "border-(--border) bg-(--surface-muted)"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-(--brand-hot)" : "bg-[color:rgba(43,44,48,0.2)]"}`} />
      </span>
      <span className={`text-xs ${ok ? "text-(--ink)" : "text-(--muted-3)"}`}>{label}</span>
    </div>
  );
}

