"use client";

import type { SiloHealth, SiloMapData } from "../types";

type Props = {
    health: SiloHealth | null;
    data: SiloMapData;
};

export function TabSilo({ health, data }: Props) {
    if (!health) {
        return (
            <div className="rounded-lg border-(--border) bg-(--surface-muted) p-6 text-center border">
                <p className="mb-4 text-sm text-(--muted)">
                    Nenhuma auditoria realizada ainda.
                </p>
                <p className="text-xs text-(--muted-2)">
                    Clique em <strong>"Auditar Silo"</strong> para gerar análise completa.
                </p>
            </div>
        );
    }

    const statusColors = {
        OK: "text-green-600 bg-green-50",
        WARNING: "text-yellow-600 bg-yellow-50",
        CRITICAL: "text-red-600 bg-red-50",
    };

    const statusEmoji = {
        OK: "✅",
        WARNING: "⚠️",
        CRITICAL: "🔴",
    };

    return (
        <div className="space-y-6">
            {/* Health Score */}
            <div>
                <h3 className="mb-3 text-sm font-semibold text-(--ink)">Saúde do Silo</h3>
                <div className="rounded-lg border-(--border) bg-(--bg) p-4 border">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-2xl font-bold text-(--ink)">{health.score}%</span>
                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColors[health.status]}`}>
                            {statusEmoji[health.status]} {health.status}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                            className={`h-full transition-all ${health.score >= 80 ? "bg-green-500" : health.score >= 50 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                            style={{ width: `${health.score}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div>
                <h3 className="mb-3 text-sm font-semibold text-(--ink)">Resumo</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border-(--border) bg-(--bg) p-3 border">
                        <div className="text-xs text-(--muted)">Posts</div>
                        <div className="text-lg font-bold text-(--ink)">{health.summary.totalPosts}</div>
                    </div>
                    <div className="rounded-lg border-(--border) bg-(--bg) p-3 border">
                        <div className="text-xs text-(--muted)">Links</div>
                        <div className="text-lg font-bold text-(--ink)">{health.summary.totalLinks}</div>
                    </div>
                    <div className="rounded-lg border-(--border) bg-(--bg) p-3 border">
                        <div className="text-xs text-(--muted)">🏛️ Pilares</div>
                        <div className="text-lg font-bold text-purple-600">{health.summary.pillarCount}</div>
                    </div>
                    <div className="rounded-lg border-(--border) bg-(--bg) p-3 border">
                        <div className="text-xs text-(--muted)">🔧 Suportes</div>
                        <div className="text-lg font-bold text-blue-600">{health.summary.supportCount}</div>
                    </div>
                </div>
            </div>

            {/* Issues */}
            {health.issues.length > 0 && (
                <div>
                    <h3 className="mb-3 text-sm font-semibold text-(--ink)">Problemas ({health.issues.length})</h3>
                    <div className="space-y-2">
                        {health.issues.slice(0, 5).map((issue, i) => {
                            const severityColors = {
                                CRITICAL: "border-red-500 bg-red-50 text-red-700",
                                ERROR: "border-orange-500 bg-orange-50 text-orange-700",
                                WARNING: "border-yellow-500 bg-yellow-50 text-yellow-700",
                            };

                            return (
                                <div key={i} className={`rounded-lg border-l-4 p-3 text-sm ${severityColors[issue.severity]}`}>
                                    <div className="font-semibold">{issue.message}</div>
                                    {issue.action && <div className="mt-1 text-xs opacity-75">{issue.action}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
