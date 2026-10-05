"use client";

import type { SiloLinkEdge, SiloMapData } from "../types";

type Props = {
    edge: SiloLinkEdge;
    data: SiloMapData;
};

export function TabLink({ edge, data }: Props) {
    const sourceNode = data.nodes.find((n) => n.id === edge.source);
    const targetNode = data.nodes.find((n) => n.id === edge.target);

    const qualityInfo = {
        STRONG: {
            label: "✅ FORTE",
            color: "text-green-600 bg-green-50 border-green-500",
            desc: "Link de alta qualidade, contribuindo bem para a autoridade do silo.",
        },
        OK: {
            label: "⚠️ OK",
            color: "text-yellow-600 bg-yellow-50 border-yellow-500",
            desc: "Link aceitável, mas pode ser melhorado.",
        },
        WEAK: {
            label: "🔴 FRACO",
            color: "text-red-600 bg-red-50 border-red-500",
            desc: "Link problemático que prejudica a estrutura do silo.",
        },
        UNKNOWN: {
            label: "❓ NÃO AUDITADO",
            color: "text-gray-600 bg-gray-50 border-gray-500",
            desc: "Aguardando análise. Clique em 'Auditar Silo' para avaliar.",
        },
    };

    const quality = qualityInfo[edge.quality] || qualityInfo.UNKNOWN;

    return (
        <div className="space-y-6">
            {/* Connection */}
            <div>
                <h3 className="mb-3 text-sm font-semibold text-(--ink)">Conexão</h3>
                <div className="space-y-2 text-sm">
                    <div className="rounded-lg border-(--border) bg-(--bg) p-3 border">
                        <div className="mb-1 text-xs text-(--muted)">De:</div>
                        <div className="font-medium text-(--ink)">{sourceNode?.title || "Post desconhecido"}</div>
                    </div>
                    <div className="flex justify-center">
                        <div className="text-2xl">↓</div>
                    </div>
                    <div className="rounded-lg border-(--border) bg-(--bg) p-3 border">
                        <div className="mb-1 text-xs text-(--muted)">Para:</div>
                        <div className="font-medium text-(--ink)">{targetNode?.title || "Post desconhecido"}</div>
                    </div>
                </div>
            </div>

            {/* Anchor Text */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-(--ink)">Texto Âncora</h3>
                <div className="rounded-lg border-(--border) bg-(--bg) p-4 border">
                    <p className="font-mono text-sm text-(--ink)">"{edge.anchorText}"</p>
                </div>
            </div>

            {/* Quality */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-(--ink)">Qualidade</h3>
                <div className={`rounded-lg border-l-4 p-4 ${quality.color}`}>
                    <div className="mb-2 text-sm font-bold">{quality.label}</div>
                    <p className="text-sm opacity-90">{quality.desc}</p>
                    {edge.score !== undefined && (
                        <div className="mt-3">
                            <div className="mb-1 text-xs font-semibold">Score: {edge.score}/100</div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/50">
                                <div
                                    className={`h-full transition-all ${edge.score >= 80 ? "bg-green-600" : edge.score >= 50 ? "bg-yellow-600" : "bg-red-600"
                                        }`}
                                    style={{ width: `${edge.score}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recommendations */}
            {edge.quality !== "UNKNOWN" && edge.quality !== "STRONG" && (
                <div>
                    <h3 className="mb-2 text-sm font-semibold text-(--ink)">Recomendações</h3>
                    <div className="rounded-lg border-(--border) bg-blue-50 p-4 text-sm text-blue-800 border border-blue-200">
                        <ul className="list-inside list-disc space-y-1">
                            {edge.quality === "WEAK" && (
                                <>
                                    <li>Revise o texto âncora para incluir a palavra-chave alvo</li>
                                    <li>Adicione contexto relevante ao redor do link</li>
                                    <li>Considere reposicionar no início do conteúdo</li>
                                </>
                            )}
                            {edge.quality === "OK" && (
                                <>
                                    <li>Use uma âncora mais descritiva</li>
                                    <li>Adicione mais contexto semântico</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
                <a
                    href={`/admin/editor/${sourceNode?.postId}`}
                    className="block w-full rounded-lg border-(--border) bg-(--surface) px-4 py-2 text-center text-sm font-medium text-(--ink) transition-colors hover:bg-(--surface-muted) border"
                >
                    ✏️ Editar Post de Origem
                </a>
            </div>
        </div>
    );
}
