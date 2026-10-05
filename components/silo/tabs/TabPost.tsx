"use client";

import type { SiloPostNode, SiloMapData } from "../types";

type Props = {
    node: SiloPostNode;
    data: SiloMapData;
};

const roleLabels = {
    PILLAR: "🏛️ Pilar",
    SUPPORT: "🔧 Suporte",
    AUX: "📎 Apoio",
};

export function TabPost({ node, data }: Props) {
    const incomingLinks = data.edges.filter((e) => e.target === node.id);
    const outgoingLinks = data.edges.filter((e) => e.source === node.id);

    return (
        <div className="space-y-6">
            {/* Post Info */}
            <div>
                <h3 className="mb-2 text-lg font-bold text-(--ink)">{node.title}</h3>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                        {roleLabels[node.role]}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        Posição #{node.position}
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border-(--border) bg-(--bg) p-4 border">
                    <div className="mb-1 text-xs text-(--muted)">Links de Saída</div>
                    <div className="text-2xl font-bold text-blue-600">{node.outCount}</div>
                </div>
                <div className="rounded-lg border-(--border) bg-(--bg) p-4 border">
                    <div className="mb-1 text-xs text-(--muted)">Links de Entrada</div>
                    <div className="text-2xl font-bold text-green-600">{node.inCount}</div>
                </div>
            </div>

            {/* Outgoing Links */}
            {outgoingLinks.length > 0 && (
                <div>
                    <h4 className="mb-3 text-sm font-semibold text-(--ink)">
                        Links de Saída ({outgoingLinks.length})
                    </h4>
                    <div className="space-y-2">
                        {outgoingLinks.map((link) => {
                            const targetNode = data.nodes.find((n) => n.id === link.target);
                            const qualityColor =
                                link.quality === "STRONG"
                                    ? "text-green-600"
                                    : link.quality === "OK"
                                        ? "text-yellow-600"
                                        : link.quality === "WEAK"
                                            ? "text-red-600"
                                            : "text-gray-600";

                            return (
                                <div key={link.id} className="rounded-lg border-(--border) bg-(--bg) p-3 text-sm border">
                                    <div className="mb-1 font-medium text-(--ink)">{targetNode?.title || "Post desconhecido"}</div>
                                    <div className="mb-2 text-xs text-(--muted)">Âncora: "{link.anchorText}"</div>
                                    <div className={`text-xs font-semibold ${qualityColor}`}>
                                        {link.quality === "STRONG" && "✅ FORTE"}
                                        {link.quality === "OK" && "⚠️ OK"}
                                        {link.quality === "WEAK" && "🔴 FRACO"}
                                        {link.quality === "UNKNOWN" && "❓ Não auditado"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Incoming Links */}
            {incomingLinks.length > 0 && (
                <div>
                    <h4 className="mb-3 text-sm font-semibold text-(--ink)">
                        Links de Entrada ({incomingLinks.length})
                    </h4>
                    <div className="space-y-2">
                        {incomingLinks.map((link) => {
                            const sourceNode = data.nodes.find((n) => n.id === link.source);

                            return (
                                <div key={link.id} className="rounded-lg border-(--border) bg-(--bg) p-3 text-sm border">
                                    <div className="font-medium text-(--ink)">{sourceNode?.title || "Post desconhecido"}</div>
                                    <div className="text-xs text-(--muted)">Âncora: "{link.anchorText}"</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="border-t-(--border) pt-4 border-t">
                <a
                    href={`/admin/editor/${node.postId}`}
                    className="block w-full rounded-lg bg-(--brand-primary) px-4 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                    ✏️ Editar Post
                </a>
            </div>
        </div>
    );
}
