"use client";

import { useMemo, useState, useEffect } from "react";
import type { SiloPostSummary } from "@/components/silos/SiloIntelligenceTabs";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";
import type { LinkOccurrence, LinkAudit, SiloAudit } from "@/lib/silo/types";

type Tab = "silo" | "post" | "link";

type SiloInspectorPanelProps = {
    siloName: string;
    posts: SiloPostSummary[];
    metrics: SiloMetrics;
    linkOccurrences?: LinkOccurrence[];
    linkAudits?: LinkAudit[];
    auditsByOccurrenceId?: Record<string, LinkAudit>;
    siloAudit?: SiloAudit | null;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    selectedOccurrenceId?: string | null;
    selectedOccurrenceFallback?: LinkOccurrence | null;
    hiddenEdgeCounts?: Map<string, { outgoingHidden: number; incomingHidden: number }>;
    onClose: () => void;
    onSelectNode: (id: string | null) => void;
    onSelectOccurrence?: (occurrenceId: string | null) => void;
};

export function SiloInspectorPanel({
    siloName,
    posts,
    metrics,
    linkOccurrences,
    linkAudits,
    auditsByOccurrenceId,
    siloAudit,
    selectedNodeId,
    selectedEdgeId,
    selectedOccurrenceId,
    selectedOccurrenceFallback,
    hiddenEdgeCounts,
    onClose,
    onSelectNode,
    onSelectOccurrence,
}: SiloInspectorPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>("silo");
    const [linkFilter, setLinkFilter] = useState<"ALL" | "WEAK" | "OK">("ALL");
    const [showAllGroupLinks, setShowAllGroupLinks] = useState(false);

    useEffect(() => {
        if (selectedOccurrenceId) setActiveTab("link");
        else if (selectedEdgeId) setActiveTab("link");
        else if (selectedNodeId) setActiveTab("post");
        else setActiveTab("silo");
    }, [selectedNodeId, selectedEdgeId, selectedOccurrenceId]);

    const selectedPost = useMemo(() => {
        if (!selectedNodeId) return null;
        return posts.find((p) => p.id === selectedNodeId);
    }, [selectedNodeId, posts]);

    const relationships = useMemo(() => {
        if (!selectedNodeId || !linkOccurrences) return { inbound: [], outboundInternal: [], outboundExternal: [] };

        const inbound = linkOccurrences
            .filter((l) => l.target_post_id?.toLowerCase() === selectedNodeId?.toLowerCase())
            .map((l) => ({
                ...l,
                otherPost: posts.find((p) => p.id === l.source_post_id),
            }));

        const rawOutbound = linkOccurrences.filter((l) => l.source_post_id.toLowerCase() === selectedNodeId?.toLowerCase());
        const normalizeType = (value?: string | null) => value ? String(value).toUpperCase() : null;

        const outboundInternal = rawOutbound
            .filter(l => {
                const type = normalizeType(l.link_type);
                return !type || type === "INTERNAL";
            })
            .map(l => ({ ...l, otherPost: posts.find(p => p.id === (l.target_post_id ?? "")) }));

        const outboundExternal = rawOutbound
            .filter(l => {
                const type = normalizeType(l.link_type);
                return type === "EXTERNAL" || type === "AFFILIATE";
            });

        return { inbound, outboundInternal, outboundExternal };
    }, [selectedNodeId, linkOccurrences, posts]);

    const linkAuditMap = useMemo(() => {
        if (auditsByOccurrenceId) {
            return new Map(Object.entries(auditsByOccurrenceId));
        }
        return new Map((linkAudits || []).map((audit: any) => {
            const key = String(audit.occurrence_id ?? audit.occurrenceId ?? "");
            return [key, audit];
        }));
    }, [auditsByOccurrenceId, linkAudits]);

    const passesFilter = (occurrenceId?: string | null) => {
        if (linkFilter === "ALL") return true;
        if (!occurrenceId) return false;
        const label = linkAuditMap.get(String(occurrenceId))?.label;
        return label === linkFilter;
    };

    const filteredInbound = useMemo(() => {
        return relationships.inbound.filter((rel) => passesFilter(rel.id));
    }, [relationships.inbound, linkFilter, linkAuditMap]);

    const filteredOutboundInternal = useMemo(() => {
        return relationships.outboundInternal.filter((rel) => passesFilter(rel.id));
    }, [relationships.outboundInternal, linkFilter, linkAuditMap]);

    const selectedLinkData = useMemo(() => {
        if (!linkOccurrences) return null;
        let occId = selectedOccurrenceId ?? selectedEdgeId;
        if (!occId) return null;
        if (occId.startsWith("edge-")) occId = occId.replace("edge-", "");
        if (occId.startsWith("occ_")) occId = occId.replace("occ_", "");
        const targetId = String(occId);
        const found = linkOccurrences.find((l) => String(l.id ?? "") === targetId) || null;
        return found ?? selectedOccurrenceFallback ?? null;
    }, [selectedEdgeId, selectedOccurrenceId, linkOccurrences, selectedOccurrenceFallback]);

    const selectedLinkAudit = useMemo(() => {
        if (!selectedLinkData) return null;
        return linkAuditMap.get(String(selectedLinkData.id ?? ""));
    }, [selectedLinkData, linkAuditMap]);

    useEffect(() => {
        const occId = selectedOccurrenceId ?? selectedLinkData?.id ?? null;
        if (!occId) return;
        const key = String(occId);
        const hasAudit = linkAuditMap.has(key);
        console.log("[SILO-PANEL] select", { occurrenceId: key, hasAudit });
    }, [selectedOccurrenceId, selectedLinkData, linkAuditMap]);

    const parsedIssues = useMemo(() => {
        if (!siloAudit?.issues) return [] as any[];
        try {
            return typeof siloAudit.issues === "string" ? JSON.parse(siloAudit.issues) : siloAudit.issues;
        } catch (e) {
            return [];
        }
    }, [siloAudit]);

    const linkAuditStats = useMemo(() => {
        const counts = { STRONG: 0, OK: 0, WEAK: 0 };
        const total = linkAudits?.length ?? 0;
        linkAudits?.forEach((audit) => {
            if (audit.label === "STRONG") counts.STRONG += 1;
            else if (audit.label === "OK") counts.OK += 1;
            else if (audit.label === "WEAK") counts.WEAK += 1;
        });
        const pct = (value: number) => (total ? Math.round((value / total) * 100) : 0);
        return {
            total,
            counts,
            pct: {
                STRONG: pct(counts.STRONG),
                OK: pct(counts.OK),
                WEAK: pct(counts.WEAK),
            },
        };
    }, [linkAudits]);

    const totalLinkCount = linkOccurrences?.length ?? 0;
    const hasLinkAudits = linkAuditStats.total > 0;
    const siloSummary = useMemo(() => {
        const raw = (siloAudit as any)?.summary;
        if (!raw) return null;
        if (typeof raw === "string") {
            try {
                return JSON.parse(raw);
            } catch {
                return null;
            }
        }
        return raw;
    }, [siloAudit]);
    const supportsMissing = siloSummary?.supports_without_pillar_count ?? 0;
    const readyForPublish = hasLinkAudits && linkAuditStats.counts.WEAK === 0 && linkAuditStats.counts.OK === 0 && supportsMissing === 0;

    const hiddenCounts = useMemo(() => {
        if (!selectedPost || !hiddenEdgeCounts) return { outgoingHidden: 0, incomingHidden: 0 };
        return hiddenEdgeCounts.get(selectedPost.id) || { outgoingHidden: 0, incomingHidden: 0 };
    }, [selectedPost, hiddenEdgeCounts]);

    const selectedLinkReasons = useMemo(() => {
        if (!selectedLinkAudit?.reasons) return [];
        try {
            return typeof selectedLinkAudit.reasons === "string" ? JSON.parse(selectedLinkAudit.reasons) : selectedLinkAudit.reasons;
        } catch (e) {
            return [];
        }
    }, [selectedLinkAudit]);

    const groupOccurrences = useMemo(() => {
        if (!selectedLinkData || !linkOccurrences) return [];
        return linkOccurrences.filter(
            (occ) =>
                occ.source_post_id === selectedLinkData.source_post_id &&
                occ.target_post_id === selectedLinkData.target_post_id
        );
    }, [selectedLinkData, linkOccurrences]);

    const groupAudits = useMemo(() => {
        const items = groupOccurrences.map((occ) => {
            const audit = linkAuditMap.get(String(occ.id ?? ""));
            const score = audit?.score ?? 0;
            return { occurrence: occ, audit, score };
        });
        return items.sort((a, b) => a.score - b.score);
    }, [groupOccurrences, linkAuditMap]);

    const groupCounts = useMemo(() => {
        const counts = { STRONG: 0, OK: 0, WEAK: 0 };
        groupAudits.forEach((item) => {
            if (item.audit?.label === "STRONG") counts.STRONG += 1;
            else if (item.audit?.label === "OK") counts.OK += 1;
            else if (item.audit?.label === "WEAK") counts.WEAK += 1;
        });
        return counts;
    }, [groupAudits]);

    const renderBadge = (label: string, colorClass: string) => (
        <span className={`rounded px-1 text-[9px] uppercase font-bold text-white ${colorClass}`}>{label}</span>
    );

    const actionLabelMap: Record<string, string> = {
        KEEP: "Manter link",
        CHANGE_ANCHOR: "Trocar ancora",
        REMOVE_LINK: "Remover ou reduzir",
        CHANGE_TARGET: "Trocar destino",
        ADD_INTERNAL_LINK: "Adicionar link interno",
    };

    const openEditorForOccurrence = (occurrenceId?: string | null, options?: { autoUnlink?: boolean }) => {
        if (!occurrenceId || !linkOccurrences) return;
        const occ = linkOccurrences.find((item) => String(item.id ?? "") === String(occurrenceId ?? ""));
        if (!occ) return;
        const params = new URLSearchParams({
            highlightOccurrenceId: String(occurrenceId),
        });
        if (options?.autoUnlink) {
            params.set("autoUnlink", "1");
        } else {
            params.set("openLinkDialog", "1");
        }
        window.open(`/admin/editor/${occ.source_post_id}?${params.toString()}`, "_blank");
    };

    const removeInEditorForOccurrence = (occurrenceId?: string | null) => {
        openEditorForOccurrence(occurrenceId, { autoUnlink: true });
    };

    return (
        <aside className="absolute right-4 top-4 bottom-4 w-96 flex flex-col rounded-xl border border-(--border) bg-white shadow-2xl z-50 overflow-hidden">
            <div className="flex border-b border-(--border) bg-(--surface)">
                {["silo", "post", "link"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as Tab)}
                        disabled={tab === "post" && !selectedNodeId || tab === "link" && !selectedEdgeId && !selectedOccurrenceId}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wide ${activeTab === tab ? "border-b-2 border-black text-black" : "text-gray-400 hover:bg-gray-50"
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        {tab}
                    </button>
                ))}
                <button onClick={onClose} className="px-3 hover:bg-red-50 hover:text-red-500">✖</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50">
                {activeTab === "silo" && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900">
                                {siloName} <span className="text-xs text-gray-400 font-normal">({totalLinkCount} links)</span>
                            </h3>
                            {hasLinkAudits && siloAudit ? (
                                <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${siloAudit.health_score > 75 ? "bg-green-100 text-green-800 border-green-200" :
                                    siloAudit.health_score > 50 ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                        "bg-red-100 text-red-800 border-red-200"
                                    }`}>
                                    {`Saúde: ${siloAudit.health_score}%`}
                                </div>
                            ) : (
                                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600">
                                    Audite para ver as cores e notas
                                </div>
                            )}
                            {hasLinkAudits && (
                                <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase ${readyForPublish ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                                    {readyForPublish ? "Pronto para publicar" : "Pendencias"}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h4 className="border-b pb-1 text-xs font-bold uppercase text-gray-500">Problemas Detectados</h4>
                            {parsedIssues.length > 0 ? (
                                <ul className="space-y-2">
                                    {parsedIssues.slice(0, 5).map((issue: any, i: number) => (
                                        <li
                                            key={i}
                                            onClick={() => {
                                                if (issue.occurrenceId) {
                                                    openEditorForOccurrence(issue.occurrenceId);
                                                } else if (issue.targetPostId) {
                                                    onSelectNode(issue.targetPostId);
                                                }
                                            }}
                                            className={`flex flex-col gap-1 rounded p-2 text-xs border bg-white shadow-sm font-medium ${issue.occurrenceId || issue.targetPostId ? "cursor-pointer hover:border-blue-300" : ""} ${issue.severity === "critical" ? "border-l-4 border-l-red-500" :
                                                issue.severity === "high" ? "border-l-4 border-l-orange-500" :
                                                    "border-l-4 border-l-yellow-400"
                                                }`}
                                        >
                                            <div className="flex justify-between">
                                                <span className="text-gray-900">{issue.message}</span>
                                                <div className="flex gap-2">
                                                    {issue.occurrenceId && onSelectOccurrence && (
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onSelectOccurrence(issue.occurrenceId);
                                                            }}
                                                            className="text-[10px] uppercase text-blue-600 font-bold hover:underline"
                                                        >
                                                            Ver link
                                                        </button>
                                                    )}
                                                    {issue.targetPostId && (
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onSelectNode(issue.targetPostId!);
                                                            }}
                                                            className="text-[10px] uppercase text-blue-600 font-bold hover:underline"
                                                        >
                                                            Ver post
                                                        </button>
                                                    )}
                                                    {issue.occurrenceId && (
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                openEditorForOccurrence(issue.occurrenceId);
                                                            }}
                                                            className="text-[10px] uppercase text-amber-600 font-bold hover:underline"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                    {issue.occurrenceId && (
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                removeInEditorForOccurrence(issue.occurrenceId);
                                                            }}
                                                            className="text-[10px] uppercase text-red-600 font-bold hover:underline"
                                                        >
                                                            Remover
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {issue.action && <div className="text-[10px] text-gray-500">Recomendação: {issue.action}</div>}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400 italic">Nenhum problema crítico encontrado.</div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h4 className="border-b pb-1 text-xs font-bold uppercase text-gray-500">Distribuição de Links</h4>
                            {linkAuditStats.total > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-green-50 border border-green-100 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-green-700">{linkAuditStats.counts.STRONG}</div>
                                        <div className="text-[9px] uppercase text-green-600">Verdes</div>
                                        <div className="text-[10px] text-green-600">{linkAuditStats.pct.STRONG}%</div>
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-100 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-yellow-700">{linkAuditStats.counts.OK}</div>
                                        <div className="text-[9px] uppercase text-yellow-600">Amarelos</div>
                                        <div className="text-[10px] text-yellow-600">{linkAuditStats.pct.OK}%</div>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-red-700">{linkAuditStats.counts.WEAK}</div>
                                        <div className="text-[9px] uppercase text-red-600">Vermelhos</div>
                                        <div className="text-[10px] text-red-600">{linkAuditStats.pct.WEAK}%</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 text-center text-xs text-gray-400 italic">Audite para ver as cores e notas.</div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded border text-center">
                                <div className="text-lg font-bold">{metrics.totals.internalLinks}</div>
                                <div className="text-[9px] uppercase text-gray-400">Links Internos</div>
                            </div>
                            <div className="bg-white p-2 rounded border text-center">
                                <div className="text-lg font-bold">{metrics.totals.externalLinks}</div>
                                <div className="text-[9px] uppercase text-gray-400">Links Externos</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "post" && selectedPost && (
                    <div className="space-y-6">
                        <div className="mb-4 rounded-xl border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="inline-block rounded bg-gray-100 px-1.5 text-[9px] font-bold uppercase text-gray-500 mb-1">
                                        {selectedPost.role || "Normal"}
                                    </span>
                                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{selectedPost.title}</h3>
                                </div>
                                <a href={`/admin/editor/${selectedPost.id}`} target="_blank" className="text-blue-600 hover:text-blue-800">✎</a>
                            </div>
                            <div className="mt-3 flex gap-2 text-center text-xs">
                                <div className="flex-1 bg-green-50 rounded py-1 px-2 border border-green-100">
                                    <div className="font-bold text-green-700">{filteredInbound.length}</div>
                                    <div className="text-[8px] uppercase text-green-600">Recebidos</div>
                                    {hiddenCounts.incomingHidden > 0 && (
                                        <div className="text-[9px] text-green-600">+{hiddenCounts.incomingHidden} ocultos</div>
                                    )}
                                </div>
                                <div className="flex-1 bg-blue-50 rounded py-1 px-2 border border-blue-100">
                                    <div className="font-bold text-blue-700">{filteredOutboundInternal.length}</div>
                                    <div className="text-[8px] uppercase text-blue-600">Internos</div>
                                    {hiddenCounts.outgoingHidden > 0 && (
                                        <div className="text-[9px] text-blue-600">+{hiddenCounts.outgoingHidden} ocultos</div>
                                    )}
                                </div>
                                <div className="flex-1 bg-gray-50 rounded py-1 px-2 border border-gray-100">
                                    <div className="font-bold text-gray-700">{relationships.outboundExternal.length}</div>
                                    <div className="text-[8px] uppercase text-gray-500">Externos</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-gray-500">
                            <span>Filtro:</span>
                            <button
                                onClick={() => setLinkFilter("ALL")}
                                className={`rounded-full border px-2 py-0.5 ${linkFilter === "ALL" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setLinkFilter("WEAK")}
                                className={`rounded-full border px-2 py-0.5 ${linkFilter === "WEAK" ? "bg-red-600 text-white" : "bg-white text-gray-600"}`}
                            >
                                WEAK
                            </button>
                            <button
                                onClick={() => setLinkFilter("OK")}
                                className={`rounded-full border px-2 py-0.5 ${linkFilter === "OK" ? "bg-yellow-500 text-white" : "bg-white text-gray-600"}`}
                            >
                                OK
                            </button>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-[10px] font-bold uppercase text-gray-400 flex justify-between">
                                <span>Recebe links internos de:</span>
                            </h4>
                            {filteredInbound.length > 0 ? (
                                <ul className="space-y-1">
                                    {filteredInbound.map((rel, i) => (
                                        <li
                                            key={i}
                                            onClick={() => {
                                                if (onSelectOccurrence) onSelectOccurrence(rel.id || null);
                                                else onSelectNode(rel.source_post_id);
                                            }}
                                            className="group cursor-pointer bg-white border border-gray-100 hover:border-blue-300 rounded p-2 text-xs flex justify-between items-center transition-all"
                                        >
                                            <div className="truncate flex-1">
                                                <div className="font-medium text-gray-800 truncate">{rel.otherPost?.title}</div>
                                                <div className="text-[10px] text-gray-400 truncate max-w-[180px]">"{rel.anchor_text}"</div>
                                            </div>
                                            {linkAuditMap.get(String(rel.id ?? ""))?.label && (
                                                <span className={`text-[9px] font-semibold ${linkAuditMap.get(String(rel.id ?? ""))?.label === "WEAK" ? "text-red-600" : linkAuditMap.get(String(rel.id ?? ""))?.label === "OK" ? "text-yellow-600" : "text-green-600"}`}>
                                                    {linkAuditMap.get(String(rel.id ?? ""))?.label}
                                                </span>
                                            )}
                                            {rel.id ? (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        removeInEditorForOccurrence(rel.id);
                                                    }}
                                                    className="text-[9px] uppercase text-red-600 font-bold hover:underline"
                                                    title="Remover este link no editor"
                                                >
                                                    remover
                                                </button>
                                            ) : null}
                                            <span className="text-blue-400 group-hover:text-blue-600">→</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <div className="text-xs text-gray-400 italic">Nenhum link recebido.</div>}
                        </div>

                        <div className="space-y-2">
                            <h4 className="border-b pb-1 text-xs font-bold uppercase text-gray-500">
                                Aponta para (Interno) ({relationships.outboundInternal.length})
                            </h4>
                            {filteredOutboundInternal.length > 0 ? (
                                <ul className="space-y-1">
                                    {filteredOutboundInternal.map((rel, i) => (
                                        <li
                                            key={i}
                                            onClick={() => {
                                                if (onSelectOccurrence) onSelectOccurrence(rel.id || null);
                                                else onSelectNode(rel.target_post_id ?? null);
                                            }}
                                            className="group cursor-pointer bg-white border border-gray-100 hover:border-blue-300 rounded p-2 text-xs flex justify-between items-center transition-all"
                                        >
                                            <div className="truncate flex-1">
                                                <div className="font-medium text-gray-800 truncate">{rel.otherPost?.title}</div>
                                                <div className="flex gap-1 items-center mt-0.5">
                                                    <span className="text-[10px] text-gray-400 truncate max-w-[140px]">"{rel.anchor_text}"</span>
                                                    {rel.is_nofollow && <span className="text-[8px] bg-gray-200 px-1 rounded">NF</span>}
                                                </div>
                                            </div>
                                            {linkAuditMap.get(String(rel.id ?? ""))?.label && (
                                                <span className={`text-[9px] font-semibold ${linkAuditMap.get(String(rel.id ?? ""))?.label === "WEAK" ? "text-red-600" : linkAuditMap.get(String(rel.id ?? ""))?.label === "OK" ? "text-yellow-600" : "text-green-600"}`}>
                                                    {linkAuditMap.get(String(rel.id ?? ""))?.label}
                                                </span>
                                            )}
                                            {rel.id ? (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        removeInEditorForOccurrence(rel.id);
                                                    }}
                                                    className="text-[9px] uppercase text-red-600 font-bold hover:underline"
                                                    title="Remover este link no editor"
                                                >
                                                    remover
                                                </button>
                                            ) : null}
                                            <span className="text-blue-400 group-hover:text-blue-600">→</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <div className="text-xs text-gray-400 italic">Nenhum link interno enviado.</div>}
                        </div>

                        {relationships.outboundExternal.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase text-gray-400">
                                    Aponta para (Externo) ({relationships.outboundExternal.length}):
                                </h4>
                                <ul className="space-y-1">
                                    {relationships.outboundExternal.map((rel, i) => (
                                        <li key={i} className="bg-white border border-dashed border-gray-200 rounded p-2 text-xs flex flex-col gap-1">
                                            <a href={rel.href_normalized} target="_blank" className="font-medium text-blue-600 hover:underline truncate w-full">{rel.href_normalized}</a>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-gray-400">"{rel.anchor_text.substring(0, 25)}"</span>
                                                <div className="flex gap-1 items-center">
                                                    {rel.id ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeInEditorForOccurrence(rel.id)}
                                                            className="text-[9px] uppercase text-red-600 font-bold hover:underline"
                                                            title="Remover este link no editor"
                                                        >
                                                            remover
                                                        </button>
                                                    ) : null}
                                                    {rel.link_type === "AFFILIATE" && renderBadge("AFF", "bg-purple-400")}
                                                    {rel.is_sponsored && renderBadge("SPON", "bg-yellow-400")}
                                                    {rel.is_nofollow && renderBadge("NF", "bg-gray-400")}
                                                    {rel.is_blank && renderBadge("_BLANK", "bg-blue-300")}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "link" && selectedLinkData && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <div className="text-[10px] font-bold uppercase text-gray-400 mb-1">Texto Âncora</div>
                            <div className="text-lg font-serif italic text-gray-900 leading-snug">"{selectedLinkData.anchor_text}"</div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {selectedLinkData.link_type === "INTERNAL" && renderBadge("INTERNO", "bg-blue-500")}
                                {selectedLinkData.is_nofollow && renderBadge("NOFOLLOW", "bg-gray-500")}
                                {selectedLinkData.is_sponsored && renderBadge("SPONSORED", "bg-yellow-500")}
                                {selectedLinkData.target_post_id && (
                                    <span className="text-[10px] text-gray-500 ml-auto self-center">
                                        Target ID: ...{selectedLinkData.target_post_id.substring(0, 6)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => openEditorForOccurrence(selectedLinkData.id)}
                            className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold uppercase text-blue-700 hover:bg-blue-100"
                        >
                            Ir para o link no editor
                        </button>
                        <button
                            onClick={() => removeInEditorForOccurrence(selectedLinkData.id)}
                            className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase text-red-700 hover:bg-red-100"
                        >
                            Remover link no editor
                        </button>

                        {selectedLinkData.context_snippet && (
                            <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-1">Contexto</h4>
                                <p className="text-xs text-gray-600 italic">"...{selectedLinkData.context_snippet}..."</p>
                            </div>
                        )}

                        {groupAudits.length > 0 && (
                            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
                                <div className="font-semibold text-gray-800 mb-2">Neste par existem:</div>
                                <div className="flex gap-2 text-[11px]">
                                    <span className="text-green-600">Verdes: {groupCounts.STRONG}</span>
                                    <span className="text-yellow-600">Amarelos: {groupCounts.OK}</span>
                                    <span className="text-red-600">Vermelhos: {groupCounts.WEAK}</span>
                                </div>
                                <div className="mt-2">
                                    <button
                                        onClick={() => setShowAllGroupLinks((prev) => !prev)}
                                        className="text-[10px] uppercase font-bold text-blue-600 hover:underline"
                                    >
                                        {showAllGroupLinks ? "Ocultar lista" : "Ver todos os links desse par"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedLinkAudit ? (
                            <div className={`p-4 rounded-lg border-l-4 ${selectedLinkAudit.label === "STRONG" ? "bg-green-50 border-green-500" :
                                selectedLinkAudit.label === "OK" ? "bg-yellow-50 border-yellow-400" :
                                    "bg-red-50 border-red-500"
                                }`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-sm">Qualidade: {selectedLinkAudit.label}</span>
                                    <span className="bg-white px-2 rounded text-xs border">{selectedLinkAudit.score}/100</span>
                                </div>
                                {selectedLinkReasons.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLinkReasons.map((reason: string, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => openEditorForOccurrence(selectedLinkData.id)}
                                                className="rounded-full border bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-700 hover:border-gray-400"
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedLinkAudit.action && (
                                    <div className="mt-3 text-[11px] text-gray-700">
                                        <span className="font-semibold">Acao:</span> {actionLabelMap[selectedLinkAudit.action] ?? selectedLinkAudit.action}
                                    </div>
                                )}
                                {selectedLinkAudit.recommendation && (
                                    <div className="mt-2 text-[11px] text-gray-600">
                                        <span className="font-semibold">Recomendacao:</span> {selectedLinkAudit.recommendation}
                                    </div>
                                )}
                                {typeof selectedLinkAudit.spam_risk === "number" && (
                                    <div className="mt-2 text-[11px] text-gray-600">
                                        <span className="font-semibold">Spam Risk:</span> {selectedLinkAudit.spam_risk}/100
                                    </div>
                                )}
                                {selectedLinkAudit.suggested_anchor && (
                                    <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
                                        Sugestão de âncora: <strong>"{selectedLinkAudit.suggested_anchor}"</strong>
                                    </div>
                                )}
                                {selectedLinkAudit.note && (
                                    <div className="mt-2 text-[11px] text-gray-600">Nota: {selectedLinkAudit.note}</div>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 border border-dashed rounded text-center text-xs text-gray-400">
                                Link ainda não auditado.
                            </div>
                        )}

                        {showAllGroupLinks && groupAudits.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase text-gray-400">Todos os links (pior primeiro)</h4>
                                <ul className="space-y-1">
                                    {groupAudits.map((item, index) => (
                                        <li
                                            key={`${item.occurrence.id}-${index}`}
                                            onClick={() => onSelectOccurrence && onSelectOccurrence(item.occurrence.id || null)}
                                            className="cursor-pointer rounded border bg-white p-2 text-xs hover:border-blue-300"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-gray-800 truncate max-w-[200px]">"{item.occurrence.anchor_text}"</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-semibold ${item.audit?.label === "WEAK" ? "text-red-600" : item.audit?.label === "OK" ? "text-yellow-600" : "text-green-600"}`}>
                                                        {item.audit?.label ?? "N/A"} {typeof item.audit?.score === "number" ? `(${item.audit.score})` : ""}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            removeInEditorForOccurrence(item.occurrence.id || null);
                                                        }}
                                                        className="text-[9px] uppercase text-red-600 font-bold hover:underline"
                                                        title="Remover este link no editor"
                                                    >
                                                        remover
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
