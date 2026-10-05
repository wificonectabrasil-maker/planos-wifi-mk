"use client";

import { useState } from "react";
import { TabSilo } from "./tabs/TabSilo";
import { TabPost } from "./tabs/TabPost";
import { TabLink } from "./tabs/TabLink";
import type { SiloMapData, SiloHealth } from "./types";

type Tab = "silo" | "post" | "link";

type Props = {
    siloId: string;
    health: SiloHealth | null;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    data: SiloMapData;
};

export function SiloMapSidebar({ siloId, health, selectedNodeId, selectedEdgeId, data }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>("silo");

    // Auto-switch tabs based on selection
    const effectiveTab = selectedNodeId ? "post" : selectedEdgeId ? "link" : activeTab;

    const selectedNode = data.nodes.find((n) => n.id === selectedNodeId);
    const selectedEdge = data.edges.find((e) => e.id === selectedEdgeId);

    return (
        <div className="flex h-full flex-col">
            {/* Tabs */}
            <div className="flex border-b-(--border) border-b bg-(--surface)">
                <button
                    onClick={() => setActiveTab("silo")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${effectiveTab === "silo"
                            ? "border-b-2 border-b-(--brand-accent) bg-(--bg) text-(--brand-accent)"
                            : "text-(--muted) hover:text-(--ink)"
                        }`}
                >
                    📊 Silo
                </button>
                <button
                    onClick={() => setActiveTab("post")}
                    disabled={!selectedNodeId}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${effectiveTab === "post"
                            ? "border-b-2 border-b-(--brand-accent) bg-(--bg) text-(--brand-accent)"
                            : "text-(--muted) hover:text-(--ink)"
                        }`}
                >
                    📝 Post
                </button>
                <button
                    onClick={() => setActiveTab("link")}
                    disabled={!selectedEdgeId}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${effectiveTab === "link"
                            ? "border-b-2 border-b-(--brand-accent) bg-(--bg) text-(--brand-accent)"
                            : "text-(--muted) hover:text-(--ink)"
                        }`}
                >
                    🔗 Link
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {effectiveTab === "silo" && <TabSilo health={health} data={data} />}
                {effectiveTab === "post" && selectedNode && <TabPost node={selectedNode} data={data} />}
                {effectiveTab === "link" && selectedEdge && <TabLink edge={selectedEdge} data={data} />}
            </div>
        </div>
    );
}
