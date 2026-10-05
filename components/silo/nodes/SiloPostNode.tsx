"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { SiloPostNode as SiloPostNodeData } from "../types";

type Props = {
    data: SiloPostNodeData & { isSelected?: boolean };
};

const roleLabels = {
    PILLAR: "🏛️ Pilar",
    SUPPORT: "🔧 Suporte",
    AUX: "📎 Apoio",
};

const roleColors = {
    PILLAR: "bg-purple-500/10 border-purple-500 text-purple-700",
    SUPPORT: "bg-blue-500/10 border-blue-500 text-blue-700",
    AUX: "bg-gray-500/10 border-gray-500 text-gray-700",
};

export const SiloPostNode = memo(function SiloPostNode({ data }: Props) {
    const roleColor = roleColors[data.role];
    const isSelected = data.isSelected;

    return (
        <div
            className={`min-w-[260px] rounded-lg border-2 bg-(--surface-muted) shadow-lg transition-all ${isSelected ? "ring-4 ring-[rgba(64,209,219,0.35)] shadow-2xl" : "hover:shadow-xl"
                } ${roleColor}`}
        >
            <Handle type="target" position={Position.Top} className="!bg-blue-500" />

            <div className="p-3">
                {/* Role Badge */}
                <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-(--surface) px-2 py-1 font-sans text-[10px] font-semibold uppercase text-(--text)">
                        {roleLabels[data.role]}
                    </span>
                    <span className="font-mono text-[10px] text-(--muted)">#{data.position}</span>
                </div>

                {/* Title */}
                <h3 className="mb-2 line-clamp-2 font-sans text-[13px] font-semibold leading-snug text-(--text-strong)" title={data.title}>
                    {data.title}
                </h3>
                {data.slug ? (
                    <div className="mb-2 break-all rounded border border-[rgba(64,209,219,0.2)] bg-(--surface) px-2 py-1 font-mono text-[10.5px] leading-snug text-[#aeeff4]">
                        /{data.slug}
                    </div>
                ) : null}

                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px] text-(--muted)">
                    <span title="Links de saída">
                        →&nbsp;<strong>{data.outCount}</strong>
                    </span>
                    <span title="Links de entrada">
                        ←&nbsp;<strong>{data.inCount}</strong>
                    </span>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
        </div>
    );
});
