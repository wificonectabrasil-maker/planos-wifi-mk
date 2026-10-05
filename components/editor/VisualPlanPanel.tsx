"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Copy, ImagePlus, ListChecks, RefreshCcw, Sparkles } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";

type VisualPlanStatus = "prompt_ready" | "generated" | "uploaded" | "inserted" | "approved";

type CoverArtDirection = {
  cameraAngle: string;
  framing: string;
  modelPose: string;
  modelAction: string;
  compositionVariant: string;
  heroProp: string;
  backgroundMotif: string;
  textMode: string;
  doNotRepeat: string[];
};

type BodyArtDirection = {
  layoutPattern: string;
  focalObject: string;
  visualAction: string;
  supportObjects: string[];
  doNotRepeat: string[];
  markerVariant: string;
};

type VisualPlanSuggestion = {
  id: string;
  kind: "hero" | "og" | "body";
  priority: "required" | "high" | "medium";
  visualRole?: "cover_thumbnail" | "body_context" | "table_visual" | "og";
  placement: string;
  sectionHeading?: string;
  markerId?: string;
  contextBefore?: string;
  contextAfter?: string;
  cropGuidance?: string;
  promptIntent?: string;
  visualTheme?: string;
  localVisualBrief?: string;
  markerSection?: string;
  strongSentence?: string;
  specificTerms?: string[];
  visualDuplicateOf?: string;
  dedupeReason?: string;
  sourceTextUsed?: string;
  coverSourceMode?: "stock_image_edit";
  googleInspiredVisualSystem?: string[];
  augmentedRealityDirection?: string;
  stockPhotoEditInstruction?: string;
  generatorPromptProfile?: "multi_generator";
  coverVariable?: string;
  coverDifferentiator?: string;
  coverArtDirection?: CoverArtDirection;
  bodyArtDirection?: BodyArtDirection;
  compositionVariant?: string;
  cameraAngle?: string;
  modelPose?: string;
  modelAction?: string;
  layoutPattern?: string;
  focalObject?: string;
  doNotRepeat?: string[];
  visualType: string;
  aspectRatio: string;
  prompt: string;
  chatgptImagesPrompt?: string;
  geminiImagePrompt?: string;
  customGptPrompt?: string;
  promptMode?: "multi_generator";
  promptLength?: {
    chatgptImages?: number;
    geminiImage?: number;
  };
  promptWarnings?: string[];
  technicalBrief?: string;
  altText: string;
  caption: string;
  objective: string;
  suggestedFileName: string;
  approvalCriteria: string[];
  status: VisualPlanStatus;
};

type VisualPlanDiagnostics = {
  hasHero: boolean;
  hasHeroAlt: boolean;
  hasOgImage: boolean;
  ogStatus: "defined" | "inherits_hero" | "missing";
  bodyImageCount: number;
  wordCount: number;
  internalLinkCount?: number;
  supportSourceCount?: number;
  suggestedImageCount?: number;
  warnings: string[];
};

type VisualPlanAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  action: string;
};

function priorityTone(priority: VisualPlanSuggestion["priority"]) {
  if (priority === "required") return "border-(--admin-danger) text-(--admin-danger)";
  if (priority === "high") return "border-(--admin-warning) text-(--admin-warning)";
  return "border-(--border) text-(--muted)";
}

function kindLabel(kind: VisualPlanSuggestion["kind"]) {
  if (kind === "hero") return "Capa";
  if (kind === "og") return "OG";
  return "Corpo";
}

function visualRoleLabel(suggestion: VisualPlanSuggestion) {
  if (suggestion.visualRole === "cover_thumbnail") return "Capa / Thumbnail";
  if (suggestion.visualRole === "body_context") return "Imagem de respiro";
  if (suggestion.visualRole === "table_visual") return "Tabela visual 5:4";
  if (suggestion.visualRole === "og") return "Imagem OG";
  return kindLabel(suggestion.kind);
}

function groupLabel(role: VisualPlanSuggestion["visualRole"]) {
  if (role === "cover_thumbnail") return "Capa";
  if (role === "body_context") return "Imagens de respiro";
  if (role === "table_visual") return "Tabela visual";
  return "Outros";
}

function statusLabel(status: VisualPlanStatus) {
  if (status === "prompt_ready") return "prompt pronto";
  if (status === "generated") return "gerada";
  if (status === "uploaded") return "upload";
  if (status === "inserted") return "inserida";
  return "aprovada";
}

