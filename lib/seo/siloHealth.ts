import type { Post } from "@/lib/types";
import type { SiloPost, SiloHealthMetrics, SiloAction, EdgeSemanticAnalysis } from "@/lib/types/silo";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";

type BuildHealthArgs = {
    posts: Post[];
    siloPosts: SiloPost[];
    metrics: SiloMetrics;
    semanticAnalyses: EdgeSemanticAnalysis[];
};

const THRESHOLDS = {
    MAX_OUTBOUND_LINKS: 8,
    MIN_PILLAR_INBOUND: 2,
    MIN_COHERENCE_SCORE: 30,
};

export function buildSiloHealth({
    posts,
    siloPosts,
    metrics,
    semanticAnalyses,
}: BuildHealthArgs): SiloHealthMetrics {
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const siloPostMap = new Map(siloPosts.map((sp) => [sp.post_id, sp]));
    const metricsMap = new Map(metrics.perPostMetrics.map((m) => [m.postId, m]));

    const health: SiloHealthMetrics = {
        orphanPosts: [],
        excessiveOutbound: [],
        missingPillarLinks: [],
        weakSemanticLinks: [],
        offTopicPosts: [],
    };

    // 1. Orphan posts
    posts.forEach((post) => {
        const metric = metricsMap.get(post.id);
        if (metric && metric.inboundWithinSilo === 0 && metric.outboundWithinSilo === 0) {
            health.orphanPosts.push({
                postId: post.id,
                title: post.title,
                reason: "Sem links internos (entrada ou saída)",
            });
        }
    });

    // 2. Excessive outbound links
    posts.forEach((post) => {
        const metric = metricsMap.get(post.id);
        if (metric && metric.outboundWithinSilo > THRESHOLDS.MAX_OUTBOUND_LINKS) {
            health.excessiveOutbound.push({
                postId: post.id,
                title: post.title,
                outboundCount: metric.outboundWithinSilo,
                threshold: THRESHOLDS.MAX_OUTBOUND_LINKS,
            });
        }
    });

    // 3. Support posts not linking to pillar
    const pillarPost = siloPosts.find((sp) => sp.role === "PILLAR");
    if (pillarPost) {
        const pillarId = pillarPost.post_id;
        const edgesToPillar = new Set(
            metrics.adjacency.filter((edge) => edge.targetId === pillarId).map((edge) => edge.sourceId)
        );

        siloPosts.forEach((sp) => {
            if (sp.role === "SUPPORT" && !edgesToPillar.has(sp.post_id)) {
                const post = postMap.get(sp.post_id);
                if (post) {
                    health.missingPillarLinks.push({
                        postId: post.id,
                        title: post.title,
                        role: sp.role,
                    });
                }
            }
        });
    }

    // 4. Weak semantic links
    semanticAnalyses.forEach((analysis) => {
        if (analysis.quality === "WEAK") {
            health.weakSemanticLinks.push({
                sourceId: analysis.sourceId,
                targetId: analysis.targetId,
                quality: analysis.quality,
                issues: analysis.issues,
            });
        }
    });

    // 5. Off-topic posts (simplified: posts with very low keyword overlap with silo)
    // This is a placeholder - you'd calculate based on silo theme vs post content
    // For now, we'll skip this or use a simple heuristic

    return health;
}

export function generateSiloActions(health: SiloHealthMetrics, siloPosts: SiloPost[]): SiloAction[] {
    const actions: SiloAction[] = [];
    const pillarPost = siloPosts.find((sp) => sp.role === "PILLAR");

    // 1. Fix orphan posts
    health.orphanPosts.forEach((orphan) => {
        actions.push({
            type: "ADD_LINK",
            priority: "HIGH",
            postId: orphan.postId,
            targetPostId: pillarPost?.post_id,
            description: `Post órfão: adicionar link para o pilar ou outros posts de suporte`,
            currentIssue: orphan.reason,
        });
    });

    // 2. Reduce excessive outbound
    health.excessiveOutbound.forEach((excess) => {
        actions.push({
            type: "REMOVE_LINK",
            priority: "MEDIUM",
            postId: excess.postId,
            description: `Reduzir de ${excess.outboundCount} para ~${THRESHOLDS.MAX_OUTBOUND_LINKS} links internos`,
            currentIssue: `Excesso de links internos (${excess.outboundCount} > ${excess.threshold})`,
        });
    });

    // 3. Add missing pillar links
    health.missingPillarLinks.forEach((missing) => {
        actions.push({
            type: "ADD_LINK",
            priority: "HIGH",
            postId: missing.postId,
            targetPostId: pillarPost?.post_id,
            description: `Adicionar 1-2 links para o post pilar`,
            suggestedAnchor: pillarPost ? "Veja o guia completo" : undefined,
            currentIssue: "Post de suporte não reforça o pilar",
        });
    });

    // 4. Fix weak semantic links
    health.weakSemanticLinks.forEach((weak) => {
        const issue = weak.issues[0] || "Link com baixa qualidade semântica";
        actions.push({
            type: "CHANGE_ANCHOR",
            priority: "MEDIUM",
            postId: weak.sourceId,
            targetPostId: weak.targetId,
            description: `Melhorar âncora do link`,
            currentIssue: issue,
        });
    });

    return actions.sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}
