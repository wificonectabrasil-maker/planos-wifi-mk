"use client";

import { useState } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { useContentGuardian } from "@/hooks/useContentGuardian";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ShieldCheck, ShieldAlert, Sparkles, Check, X, Clipboard } from "lucide-react";

function AiCheckList({ title, items }: { title: string; items?: unknown }) {
    if (!Array.isArray(items) || !items.length) return null;
    return (
        <details className="group">
            <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--muted)">
                {title}
                <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <ul className="mt-1 list-disc pl-4 text-(--muted)">
                {items.slice(0, 4).map((item: unknown, idx: number) => (
                    <li key={idx}>{String(item)}</li>
                ))}
            </ul>
        </details>
    );
}

function anchorStatusLabel(status: string) {
    if (status === "missing") return "faltando";
    if (status === "weak_anchor") return "ancora fraca";
    if (status === "present") return "presente";
    return "revisar";
}

function zoneLabel(zone: string) {
    if (zone === "middle") return "meio";
    if (zone === "final") return "final";
    return zone;
}

export function GuardianPanel() {
    const { editor, postId, meta, setMeta, links, outline, silos, activeSuggestion, setActiveSuggestion, onApplySuggestion, onDiscardSuggestion } = useEditorContext();
    const { issues, metrics } = useContentGuardian(editor, meta, links);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<any | null>(null);
    const [aiDiagnostics, setAiDiagnostics] = useState<any | null>(null);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    const [isExpanded, setIsExpanded] = useState(false);
    const [improvingIssueId, setImprovingIssueId] = useState<string | null>(null);
    const [improvingFirstPara, setImprovingFirstPara] = useState(false);
    const [suggestionSource, setSuggestionSource] = useState<"alert" | "ai-review" | null>(null);

    const handleApplySuggestion = () => {
        if (!activeSuggestion) return;
        if (activeSuggestion.targetField === "title") {
            setMeta({ title: activeSuggestion.improvedText });
            setActiveSuggestion(null);
            setSuggestionSource(null);
        } else if (activeSuggestion.targetField === "metaDescription") {
            setMeta({ metaDescription: activeSuggestion.improvedText });
            setActiveSuggestion(null);
            setSuggestionSource(null);
        } else {
            onApplySuggestion();
            setSuggestionSource(null);
        }
    };

    const handleDiscardSuggestion = () => {
        onDiscardSuggestion();
        setSuggestionSource(null);
    };

    const handleImproveGuardianIssue = async (issueId: string) => {
        setImprovingIssueId(issueId);
        try {
            let targetText = "";
            let position = "meio do texto";
            let reason = "improve";
            const isMetaField = issueId === "title-strict" || issueId === "desc-long" || issueId === "desc-kw";

            if (isMetaField) {
                if (issueId === "title-strict") {
                    targetText = meta.title || "";
                    position = "título";
                    reason = "search";
                } else {
                    targetText = meta.metaDescription || "";
                    position = "meta descrição";
                    reason = issueId === "desc-kw" ? "search" : "improve";
                }
            } else {
                if (!editor) return;
                if (issueId === "kw-first-para" || issueId === "links-early" || issueId === "links-early-pillar") {
                    // Find first paragraph text
                    editor.state.doc.descendants((node) => {
                        if (targetText) return false;
                        if (node.type.name === "paragraph" && node.textContent.trim().length > 0) {
                            targetText = node.textContent;
                            return false;
                        }
                        return true;
                    });
                    position = "introdução";
                    reason = "search";
                } else if (issueId === "kw-first-h2") {
                    // Find first H2 heading text
                    editor.state.doc.descendants((node) => {
                        if (targetText) return false;
                        if (node.type.name === "heading" && node.attrs.level === 2 && node.textContent.trim().length > 0) {
                            targetText = node.textContent;
                            return false;
                        }
                        return true;
                    });
                    position = "primeiro H2";
                    reason = "search";
                } else if (issueId === "kw-stuffing") {
                    // Find paragraph containing densest targetKeyword repeats
                    let maxKeywordCount = 0;
                    const kw = (meta.targetKeyword || "").trim().toLowerCase();
                    if (kw) {
                        editor.state.doc.descendants((node) => {
                            if (node.type.name === "paragraph") {
                                const text = node.textContent;
                                const count = text.toLowerCase().split(kw).length - 1;
                                if (count > maxKeywordCount) {
                                    maxKeywordCount = count;
                                    targetText = text;
                                }
                            }
                            return true;
                        });
                    }
                    if (!targetText) {
                        // fallback to first paragraph
                        editor.state.doc.descendants((node) => {
                            if (targetText) return false;
                            if (node.type.name === "paragraph" && node.textContent.trim().length > 0) {
                                targetText = node.textContent;
                                return false;
                            }
                            return true;
                        });
                    }
                    position = "trecho com excesso de palavras-chave";
                    reason = "repetition";
                } else if (issueId === "img-visual-placeholder") {
                    editor.state.doc.descendants((node) => {
                        if (targetText) return false;
                        if (node.textContent.includes("[PLANO VISUAL]")) {
                            targetText = node.textContent;
                            return false;
                        }
                        return true;
                    });
                    if (!targetText) {
                        targetText = "[PLANO VISUAL]";
                    }
                    position = "marcador visual";
                    reason = "improve";
                }
            }

            if (!targetText && !isMetaField) {
                alert("Não foi possível encontrar o trecho de texto no artigo.");
                return;
            }

            let from = 1;
            let to = 1;
            if (!isMetaField && editor) {
                const { findContiguousTextPosition } = await import("@/components/editor/utils/seo");
                const coords = findContiguousTextPosition(editor, targetText);
                from = coords ? coords.from : 1;
                to = coords ? coords.to : Math.min(editor.state.doc.content.size, 100);

                // Highlight the text immediately in the editor
                editor
                    .chain()
                    .focus()
                    .setTextSelection({ from, to })
                    .scrollIntoView()
                    .run();
            }

            const response = await fetch("/api/admin/improve-fragment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: targetText,
                    title: meta.title || "",
                    keyword: meta.targetKeyword || "",
                    slug: meta.slug || "",
                    siloId: meta.siloId || "",
                    postId: postId || "",
                    position,
                    reason,
                }),
            });

            if (!response.ok) {
                throw new Error("Erro ao chamar API de reescrita");
            }

            const res = await response.json();
            if (res.ok) {
                setActiveSuggestion({
                    from: isMetaField ? 0 : from,
                    to: isMetaField ? 0 : to,
                    originalText: targetText,
                    improvedText: res.improvedText,
                    explanation: res.explanation,
                    options: res.options || [],
                    selectedOptionIndex: 0,
                    targetField: issueId === "title-strict" ? "title" : (issueId === "desc-long" || issueId === "desc-kw" ? "metaDescription" : undefined),
                } as any);
                setSuggestionSource("alert");

                // Scroll sidebar container to the Suggestion panel
                const container = document.getElementById("intelligence-scroll-container");
                if (container) {
                    setTimeout(() => {
                        const el = container.querySelector(".admin-ai-surface") || container.querySelector("#guardian-section-root");
                        if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    }, 100);
                }
            } else {
                alert(res.error || "Ocorreu um erro ao obter sugestões.");
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Erro de rede ao obter sugestões.");
        } finally {
            setImprovingIssueId(null);
        }
    };

    const handleImproveFirstParagraphFromAiReview = async (suggestedText: string) => {
        if (!editor) return;
        setImprovingFirstPara(true);
        try {
            let targetText = "";
            editor.state.doc.descendants((node) => {
                if (targetText) return false;
                if (node.type.name === "paragraph" && node.textContent.trim().length > 0) {
                    targetText = node.textContent;
                    return false;
                }
                return true;
            });

            if (!targetText) {
                alert("Não foi possível encontrar o primeiro parágrafo no artigo.");
                return;
            }

            const { findContiguousTextPosition } = await import("@/components/editor/utils/seo");
            const coords = findContiguousTextPosition(editor, targetText);
            const from = coords ? coords.from : 1;
            const to = coords ? coords.to : Math.min(editor.state.doc.content.size, 100);

            // Highlight the text immediately in the editor
            editor
                .chain()
                .focus()
                .setTextSelection({ from, to })
                .scrollIntoView()
                .run();

            // We can call improve-fragment to get exactly 3 options for the user based on the suggested text
            const response = await fetch("/api/admin/improve-fragment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: targetText,
                    title: meta.title || "",
                    keyword: meta.targetKeyword || "",
                    slug: meta.slug || "",
                    siloId: meta.siloId || "",
                    postId: postId || "",
                    position: "introdução",
                    reason: "improve",
                }),
            });

            if (!response.ok) {
                throw new Error("Erro ao chamar API de reescrita");
            }

            const res = await response.json();
            if (res.ok) {
                setActiveSuggestion({
                    from,
                    to,
                    originalText: targetText,
                    improvedText: res.improvedText,
                    explanation: res.explanation,
                    options: res.options || [],
                    selectedOptionIndex: 0,
                });
                setSuggestionSource("ai-review");

                // Scroll sidebar container to the Suggestion panel
                const container = document.getElementById("intelligence-scroll-container");
                if (container) {
                    setTimeout(() => {
                        const el = container.querySelector(".admin-ai-surface") || container.querySelector("#guardian-section-root");
                        if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    }, 100);
                }
            } else {
                alert(res.error || "Ocorreu um erro ao obter sugestões.");
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Erro de rede ao obter sugestões.");
        } finally {
            setImprovingFirstPara(false);
        }
    };

    const handleImproveMetaDescriptionFromAiReview = async (suggestedText: string) => {
        setImprovingIssueId("desc-ai-review");
        try {
            const targetText = meta.metaDescription || "";
            const response = await fetch("/api/admin/improve-fragment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: targetText,
                    title: meta.title || "",
                    keyword: meta.targetKeyword || "",
                    slug: meta.slug || "",
                    siloId: meta.siloId || "",
                    postId: postId || "",
                    position: "meta descrição",
                    reason: "improve",
                }),
            });

            if (!response.ok) {
                throw new Error("Erro ao chamar API de reescrita");
            }

            const res = await response.json();
            if (res.ok) {
                setActiveSuggestion({
                    from: 0,
                    to: 0,
                    originalText: targetText,
                    improvedText: res.improvedText,
                    explanation: res.explanation,
                    options: res.options || [],
                    selectedOptionIndex: 0,
                    targetField: "metaDescription",
                } as any);
                setSuggestionSource("ai-review");
            } else {
                alert(res.error || "Ocorreu um erro ao obter sugestões.");
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Erro de rede ao obter sugestões.");
        } finally {
            setImprovingIssueId(null);
        }
    };

    const renderSuggestionPanel = () => {
        if (!activeSuggestion) return null;
        return (
            <div className="admin-ai-surface mt-3 flex flex-col gap-2 rounded-xl p-3">
                <div className="flex items-center gap-2 text-(--admin-positive) font-semibold text-[11px] mb-1 uppercase tracking-wide">
                    <Sparkles size={14} />
                    <span>Sugestão de Melhoria (Trecho)</span>
                </div>
                
                {activeSuggestion.options && activeSuggestion.options.length > 0 ? (
                    <div className="flex flex-col gap-2 my-1">
                        {activeSuggestion.options.map((opt, idx) => {
                            const isSelected = activeSuggestion.selectedOptionIndex === idx || (activeSuggestion.selectedOptionIndex === undefined && idx === 0);
                            const optTitles = [
                                "Opção 1: Fluidez & Tom projeto",
                                "Opção 2: Resolução Anti-Plágio",
                                "Opção 3: Conexão Empática"
                            ];
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        setActiveSuggestion({
                                            ...activeSuggestion,
                                            selectedOptionIndex: idx,
                                            improvedText: opt.improvedText,
                                            explanation: opt.explanation
                                        });
                                    }}
                                    className={`text-left p-2.5 rounded-lg border text-[11px] leading-relaxed transition-all cursor-pointer ${
                                        isSelected 
                                            ? "bg-zinc-900/60 border-[color:var(--admin-positive)] shadow-[0_0_10px_rgba(32,255,180,0.15)] text-zinc-100 font-medium" 
                                            : "bg-zinc-950/20 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                >
                                    <div className="flex items-center justify-between font-bold text-[10px] mb-1 tracking-wide uppercase">
                                        <span className={isSelected ? "text-(--admin-positive)" : "text-zinc-400"}>
                                            {optTitles[idx] || `Abordagem ${idx + 1}`}
                                        </span>
                                        {isSelected && (
                                            <span className="flex items-center gap-0.5 text-(--admin-positive) font-black text-[9px]">
                                                <Check size={10} /> Ativo
                                            </span>
                                        )}
                                    </div>
                                    <div className="line-clamp-3 italic text-zinc-300 mb-1">
                                        "{opt.improvedText}"
                                    </div>
                                    <div className="text-[9.5px] text-zinc-500 line-clamp-2 leading-tight">
                                        {opt.explanation}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <>
                        <div className="text-[11px] text-(--muted) bg-(--surface) p-2 rounded border border-(--border) italic">
                            "{activeSuggestion.explanation}"
                        </div>

                        <div className="text-[12px] text-zinc-100 bg-(--surface-muted) p-3 rounded-lg border border-(--border) max-h-40 overflow-y-auto leading-relaxed">
                            {activeSuggestion.improvedText}
                        </div>
                    </>
                )}

                {activeSuggestion.options && activeSuggestion.options.length > 0 && (
                    <div className="mt-1 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800 text-[11.5px] leading-relaxed">
                        <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Visualização do trecho a aplicar</div>
                        <div className="text-zinc-200 bg-zinc-950/50 p-2 rounded border border-zinc-900 font-medium max-h-24 overflow-y-auto italic leading-normal">
                            "{activeSuggestion.improvedText}"
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1.5 flex items-start gap-1 leading-normal">
                            <span className="text-(--admin-positive) font-bold">Por quê:</span>
                            <span>{activeSuggestion.explanation}</span>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 mt-2 justify-end">
                    <button 
                        type="button"
                        onClick={handleDiscardSuggestion}
                        className="px-3 py-1.5 text-[11px] font-semibold text-(--muted) hover:text-(--text) hover:bg-(--surface-elevated) rounded-lg transition-colors"
                    >
                        Descartar
                    </button>
                    <button 
                        type="button"
                        onClick={handleApplySuggestion}
                        className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-(--admin-positive) hover:brightness-110 rounded-lg transition-all shadow-sm"
                    >
                        <Check size={14} />
                        Aplicar Melhoria
                    </button>
                </div>
            </div>
        );
    };

    const criticalIssues = issues.filter((i) => i.level === "critical");
    const warnIssues = issues.filter((i) => i.level === "warn");

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-(--admin-positive)";
        if (score >= 70) return "text-(--admin-warning)";
        return "text-(--admin-danger)";
    };

    const runAiAssist = async () => {
        if (!editor) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch("/api/admin/guardian-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: meta.title,
                    slug: meta.slug,
                    metaDescription: meta.metaDescription,
                    keyword: meta.targetKeyword,
                    siloId: meta.siloId,
                    siloSlug: silos.find((silo) => silo.id === meta.siloId)?.slug ?? "",
                    heroImageUrl: meta.heroImageUrl,
                    heroImageAlt: meta.heroImageAlt,
                    ogImageUrl: meta.ogImageUrl,
                    images: meta.images,
                    outline,
                    links: links.map((link) => ({
                        href: link.href,
                        text: link.text,
                        type: link.type,
                        dataPostId: link.dataPostId ?? null,
                    })),
                    issues: issues.map((i) => i.message),
                    text: editor.getText(),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data?.ok) {
                setAiError(data?.error || "Falha ao consultar a IA.");
                setAiResult(null);
                setAiDiagnostics(null);
            } else {
                setAiResult(data?.result ?? data);
                setAiDiagnostics(data?.diagnostics ?? null);
            }
        } catch (error: any) {
            setAiError(error?.message || "Falha ao consultar a IA.");
            setAiResult(null);
            setAiDiagnostics(null);
        } finally {
            setAiLoading(false);
        }
    };

    const copyGuardianBrief = async () => {
        const brief = String(aiResult?.gpt_rewrite_brief ?? "").trim();
        if (!brief) return;
        try {
            await navigator.clipboard.writeText(brief);
            setCopyStatus("Relatorio do Guardiao copiado para GPT.");
            window.setTimeout(() => setCopyStatus(null), 2500);
        } catch {
            setCopyStatus("Nao foi possivel copiar automaticamente.");
        }
    };

    return (
        <section className="admin-subpane space-y-3 p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {metrics.score >= 90 ? (
                        <ShieldCheck size={18} className="text-(--admin-positive)" />
                    ) : (
                        <ShieldAlert size={18} className={metrics.score >= 70 ? "text-(--admin-warning)" : "text-(--admin-danger)"} />
                    )}
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-(--muted)">
                        <span>Guardião SEO</span>
                        <span className="admin-ai-badge">IA</span>
                    </span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(metrics.score)}`}>{metrics.score}%</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-(--muted-foreground)">
                <div className="flex flex-col rounded bg-(--surface) p-2 text-center border border-(--border)">
                    <span className="font-bold text-(--text)">{metrics.wordCount}</span>
                    <span>Palavras</span>
                </div>
                <div className="flex flex-col rounded bg-(--surface) p-2 text-center border border-(--border)">
                    <span className={`font-bold ${metrics.keywordDensity > 2.5 ? "text-(--admin-danger)" : "text-(--text)"}`}>
                        {metrics.keywordDensity.toFixed(1)}%
                    </span>
                    <span>Densidade</span>
                </div>
            </div>

            {issues.length > 0 ? (
                <div className="space-y-2 pt-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex w-full items-center justify-between rounded-lg bg-(--surface-muted) px-2 py-1.5 text-[10px] font-bold uppercase text-(--muted) hover:bg-(--border)"
                    >
                        <span>{issues.length} {issues.length === 1 ? "Alerta Encontrado" : "Alertas Encontrados"}</span>
                        <span className="text-[12px]">{isExpanded ? "−" : "+"}</span>
                    </button>

                    {isExpanded && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            {issues.map((issue) => {
                                const isCritical = issue.level === "critical";
                                const canImprove = ["title-strict", "desc-long", "desc-kw", "kw-first-para", "kw-first-h2", "kw-stuffing", "img-visual-placeholder", "links-early", "links-early-pillar"].includes(issue.id);
                                
                                return (
                                    <div 
                                        key={issue.id} 
                                        className={`flex flex-col gap-2 rounded-xl border bg-(--surface) p-3 text-[11px] font-semibold text-(--text) ${
                                            isCritical ? "border-[color:var(--admin-danger)] bg-zinc-950/20" : "border-[color:var(--admin-warning)] bg-zinc-950/10"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {isCritical ? (
                                                <AlertCircle size={14} className="mt-0.5 shrink-0 text-(--admin-danger)" />
                                            ) : (
                                                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-(--admin-warning)" />
                                            )}
                                            <span>{issue.message}</span>
                                        </div>
                                        {canImprove && (
                                            <button
                                                type="button"
                                                onClick={() => handleImproveGuardianIssue(issue.id)}
                                                disabled={improvingIssueId === issue.id}
                                                className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-zinc-300 transition-colors cursor-pointer w-fit self-start disabled:opacity-50"
                                            >
                                                <Sparkles size={11} className="text-(--admin-positive)" />
                                                {improvingIssueId === issue.id ? "Gerando sugestões..." : "Sugerir Alternativas"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--admin-positive)] bg-(--surface) p-3 text-sm font-semibold text-(--admin-positive)">
                    <CheckCircle2 size={16} />
                    <span>Tudo certo com o SEO!</span>
                </div>
            )}

            {(suggestionSource === "alert" || suggestionSource === null) && renderSuggestionPanel()}

            <div className="pt-2">
                <button
                    type="button"
                    onClick={runAiAssist}
                    disabled={aiLoading}
                    className="admin-ai-control inline-flex w-full disabled:opacity-60"
                >
                    <Sparkles size={14} />
                    {aiLoading ? "Analisando com IA..." : "IA: Ajustes sugeridos"}
                </button>
                {aiError ? (
                    <div className="mt-2 rounded-xl border border-[color:var(--admin-danger)] bg-(--surface) px-3 py-2 text-[11px] text-(--admin-danger)">{aiError}</div>
                ) : null}
                {aiResult ? (
                    <div className="admin-ai-surface mt-3 space-y-1.5 rounded-2xl border border-(--border) bg-(--surface) p-3 text-[11px] text-(--text)">
                        <div className="flex items-center justify-between gap-2 rounded border border-(--border) bg-(--surface-muted) p-2">
                            <div>
                                <p className="font-semibold uppercase text-(--text)">Relatorio para GPT</p>
                                <p className="text-[10px] text-(--muted)">Use junto com o artigo e o relatorio de Duplicacao Interna.</p>
                            </div>
                            <button
                                type="button"
                                onClick={copyGuardianBrief}
                                disabled={!aiResult?.gpt_rewrite_brief}
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-(--border) bg-(--surface) px-2 py-1.5 text-[10px] font-bold text-(--text) transition-colors hover:border-[color:var(--admin-accent)] hover:text-(--admin-accent) disabled:opacity-50"
                            >
                                <Clipboard size={12} />
                                Copiar relatorio para GPT
                            </button>
                        </div>
                        {copyStatus ? (
                            <div className="rounded border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] text-(--muted)">
                                {copyStatus}
                            </div>
                        ) : null}
                        {aiDiagnostics ? (
                            <details className="rounded border border-(--border) bg-(--surface-muted) p-2 text-[10px] text-(--muted) group">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--text)">
                                    Diagnóstico LSI/PNL
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <div className="mt-1.5 space-y-0.5">
                                    <p>
                                        Cobertura LSI: <span className="font-semibold text-(--text)">{Math.round(aiDiagnostics?.coverage?.lsiCoverageScore ?? 0)}%</span>
                                    </p>
                                    <p>
                                        Estrutura PNL: <span className="font-semibold text-(--text)">{Math.round(aiDiagnostics?.structure?.coverageScore ?? 0)}%</span>
                                    </p>
                                    {Array.isArray(aiDiagnostics?.structure?.missingSections) && aiDiagnostics.structure.missingSections.length ? (
                                        <p>Faltando: {aiDiagnostics.structure.missingSections.slice(0, 4).join(", ")}</p>
                                    ) : null}
                                </div>
                            </details>
                        ) : null}
                        {aiResult.analysis ? (
                            <details open className="group">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--muted)">
                                    Resumo
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <p className="mt-1 text-(--muted)">{aiResult.analysis}</p>
                            </details>
                        ) : null}
                        {(aiResult.strategic_reframe_brief ||
                            (Array.isArray(aiResult.manifesto_checks) && aiResult.manifesto_checks.length) ||
                            (Array.isArray(aiResult.bottom_funnel_actions) && aiResult.bottom_funnel_actions.length)) ? (
                            <details open className="rounded border border-[color:var(--admin-warning)]/70 bg-(--surface-muted) p-2 group">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--text)">
                                    Estrategia fundo de funil
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                {aiResult.strategic_reframe_brief ? (
                                    <p className="mt-1.5 whitespace-pre-line text-[10.5px] leading-relaxed text-(--muted)">
                                        {String(aiResult.strategic_reframe_brief)}
                                    </p>
                                ) : null}
                                <div className="mt-2 space-y-1.5">
                                    <AiCheckList title="Manifesto" items={aiResult.manifesto_checks} />
                                    <AiCheckList title="Acoes fundo de funil" items={aiResult.bottom_funnel_actions} />
                                </div>
                            </details>
                        ) : null}
                        {Array.isArray(aiResult.quick_fixes) && aiResult.quick_fixes.length ? (
                            <details open className="group">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--muted)">
                                    Ajustes rápidos
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <ul className="mt-1 list-disc pl-4 text-(--muted)">
                                    {aiResult.quick_fixes.map((item: string, idx: number) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                        {Array.isArray(aiResult.plan_checks) && aiResult.plan_checks.length ? (
                            <details className="group">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--muted)">
                                    Plano KGR / Silos
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <ul className="mt-1 list-disc pl-4 text-(--muted)">
                                    {aiResult.plan_checks.slice(0, 4).map((item: string, idx: number) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                        <AiCheckList title="Silo e hierarquia" items={aiResult.silo_checks} />
                        <AiCheckList title="E-E-A-T / YMYL" items={aiResult.eeat_checks} />
                        <AiCheckList title="SEO local" items={aiResult.local_seo_checks} />
                        <AiCheckList title="Anticanibalizacao" items={aiResult.anti_cannibalization_checks} />
                        {Array.isArray(aiResult.internal_link_anchor_suggestions) && aiResult.internal_link_anchor_suggestions.length ? (
                            <details className="rounded border border-(--border) bg-(--surface-muted) p-2 group">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--text)">
                                    Links internos no meio/final
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <p className="mt-1 text-[10px] text-(--muted)">
                                    Preparar frases de continuidade organica. A aplicacao precisa continua nos Links Internos IA.
                                </p>
                                <div className="mt-2 space-y-2">
                                    {aiResult.internal_link_anchor_suggestions.slice(0, 5).map((item: any, idx: number) => (
                                        <div key={`${item?.targetSlug ?? idx}`} className="rounded-lg border border-(--border) bg-(--surface) p-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-semibold text-(--admin-accent)">{String(item?.targetTitle ?? "Destino interno")}</p>
                                                <span className="rounded-full border border-(--border) px-2 py-0.5 text-[9px] uppercase text-(--muted)">
                                                    {anchorStatusLabel(String(item?.status ?? ""))}
                                                </span>
                                            </div>
                                            {Array.isArray(item?.anchorTerms) && item.anchorTerms.length ? (
                                                <p className="mt-1 text-(--muted)">
                                                    <span className="font-semibold text-(--text)">Ancoras:</span>{" "}
                                                    {item.anchorTerms.slice(0, 5).join(", ")}
                                                </p>
                                            ) : null}
                                            {Array.isArray(item?.preferredZones) && item.preferredZones.length ? (
                                                <p className="mt-1 text-[10px] text-(--muted)">
                                                    Zonas preferidas: {item.preferredZones.map((zone: string) => zoneLabel(zone)).join(" / ")}
                                                </p>
                                            ) : null}
                                            {item?.insertionGuidance ? (
                                                <p className="mt-1 text-[10px] leading-relaxed text-(--muted)">
                                                    {String(item.insertionGuidance)}
                                                </p>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        ) : null}
                        {Array.isArray(aiResult.visual_actions) && aiResult.visual_actions.length ? (
                            <details className="group">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--muted)">
                                    Plano visual
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <ul className="mt-1 list-disc pl-4 text-(--muted)">
                                    {aiResult.visual_actions.slice(0, 4).map((item: string, idx: number) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                        {Array.isArray(aiResult.drive_support) && aiResult.drive_support.length ? (
                            <details className="group">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--muted)">
                                    Base Drive
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <ul className="mt-1 list-disc pl-4 text-(--muted)">
                                    {aiResult.drive_support.slice(0, 4).map((item: string, idx: number) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                        {aiResult.suggested_meta_description ? (
                            <details className="group border border-zinc-800/80 rounded-xl bg-zinc-950/10 p-2.5">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--muted) text-[10px]">
                                    Meta description sugerida
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <div className="mt-2 space-y-2">
                                    <p className="text-(--muted) italic font-medium leading-relaxed bg-zinc-900/30 p-2 rounded border border-zinc-800/60 text-[10.5px]">
                                        "{aiResult.suggested_meta_description}"
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMeta({ metaDescription: aiResult.suggested_meta_description });
                                                setCopyStatus("Meta description atualizada com sucesso!");
                                                window.setTimeout(() => setCopyStatus(null), 2500);
                                            }}
                                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-zinc-300 bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <Check size={11} className="text-(--admin-positive)" />
                                            Aplicar na Meta Description
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleImproveMetaDescriptionFromAiReview(aiResult.suggested_meta_description)}
                                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-zinc-300 bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <Sparkles size={11} className="text-(--admin-positive)" />
                                            Gerar Alternativas
                                        </button>
                                    </div>
                                </div>
                            </details>
                        ) : null}
                        {aiResult.suggested_first_paragraph ? (
                            <details className="group border border-zinc-800/80 rounded-xl bg-zinc-950/10 p-2.5">
                                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold uppercase text-(--muted) text-[10px]">
                                    Primeiro parágrafo sugerido
                                    <ChevronDown size={12} className="text-(--muted) transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <div className="mt-2 space-y-2">
                                    <p className="text-(--muted) italic font-medium leading-relaxed bg-zinc-900/30 p-2 rounded border border-zinc-800/60 text-[10.5px]">
                                        "{aiResult.suggested_first_paragraph}"
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleImproveFirstParagraphFromAiReview(aiResult.suggested_first_paragraph)}
                                        disabled={improvingFirstPara}
                                        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-zinc-300 bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <Sparkles size={11} className="text-(--admin-positive)" />
                                        {improvingFirstPara ? "Gerando sugestões..." : "Gerar Alternativas no Editor"}
                                    </button>
                                </div>
                            </details>
                        ) : null}
                        {suggestionSource === "ai-review" && renderSuggestionPanel()}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
