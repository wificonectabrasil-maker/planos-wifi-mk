// Tipos para o sistema de mapa de silos

export type SiloPostRole = "PILLAR" | "SUPPORT" | "AUX";

export type SiloPostNode = {
    id: string;
    postId: string;
    title: string;
    slug?: string;
    role: SiloPostRole;
    position: number;
    inCount: number;  // Links de entrada
    outCount: number; // Links de saída
};

export type SiloLinkEdge = {
    id: string;
    source: string;
    target: string;
    anchorText: string;
    quality: "STRONG" | "OK" | "WEAK" | "UNKNOWN";
    score?: number;
};

export type SiloMapData = {
    nodes: SiloPostNode[];
    edges: SiloLinkEdge[];
};

export type SiloHealthStatus = "OK" | "WARNING" | "CRITICAL";

export type SiloHealth = {
    score: number;
    status: SiloHealthStatus;
    issues: SiloIssue[];
    summary: {
        totalPosts: number;
        pillarCount: number;
        supportCount: number;
        auxCount: number;
        totalLinks: number;
        orphanCount: number;
    };
};

export type SiloIssue = {
    severity: "CRITICAL" | "ERROR" | "WARNING";
    type: string;
    message: string;
    action?: string;
};

export type LinkQuality = {
    score: number;
    label: "STRONG" | "OK" | "WEAK";
    reasons: string[];
    suggestedAnchor?: string;
    note?: string;
};