function alertTone(severity: VisualPlanAlert["severity"]) {
  if (severity === "critical") return "border-(--admin-danger) text-(--admin-danger)";
  if (severity === "warning") return "border-(--admin-warning) text-(--admin-warning)";
  return "border-(--border) text-(--muted)";
}

export function VisualPlanPanel() {
  const { editor, meta, outline, docText, docHtml, links } = useEditorContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<VisualPlanSuggestion[]>([]);
  const [diagnostics, setDiagnostics] = useState<VisualPlanDiagnostics | null>(null);
  const [alerts, setAlerts] = useState<VisualPlanAlert[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) =>
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  const runPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/visual-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: meta.slug,
          title: meta.title,
          keyword: meta.targetKeyword,
          text: docText,
          html: docHtml,
          outline,
          heroImageUrl: meta.heroImageUrl,
          heroImageAlt: meta.heroImageAlt,
          ogImageUrl: meta.ogImageUrl,
          images: meta.images,
          links,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.error || "Falha ao gerar plano visual.");
        setSuggestions([]);
        setDiagnostics(null);
        setAlerts([]);
        return;
      }
      setSuggestions(Array.isArray(json?.suggestions) ? json.suggestions : []);
      setDiagnostics((json?.diagnostics as VisualPlanDiagnostics) ?? null);
      setAlerts(Array.isArray(json?.alerts) ? json.alerts : []);
    } catch (requestError: any) {
      setError(requestError?.message || "Falha ao gerar plano visual.");
      setSuggestions([]);
      setDiagnostics(null);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setError("Nao foi possivel copiar para a area de transferencia.");
    }
  };

  const insertPlaceholder = (suggestion: VisualPlanSuggestion) => {
    if (!editor) return;
    const html = `
      <blockquote>
        <p>[PLANO VISUAL] ${suggestion.placement}</p>
        <p>${suggestion.caption}</p>
        <p>Alt: ${suggestion.altText}</p>
        <p>Arquivo sugerido: ${suggestion.suggestedFileName}</p>
        <p>Status: ${suggestion.status}</p>
      </blockquote>
    `;
    editor.chain().focus().insertContent(html).run();
  };

  const groupedSuggestions = suggestions.reduce<Array<{ label: string; items: VisualPlanSuggestion[] }>>((groups, suggestion) => {
    const label = groupLabel(suggestion.visualRole);
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.items.push(suggestion);
    } else {
      groups.push({ label, items: [suggestion] });
    }
    return groups;
  }, []);

  return (
    <section className="admin-subpane space-y-3 p-2.5">
      <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
        <span className="flex items-center gap-1.5">
          <ImagePlus size={14} />
          Agente Visual
          <span className="admin-ai-badge">V1 manual</span>
        </span>
        <span className="text-[10px] text-(--muted-2)">{suggestions.length} itens</span>
      </div>

      <button
        type="button"
        onClick={runPlan}
        disabled={loading}
        className="admin-ai-control flex w-full items-center justify-center gap-2 px-3 py-2 text-[11px] font-semibold disabled:opacity-50"
      >
        {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Analisando artigo..." : "Rodar agente visual"}
      </button>

      {error ? (
        <div className="rounded-xl border border-(--admin-danger) bg-(--surface) p-2 text-[11px] text-(--admin-danger)">
          {error}
        </div>
      ) : null}

      {diagnostics ? (
        <div className="rounded-[12px] border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted)">
          <div className="grid grid-cols-2 gap-1.5">
            <span>Capa: {diagnostics.hasHero ? "ok" : "faltando"}</span>
            <span>Alt capa: {diagnostics.hasHeroAlt ? "ok" : "faltando"}</span>
            <span>OG: {diagnostics.ogStatus === "inherits_hero" ? "herda capa" : diagnostics.ogStatus}</span>
            <span>Corpo: {diagnostics.bodyImageCount} imagem(ns)</span>
            <span>Links: {diagnostics.internalLinkCount ?? 0}</span>
            <span>Fontes: {diagnostics.supportSourceCount ?? 0}</span>
          </div>
          {alerts.length > 0 ? (
            <div className="mt-2 space-y-1">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className={`rounded border px-2 py-1 ${alertTone(alert.severity)}`}>
                  <div className="flex items-start gap-1">
                    <AlertCircle size={11} className="mt-0.5 shrink-0" />
                    <span>{alert.message}</span>
                  </div>
                  <div className="mt-0.5 pl-4 text-[9px] text-(--muted-2)">{alert.action}</div>
                </div>
              ))}
            </div>
          ) : diagnostics.warnings.length > 0 ? (
            <div className="mt-2 space-y-1">
              {diagnostics.warnings.slice(0, 4).map((warning, index) => (
                <div key={index} className="flex items-start gap-1 text-(--admin-warning)">
                  <AlertCircle size={11} className="mt-0.5 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1 text-(--admin-positive)">
              <CheckCircle2 size={11} />
              Sem pendencias visuais criticas.
            </div>
          )}
        </div>
      ) : null}

      <div className="admin-scrollbar max-h-[420px] space-y-2 overflow-y-auto">
        {!loading && suggestions.length === 0 ? (
          <div className="rounded-[12px] border border-(--border) bg-(--surface) p-3 text-[10px] text-(--muted-2)">
            Rode o agente para receber capa com foto-base + AR, imagens de respiro marcadas e tabela visual quando houver.
          </div>
        ) : null}

        {groupedSuggestions.map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-(--muted-2)">{group.label}</div>
            {group.items.map((suggestion) => {
              const isOpen = !!expandedCards[suggestion.id];
              return (
          <div key={suggestion.id} className="rounded-[12px] border border-(--border) bg-(--surface) overflow-hidden">
            {/* ── Collapsed header: always visible ── */}
            <button
              type="button"
              onClick={() => toggleCard(suggestion.id)}
              className="flex w-full items-start justify-between gap-2 p-2.5 text-left hover:bg-(--surface-muted) transition-colors"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase text-(--brand-hot)">{visualRoleLabel(suggestion)}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-(--text) truncate">{suggestion.placement}</div>
                <div className="text-[9px] text-(--muted-2)">
                  {kindLabel(suggestion.kind)} | {suggestion.visualType} | {suggestion.aspectRatio}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-[9px] uppercase ${priorityTone(suggestion.priority)}`}>
                  {suggestion.priority}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-(--muted) transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {/* ── Quick-action buttons: always visible ── */}
            <div className="flex items-center gap-1.5 px-2.5 pb-2">
              <button
                type="button"
                onClick={() => copyText(`${suggestion.id}-gpt-image`, suggestion.chatgptImagesPrompt || suggestion.customGptPrompt || suggestion.prompt)}
                className="admin-button-soft min-h-[26px] flex-1 px-2 py-0.5 text-[10px]"
              >
                <Copy size={10} />
                {copiedId === `${suggestion.id}-gpt-image` ? "Copiado" : "GPT Imagem"}
              </button>
              <button
                type="button"
                onClick={() => copyText(`${suggestion.id}-gemini`, suggestion.geminiImagePrompt || suggestion.chatgptImagesPrompt || suggestion.prompt)}
                className="admin-button-soft min-h-[26px] flex-1 px-2 py-0.5 text-[10px]"
              >
                <Copy size={10} />
                {copiedId === `${suggestion.id}-gemini` ? "Copiado" : "Gemini/Nano"}
              </button>
              <button
                type="button"
                onClick={() => insertPlaceholder(suggestion)}
                disabled={!editor || suggestion.kind !== "body"}
                className="admin-button-primary min-h-[26px] px-2 py-0.5 text-[10px] disabled:opacity-40"
              >
                Marcar
              </button>
            </div>

            {/* ── Expanded details ── */}
            {isOpen ? (
              <div className="space-y-2 border-t border-(--border) p-2.5">
                <div className="break-words text-[9px] text-(--muted-2)">{suggestion.suggestedFileName}</div>
                <span className="inline-block rounded border border-(--border) px-1.5 py-0.5 text-[9px] text-(--muted)">
                  {statusLabel(suggestion.status)}
                </span>

                <div className="rounded-[10px] border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted)">
                  <div className="text-(--text)">{suggestion.objective}</div>
                  {suggestion.visualTheme ? (
                    <div className="mt-1 text-(--brand-hot)">
                      <strong>Tema especifico:</strong> {suggestion.visualTheme}
                    </div>
                  ) : null}
                  {suggestion.strongSentence ? (
                    <div className="mt-1 line-clamp-2">
                      <strong>Trecho usado:</strong> {suggestion.strongSentence}
                    </div>
                  ) : null}
                  {suggestion.specificTerms?.length ? (
                    <div className="mt-1">
                      <strong>Dados do trecho:</strong> {suggestion.specificTerms.slice(0, 5).join(", ")}
                    </div>
                  ) : null}
                  {suggestion.dedupeReason ? (
                    <div className="mt-1 rounded-[8px] border border-(--admin-warning) bg-(--admin-warning-soft) p-2 text-(--admin-warning)">
                      <strong>Possivel repeticao visual:</strong> {suggestion.dedupeReason}
                    </div>
                  ) : null}
                  {suggestion.coverDifferentiator ? (
                    <div className="mt-1">
                      <strong>Diferencial:</strong> {suggestion.coverDifferentiator}
                    </div>
                  ) : null}
                  {suggestion.coverSourceMode === "stock_image_edit" ? (
                    <div className="mt-1 rounded-[8px] border border-(--admin-warning) bg-(--admin-warning-soft) p-2 text-(--admin-warning)">
                      <strong>Capa com foto-base:</strong> anexar a imagem de banco no gerador e preservar pessoa, roupa,
                      luz e fundo; o prompt adiciona apenas elementos AR.
                    </div>
                  ) : null}
                  {suggestion.googleInspiredVisualSystem?.length ? (
                    <div className="mt-1">
                      <strong>Visual Google inspirado:</strong> {suggestion.googleInspiredVisualSystem.slice(0, 4).join(", ")}
                    </div>
                  ) : null}
                  {suggestion.augmentedRealityDirection ? (
                    <div className="mt-1 line-clamp-2">
                      <strong>AR:</strong> {suggestion.augmentedRealityDirection}
                    </div>
                  ) : null}
                  {(suggestion.coverArtDirection || suggestion.bodyArtDirection) ? (
                    <div className="mt-1 rounded-[8px] border border-(--border) bg-(--surface) p-2">
                      <div className="font-semibold uppercase text-(--text)">Direcao de arte</div>
                      {suggestion.coverArtDirection ? (
                        <>
                          <div className="mt-1">
                            <strong>Pose/enquadramento:</strong> {suggestion.coverArtDirection.modelPose} |{" "}
                            {suggestion.coverArtDirection.cameraAngle}
                          </div>
                          <div className="mt-1">
                            <strong>Acao:</strong> {suggestion.coverArtDirection.modelAction}
                          </div>
                        </>
                      ) : null}
                      {suggestion.bodyArtDirection ? (
                        <>
                          <div className="mt-1">
                            <strong>Metafora local:</strong> {suggestion.bodyArtDirection.focalObject} |{" "}
                            {suggestion.bodyArtDirection.visualAction}
                          </div>
                          <div className="mt-1">
                            <strong>Diferenciacao visual:</strong> {suggestion.bodyArtDirection.markerVariant}
                          </div>
                          <div className="mt-1">
                            <strong>Layout:</strong> {suggestion.bodyArtDirection.layoutPattern}
                          </div>
                        </>
                      ) : null}
                      {suggestion.doNotRepeat?.length ? (
                        <div className="mt-1">
                          <strong>Nao repetir:</strong> {suggestion.doNotRepeat.slice(0, 3).join(", ")}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {suggestion.promptIntent ? (
                    <div className="mt-1">
                      <strong>Intenção:</strong> {suggestion.promptIntent}
                    </div>
                  ) : null}
                  {suggestion.cropGuidance ? (
                    <div className="mt-1 text-(--admin-warning)">
                      <strong>Recorte:</strong> {suggestion.cropGuidance}
                    </div>
                  ) : null}
                  <div className="mt-1">
                    <strong>Alt:</strong> {suggestion.altText}
                  </div>
                  <div className="mt-1">
                    <strong>Legenda:</strong> {suggestion.caption}
                  </div>
                </div>

                {(suggestion.visualRole === "body_context" || suggestion.visualRole === "table_visual") &&
                (suggestion.contextBefore || suggestion.contextAfter) ? (
                  <div className="rounded-[10px] border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted)">
                    {suggestion.markerId ? (
                      <div className="mb-1 font-semibold uppercase text-(--text)">Contexto da marcação {suggestion.markerId}</div>
                    ) : suggestion.visualRole === "table_visual" ? (
                      <div className="mb-1 font-semibold uppercase text-(--text)">Resumo da tabela</div>
                    ) : null}
                    {suggestion.contextBefore ? (
                      <div className="line-clamp-2">
                        <strong>Antes:</strong> {suggestion.contextBefore}
                      </div>
                    ) : null}
                    {suggestion.contextAfter ? (
                      <div className="mt-1 line-clamp-2">
                        <strong>Depois:</strong> {suggestion.contextAfter}
                      </div>
                    ) : null}
                    {suggestion.sourceTextUsed ? (
                      <div className="mt-1 line-clamp-2">
                        <strong>Fonte usada:</strong> {suggestion.sourceTextUsed}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {suggestion.approvalCriteria?.length ? (
                  <div className="rounded-[10px] border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted)">
                    <div className="mb-1 flex items-center gap-1 font-semibold text-(--text)">
                      <ListChecks size={11} />
                      Checklist
                    </div>
                    <ul className="space-y-1">
                      {suggestion.approvalCriteria.slice(0, 4).map((criterion, index) => (
                        <li key={index}>- {criterion}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="max-h-[180px] overflow-y-auto rounded-[10px] border border-(--border) bg-(--surface-muted) p-2 text-[10px] leading-relaxed text-(--text)">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[9px] uppercase text-(--muted-2)">
                    <span>Prompt GPT Imagem</span>
                    <span>
                      GPT {suggestion.promptLength?.chatgptImages ??
                        (suggestion.chatgptImagesPrompt || suggestion.customGptPrompt || suggestion.prompt).length}
                      {" / "}
                      Gemini {suggestion.promptLength?.geminiImage ?? (suggestion.geminiImagePrompt || "").length} chars
                    </span>
                  </div>
                  {suggestion.chatgptImagesPrompt || suggestion.customGptPrompt || suggestion.prompt}
                  {suggestion.promptWarnings?.length ? (
                    <div className="mt-2 rounded-[8px] border border-(--admin-warning) bg-(--admin-warning-soft) p-2 text-[9px] text-(--admin-warning)">
                      {suggestion.promptWarnings.slice(0, 2).join(" ")}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(`${suggestion.id}-gpt-image`, suggestion.chatgptImagesPrompt || suggestion.customGptPrompt || suggestion.prompt)}
                    className="admin-button-soft min-h-[30px] px-2 py-1 text-[10px]"
                  >
                    <Copy size={11} />
                    {copiedId === `${suggestion.id}-gpt-image` ? "Copiado" : "GPT Imagem"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(`${suggestion.id}-gemini`, suggestion.geminiImagePrompt || suggestion.chatgptImagesPrompt || suggestion.prompt)}
                    className="admin-button-soft min-h-[30px] px-2 py-1 text-[10px]"
                  >
                    <Copy size={11} />
                    {copiedId === `${suggestion.id}-gemini` ? "Copiado" : "Gemini/Nano"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(`${suggestion.id}-brief`, suggestion.technicalBrief || suggestion.chatgptImagesPrompt || suggestion.prompt)}
                    className="admin-button-soft min-h-[30px] px-2 py-1 text-[10px]"
                  >
                    <Copy size={11} />
                    {copiedId === `${suggestion.id}-brief` ? "Copiado" : "Brief completo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(`${suggestion.id}-alt`, suggestion.altText)}
                    className="admin-button-soft min-h-[30px] px-2 py-1 text-[10px]"
                  >
                    <Copy size={11} />
                    Alt
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(`${suggestion.id}-caption`, suggestion.caption)}
                    className="admin-button-soft min-h-[30px] px-2 py-1 text-[10px]"
                  >
                    <Copy size={11} />
                    Legenda
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(`${suggestion.id}-file`, suggestion.suggestedFileName)}
                    className="admin-button-soft min-h-[30px] px-2 py-1 text-[10px]"
                  >
                    <Copy size={11} />
                    Arquivo
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder(suggestion)}
                    disabled={!editor || suggestion.kind !== "body"}
                    className="admin-button-primary min-h-[30px] px-2 py-1 text-[10px] disabled:opacity-40"
                  >
                    Marcar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  ))}
</div>

      <div className="rounded-[12px] border border-(--border) bg-(--surface) p-2 text-[10px] text-(--muted-2)">
        Fluxo v1: para capa, anexe a foto-base de banco no gerador; depois copie GPT Imagem ou Gemini/Nano Banana, gere fora do admin, baixe/ajuste, suba pela biblioteca atual, insira no artigo e aprove alt/legenda. O agente nao gera, envia ou publica imagens automaticamente.
      </div>
    </section>
  );
}
