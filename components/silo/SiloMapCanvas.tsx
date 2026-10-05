"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
    Background,
    Controls,
    Node,
    Edge,
    ConnectionLineType,
    MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import { SiloPostNode as SiloPostNodeComponent } from "./nodes/SiloPostNode";
import type { SiloMapData } from "./types";

const nodeTypes = {
    siloPost: SiloPostNodeComponent,
};

type Props = {
    data: SiloMapData;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    onNodeClick: (nodeId: string) => void;
    onEdgeClick: (edgeId: string) => void;
};

export function SiloMapCanvas({ data, selectedNodeId, selectedEdgeId, onNodeClick, onEdgeClick }: Props) {
    // Convert data to React Flow format with PYRAMID layout
    const nodes: Node[] = useMemo(() => {
        // Separar por role
        const pillars = data.nodes.filter((n) => n.role === "PILLAR");
        const supports = data.nodes.filter((n) => n.role === "SUPPORT");
        const aux = data.nodes.filter((n) => n.role === "AUX");

        const result: Node[] = [];

        // PILAR no topo (centralizado)
        pillars.forEach((node, index) => {
            result.push({
                id: node.id,
                type: "siloPost",
                position: {
                    x: 400 + (index * 300), // Centralizado
                    y: 50
                },
                data: {
                    ...node,
                    isSelected: selectedNodeId === node.id,
                },
            });
        });

        // SUPORTES no meio (espalhados horizontalmente)
        supports.forEach((node, index) => {
            const spacing = 350;
            const totalWidth = (supports.length - 1) * spacing;
            const startX = 400 - (totalWidth / 2); // Centralizar suportes

            result.push({
                id: node.id,
                type: "siloPost",
                position: {
                    x: startX + (index * spacing),
                    y: 280
                },
                data: {
                    ...node,
                    isSelected: selectedNodeId === node.id,
                },
            });
        });

        // APOIOS embaixo (espalhados horizontalmente)
        aux.forEach((node, index) => {
            const spacing = 300;
            const totalWidth = (aux.length - 1) * spacing;
            const startX = 400 - (totalWidth / 2);

            result.push({
                id: node.id,
                type: "siloPost",
                position: {
                    x: startX + (index * spacing),
                    y: 510
                },
                data: {
                    ...node,
                    isSelected: selectedNodeId === node.id,
                },
            });
        });

        return result;
    }, [data.nodes, selectedNodeId]);

    const edges: Edge[] = useMemo(() => {
        return data.edges.map((edge) => {
            const quality = edge.quality || "UNKNOWN";
            const color =
                quality === "STRONG"
                    ? "#10b981" // green
                    : quality === "OK"
                        ? "#f59e0b" // yellow
                        : quality === "WEAK"
                            ? "#ef4444" // red
                            : "#9ca3af"; // gray

            const isSelected = selectedEdgeId === edge.id;
            const isFaded = (selectedNodeId || selectedEdgeId) && !isSelected;

            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: "default",
                animated: isSelected,
                style: {
                    stroke: color,
                    strokeWidth: isSelected ? 3 : 2,
                    opacity: isFaded ? 0.15 : 1,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color,
                    width: 20,
                    height: 20,
                },
                label: isSelected ? edge.anchorText : undefined,
                labelStyle: isSelected ? { fill: color, fontWeight: 600, fontSize: 12 } : undefined,
            };
        });
    }, [data.edges, selectedNodeId, selectedEdgeId]);

    const onNodeClickHandler = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            onNodeClick(node.id);
        },
        [onNodeClick]
    );

    const onEdgeClickHandler = useCallback(
        (_event: React.MouseEvent, edge: Edge) => {
            onEdgeClick(edge.id);
        },
        [onEdgeClick]
    );

    return (
        <div className="h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClickHandler}
                onEdgeClick={onEdgeClickHandler}
                fitView
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                    type: "smoothstep",
                    animated: false,
                }}
                proOptions={{ hideAttribution: true }}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}
