"use client";

import { useState } from "react";
import { SiloMapCanvas } from "@/components/silo/SiloMapCanvas";
import { SiloMapSidebar } from "@/components/silo/SiloMapSidebar";
import { SiloMapToolbar } from "@/components/silo/SiloMapToolbar";
import type { SiloMapData, SiloHealth } from "@/components/silo/types";

type Props = {
    siloId: string;
    siloName: string;
    initialData: SiloMapData;
    initialHealth?: SiloHealth | null;
};

export function SiloMapPage({ siloId, siloName, initialData, initialHealth }: Props) {
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [health, setHealth] = useState<SiloHealth | null>(initialHealth || null);
    const [isAuditing, setIsAuditing] = useState(false);

    const handleAudit = async () => {
        setIsAuditing(true);
        try {
            const response = await fetch(`/api/silos/${siloId}/audit`, {
                method: "POST",
            });

            if (response.ok) {
                const data = await response.json();
                setHealth(data.health);
                // Recarregar dados do mapa para atualizar cores
                window.location.reload();
            }
        } catch (error) {
            console.error("Erro ao auditar silo:", error);
        } finally {
            setIsAuditing(false);
        }
    };

    const handleClearSelection = () => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    };

    return (
        <div className="flex h-screen flex-col bg-(--bg)">
            {/* Header */}
            <div className="border-b-(--border) flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-2xl font-bold text-(--ink)">{siloName}</h1>
                    <p className="text-sm text-(--muted)">Mapa de Links e Hierarquia</p>
                </div>

                <SiloMapToolbar
                    onAudit={handleAudit}
                    onClearSelection={handleClearSelection}
                    isAuditing={isAuditing}
                    hasSelection={!!selectedNodeId || !!selectedEdgeId}
                />
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Map Canvas */}
                <div className="flex-1">
                    <SiloMapCanvas
                        data={initialData}
                        selectedNodeId={selectedNodeId}
                        selectedEdgeId={selectedEdgeId}
                        onNodeClick={setSelectedNodeId}
                        onEdgeClick={setSelectedEdgeId}
                    />
                </div>

                {/* Sidebar */}
                <div className="w-96 border-l-(--border) border-l bg-(--surface)">
                    <SiloMapSidebar
                        siloId={siloId}
                        health={health}
                        selectedNodeId={selectedNodeId}
                        selectedEdgeId={selectedEdgeId}
                        data={initialData}
                    />
                </div>
            </div>
        </div>
    );
}
