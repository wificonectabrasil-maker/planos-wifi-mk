export type SiloPostRole = "PILLAR" | "SUPPORT" | "AUX";

export type SiloPost = {
    id: string;
    silo_id: string;
    post_id: string;
    role: SiloPostRole;
    position: number;
    level: number;
    parent_post_id: string | null;
    created_at: string;
    updated_at: string;
};

export type LinkSemanticQuality = "STRONG" | "MEDIUM" | "WEAK";

export type EdgeSemanticAnalysis = {
    sourceId: string;
    targetId: string;
    count: number;
    quality: LinkSemanticQuality;
    score: number; // 0-100
    anchors: Array<{
        text: string;
        count: number;
        position: "inicio" | "meio" | "fim";
    }>;
    issues: string[]; // e.g., "Âncora genérica", "Baixo alinhamento"
    suggestions: string[]; // e.g., "Use âncora descritiva com termo X"
};

export type SiloHealthMetrics = {
    orphanPosts: Array<{
        postId: string;
        title: string;
        reason: string;
    }>;
    excessiveOutbound: Array<{
        postId: string;
        title: string;
        outboundCount: number;
        threshold: number;
    }>;
    missingPillarLinks: Array<{
        postId: string;
        title: string;
        role: SiloPostRole;
    }>;
    weakSemanticLinks: Array<{
        sourceId: string;
        targetId: string;
        quality: LinkSemanticQuality;
        issues: string[];
    }>;
    offTopicPosts: Array<{
        postId: string;
        title: string;
        coherenceScore: number;
    }>;
};

export type SiloAction = {
    type: "ADD_LINK" | "REMOVE_LINK" | "CHANGE_ANCHOR" | "REORDER" | "CHANGE_ROLE";
    priority: "HIGH" | "MEDIUM" | "LOW";
    postId: string;
    targetPostId?: string;
    description: string;
    suggestedAnchor?: string;
    currentIssue: string;
};
