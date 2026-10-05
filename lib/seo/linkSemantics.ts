import type { Post } from "@/lib/types";
import type { EdgeSemanticAnalysis, LinkSemanticQuality } from "@/lib/types/silo";
import type { SiloLinkEdge } from "@/lib/seo/buildSiloMetrics";

const GENERIC_ANCHORS = [
    "clique aqui",
    "saiba mais",
    "leia mais",
    "veja mais",
    "confira",
    "acesse",
    "novo post",
    "artigo",
    "post",
    "here",
    "read more",
    "click here",
];

/**
 * Extract significant terms from a text (simple LSI-like approach)
 */
function extractKeyTerms(text: string, topN = 10): Map<string, number> {
    const stopwords = new Set([
        "o", "a", "os", "as", "um", "uma", "de", "da", "do", "em", "para", "com",
        "por", "e", "ou", "que", "se", "é", "são", "como", "mais", "na", "no",
        "the", "a", "an", "and", "or", "of", "in", "to", "for", "is", "are",
    ]);

    const words = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopwords.has(w));

    const freq = new Map<string, number>();
    words.forEach((word) => {
        freq.set(word, (freq.get(word) || 0) + 1);
    });

    // Return top N terms
    return new Map(
        Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
    );
}

/**
 * Calculate semantic overlap between two term maps
 */
function calculateOverlap(terms1: Map<string, number>, terms2: Map<string, number>): number {
    const keys1 = new Set(terms1.keys());
    const keys2 = new Set(terms2.keys());
    const intersection = new Set([...keys1].filter((x) => keys2.has(x)));
    const union = new Set([...keys1, ...keys2]);

    if (union.size === 0) return 0;
    return (intersection.size / union.size) * 100;
}

/**
 * Score anchor quality (0-100)
 */
function scoreAnchor(anchor: string, targetPost: Post): number {
    const anchorLower = anchor.toLowerCase().trim();

    // Check if generic
    if (GENERIC_ANCHORS.some((generic) => anchorLower.includes(generic))) {
        return 20; // Very low score for generic anchors
    }

    // Check alignment with target's focus keyword
    const focusKeyword = targetPost.focus_keyword?.toLowerCase() || "";
    const targetKeyword = targetPost.target_keyword?.toLowerCase() || "";
    const title = targetPost.title.toLowerCase();

    let score = 50; // Base score

    // Boost if anchor contains focus/target keyword
    if (focusKeyword && anchorLower.includes(focusKeyword)) {
        score += 30;
    } else if (targetKeyword && anchorLower.includes(targetKeyword)) {
        score += 25;
    }

    // Boost if anchor contains significant words from title
    const titleTerms = extractKeyTerms(title, 5);
    const anchorTerms = extractKeyTerms(anchor, 5);
    const overlap = calculateOverlap(titleTerms, anchorTerms);
    score += overlap * 0.2; // Up to 20 points

    // Descriptive length bonus (not too short, not too long)
    const wordCount = anchor.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 6) {
        score += 10;
    }

    return Math.min(100, Math.max(0, score));
}

/**
 * Analyze semantic quality of a link edge
 */
export function analyzeEdgeSemantics(
    edge: SiloLinkEdge,
    sourcePost: Post,
    targetPost: Post,
    anchors: Array<{ text: string; count: number; position: "inicio" | "meio" | "fim" }>
): EdgeSemanticAnalysis {
    const anchorScores = anchors.map((anchor) => ({
        ...anchor,
        score: scoreAnchor(anchor.text, targetPost),
    }));

    // Average anchor score
    const totalScore =
        anchorScores.reduce((sum, a) => sum + a.score * a.count, 0) /
        anchorScores.reduce((sum, a) => sum + a.count, 0);

    // Content alignment score
    const sourceTerms = extractKeyTerms(
        [sourcePost.content_html, sourcePost.title, sourcePost.meta_description].filter(Boolean).join(" "),
        15
    );
    const targetTerms = extractKeyTerms(
        [targetPost.content_html, targetPost.title, targetPost.meta_description].filter(Boolean).join(" "),
        15
    );
    const contentOverlap = calculateOverlap(sourceTerms, targetTerms);

    // Combined score
    const finalScore = totalScore * 0.7 + contentOverlap * 0.3;

    // Determine quality
    let quality: LinkSemanticQuality;
    if (finalScore >= 70) {
        quality = "STRONG";
    } else if (finalScore >= 40) {
        quality = "MEDIUM";
    } else {
        quality = "WEAK";
    }

    // Identify issues
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (anchorScores.some((a) => a.score < 30)) {
        issues.push("Âncora genérica detectada");
        suggestions.push(
            `Use uma âncora descritiva contendo "${targetPost.focus_keyword || targetPost.target_keyword || "termo relevante"}"`
        );
    }

    if (contentOverlap < 20) {
        issues.push("Baixo alinhamento semântico entre os posts");
        suggestions.push("Verifique se o link faz sentido contextualmente");
    }

    if (edge.count > 3) {
        issues.push(`Múltiplos links (${edge.count}×) para o mesmo destino`);
        suggestions.push("Considere consolidar em um único link forte");
    }

    return {
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        count: edge.count,
        quality,
        score: Math.round(finalScore),
        anchors: anchors.map((a) => ({ ...a })),
        issues,
        suggestions,
    };
}

/**
 * Batch analyze all edges in a silo
 */
export function analyzeAllEdges(
    edges: SiloLinkEdge[],
    posts: Post[],
    anchorData: Map<string, Array<{ text: string; count: number; position: "inicio" | "meio" | "fim" }>>
): EdgeSemanticAnalysis[] {
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const analyses: EdgeSemanticAnalysis[] = [];

    edges.forEach((edge) => {
        const sourcePost = postMap.get(edge.sourceId);
        const targetPost = postMap.get(edge.targetId);
        const anchors = anchorData.get(`${edge.sourceId}|${edge.targetId}`) || [
            { text: "Link sem âncora registrada", count: edge.count, position: "meio" },
        ];

        if (sourcePost && targetPost) {
            analyses.push(analyzeEdgeSemantics(edge, sourcePost, targetPost, anchors));
        }
    });

    return analyses;
}
