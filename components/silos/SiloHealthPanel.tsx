"use client";

import type { SiloHealthMetrics, SiloAction } from "@/lib/types/silo";
import { AlertCircle, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

type SiloHealthPanelProps = {
    health: SiloHealthMetrics;
    actions: SiloAction[];
    postTitles: Map<string, string>;
};

export function SiloHealthPanel({ health, actions, postTitles }: SiloHealthPanelProps) {
    const totalIssues =
        health.orphanPosts.length +
        health.excessiveOutbound.length +
        health.missingPillarLinks.length +
        health.weakSemanticLinks.length +
        health.offTopicPosts.length;

    const healthScore = Math.max(0, 100 - totalIssues * 5);

    return (
        <div className="space-y-6">
            {/* Health Score */}
            <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-(--muted-2)">
                        Saúde do Silo
                    </h3>
                    <div className="flex items-center gap-2">
                        {healthScore >= 80 ? (
                            <CheckCircle size={20} className="text-(--admin-positive)" />
                        ) : healthScore >= 50 ? (
                            <AlertTriangle size={20} className="text-(--admin-warning)" />
                        ) : (
                            <AlertCircle size={20} className="text-(--admin-danger)" />
                        )}
                        <span
                            className="text-2xl font-bold"
                            style={{
                                color:
                                    healthScore >= 80
                                        ? "#33e8b1"
                                        : healthScore >= 50
                                            ? "#a79d4d"
                                            : "#f9494c",
                            }}
                        >
                            {healthScore}
                        </span>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <MetricCard
                        label="Posts órfãos"
                        value={health.orphanPosts.length}
                        color={health.orphanPosts.length > 0 ? "red" : "green"}
                    />
                    <MetricCard
                        label="Links excessivos"
                        value={health.excessiveOutbound.length}
                        color={health.excessiveOutbound.length > 0 ? "yellow" : "green"}
                    />
                    <MetricCard
                        label="Links fracos"
                        value={health.weakSemanticLinks.length}
                        color={health.weakSemanticLinks.length > 5 ? "yellow" : "green"}
                    />
                </div>
            </div>

            {/* Issues Breakdown */}
            {totalIssues > 0 && (
                <div className="space-y-4">
                    {health.orphanPosts.length > 0 && (
                        <IssueSection
                            title="Posts Órfãos"
                            icon={<AlertCircle size={16} className="text-(--admin-danger)" />}
                            items={health.orphanPosts.map((orphan) => ({
                                id: orphan.postId,
                                title: postTitles.get(orphan.postId) || "Post sem título",
                                description: orphan.reason,
                            }))}
                        />
                    )}

                    {health.missingPillarLinks.length > 0 && (
                        <IssueSection
                            title="Suportes Sem Link para o Pilar"
                            icon={<AlertTriangle size={16} className="text-(--admin-warning)" />}
                            items={health.missingPillarLinks.map((missing) => ({
                                id: missing.postId,
                                title: postTitles.get(missing.postId) || "Post sem título",
                                description: `Post de ${missing.role} não reforça o pilar`,
                            }))}
                        />
                    )}

                    {health.excessiveOutbound.length > 0 && (
                        <IssueSection
                            title="Excesso de Links Internos"
                            icon={<TrendingUp size={16} className="text-(--admin-warning)" />}
                            items={health.excessiveOutbound.map((excess) => ({
                                id: excess.postId,
                                title: postTitles.get(excess.postId) || "Post sem título",
                                description: `${excess.outboundCount} links (limite recomendado: ${excess.threshold})`,
                            }))}
                        />
                    )}

                    {health.weakSemanticLinks.length > 0 && (
                        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-(--admin-warning)" />
                                <h4 className="text-sm font-semibold text-(--text)">
                                    Links com Semântica Fraca ({health.weakSemanticLinks.length})
                                </h4>
                            </div>
                            <div className="space-y-2 text-xs text-(--muted)">
                                {health.weakSemanticLinks.slice(0, 5).map((weak, idx) => (
                                    <div key={idx} className="rounded bg-(--surface-muted) p-2">
                                        <div className="font-medium text-(--text)">
                                            {postTitles.get(weak.sourceId)} → {postTitles.get(weak.targetId)}
                                        </div>
                                        <div className="mt-1">{weak.issues.join(", ")}</div>
                                    </div>
                                ))}
                                {health.weakSemanticLinks.length > 5 && (
                                    <div className="pt-2 text-center">
                                        +{health.weakSemanticLinks.length - 5} links fracos
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recommended Actions */}
            {actions.length > 0 && (
                <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-(--muted-2)">
                        Ações Recomendadas ({actions.length})
                    </h3>
                    <div className="space-y-3">
                        {actions.slice(0, 10).map((action, idx) => (
                            <ActionCard key={idx} action={action} postTitles={postTitles} />
                        ))}
                        {actions.length > 10 && (
                            <div className="pt-2 text-center text-xs text-(--muted)">
                                +{actions.length - 10} ações adicionais
                            </div>
                        )}
                    </div>
                </div>
            )}

            {totalIssues === 0 && (
                <div className="rounded-xl border border-[color:var(--admin-positive)] bg-(--surface) p-6 text-center">
                    <CheckCircle size={40} className="mx-auto mb-3 text-(--admin-positive)" />
                    <h3 className="text-lg font-semibold text-(--admin-positive)">Silo em Excelente Estado!</h3>
                    <p className="mt-2 text-sm text-(--muted)">
                        Não foram encontrados problemas estruturais ou semânticos.
                    </p>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: "green" | "yellow" | "red" }) {
    const colorMap = {
        green: "bg-(--surface-muted) text-(--admin-positive) border-[color:var(--admin-positive)]",
        yellow: "bg-(--surface-muted) text-(--admin-warning) border-[color:var(--admin-warning)]",
        red: "bg-(--surface-muted) text-(--admin-danger) border-[color:var(--admin-danger)]",
    };

    return (
        <div className={`rounded-lg border p-3 ${colorMap[color] || colorMap.green}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
        </div>
    );
}

function IssueSection({
    title,
    icon,
    items,
}: {
    title: string;
    icon: React.ReactNode;
    items: Array<{ id: string; title: string; description: string }>;
}) {
    return (
        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
            <div className="mb-3 flex items-center gap-2">
                {icon}
                <h4 className="text-sm font-semibold text-(--text)">
                    {title} ({items.length})
                </h4>
            </div>
            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-lg border border-(--border) bg-(--surface-muted) p-3"
                    >
                        <div className="text-sm font-medium text-(--text)">{item.title}</div>
                        <div className="mt-1 text-xs text-(--muted)">{item.description}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ActionCard({
    action,
    postTitles,
}: {
    action: SiloAction;
    postTitles: Map<string, string>;
}) {
    const priorityColors = {
        HIGH: "border-l-4 border-l-[color:var(--admin-danger)] bg-(--surface-muted)",
        MEDIUM: "border-l-4 border-l-[color:var(--admin-warning)] bg-(--surface-muted)",
        LOW: "border-l-4 border-l-[color:var(--brand-primary)] bg-(--surface-muted)",
    };

    const typeLabels = {
        ADD_LINK: "➕ Adicionar Link",
        REMOVE_LINK: "➖ Remover Link",
        CHANGE_ANCHOR: "✏️ Alterar Âncora",
        REORDER: "🔄 Reordenar",
        CHANGE_ROLE: "🎯 Alterar Papel",
    };

    return (
        <div className={`rounded-lg p-3 ${priorityColors[action.priority]}`}>
            <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                    {typeLabels[action.type]}
                </span>
                <span className="rounded bg-(--surface) px-2 py-0.5 text-[10px] font-semibold uppercase">
                    {action.priority}
                </span>
            </div>
            <div className="text-sm font-medium text-(--text)">
                {postTitles.get(action.postId)}
            </div>
            <div className="mt-1 text-xs text-(--muted)">{action.description}</div>
            {action.suggestedAnchor && (
                <div className="mt-2 rounded bg-(--surface) px-2 py-1 text-xs">
                    <span className="font-semibold">Âncora sugerida:</span> &quot;{action.suggestedAnchor}&quot;
                </div>
            )}
            <div className="mt-2 text-xs italic opacity-70">Problema: {action.currentIssue}</div>
        </div>
    );
}


